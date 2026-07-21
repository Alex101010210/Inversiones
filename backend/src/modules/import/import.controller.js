const prisma = require('../../config/prisma');
const { parse } = require('csv-parse/sync');

/**
 * POST /api/import/operations
 * Body: multipart/form-data  { file: CSV, portfolioId: string }
 *
 * CSV columns (flexible header mapping):
 *   symbol, type, quantity, price, fees, date, notes
 *
 * Returns: { imported: number, skipped: number, errors: string[] }
 */
const importOperations = async (req, res, next) => {
  try {
    const { portfolioId } = req.body;
    if (!portfolioId) return res.status(400).json({ error: 'portfolioId es requerido' });

    // Verify ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId: req.user.id },
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio no encontrado' });

    if (!req.file) return res.status(400).json({ error: 'No se envió ningún archivo CSV' });

    const raw = req.file.buffer.toString('utf-8');

    let rows;
    try {
      rows = parse(raw, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch (e) {
      return res.status(400).json({ error: `CSV inválido: ${e.message}` });
    }

    // Flexible column name normalization
    const normalize = (key) =>
      key.toLowerCase().replace(/[^a-z]/g, '');

    const VALID_TYPES = ['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT'];

    let imported = 0;
    let skipped  = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const line = i + 2; // 1-indexed + header row

      // Normalize keys
      const normalized = {};
      for (const [k, v] of Object.entries(row)) {
        normalized[normalize(k)] = v;
      }

      const symbol   = (normalized['symbol'] || normalized['ticker'] || '').toUpperCase();
      const typeRaw  = (normalized['type'] || normalized['operacion'] || normalized['operation'] || '').toUpperCase();
      const qty      = parseFloat(normalized['quantity'] || normalized['cantidad'] || normalized['qty'] || '0');
      const price    = parseFloat(normalized['price'] || normalized['precio'] || '0');
      const fees     = parseFloat(normalized['fees'] || normalized['comision'] || normalized['fee'] || '0') || 0;
      const dateRaw  = normalized['date'] || normalized['fecha'] || '';
      const notes    = normalized['notes'] || normalized['notas'] || normalized['note'] || '';

      // Validations
      if (!symbol) { errors.push(`Fila ${line}: símbolo vacío`); skipped++; continue; }
      if (!VALID_TYPES.includes(typeRaw)) {
        errors.push(`Fila ${line}: tipo "${typeRaw}" inválido. Válidos: ${VALID_TYPES.join(', ')}`);
        skipped++;
        continue;
      }
      if (isNaN(qty) || qty <= 0) { errors.push(`Fila ${line}: cantidad inválida "${normalized['quantity'] || normalized['cantidad']}"`); skipped++; continue; }
      if (isNaN(price) || price < 0) { errors.push(`Fila ${line}: precio inválido`); skipped++; continue; }

      let date;
      try {
        date = dateRaw ? new Date(dateRaw) : new Date();
        if (isNaN(date.getTime())) throw new Error('fecha inválida');
      } catch {
        errors.push(`Fila ${line}: fecha "${dateRaw}" inválida`);
        skipped++;
        continue;
      }

      // Look up or create asset
      let asset = await prisma.asset.findUnique({ where: { symbol } });
      if (!asset) {
        // Auto-create minimal asset record
        asset = await prisma.asset.create({
          data: {
            symbol,
            name: symbol,
            type: 'STOCK',
            currency: 'USD',
          },
        });
      }

      await prisma.operation.create({
        data: {
          portfolioId,
          assetId: asset.id,
          type:    typeRaw,
          quantity: qty,
          price,
          fees,
          date,
          notes: notes || null,
        },
      });

      imported++;
    }

    // Recalculate all holdings for affected assets
    const affectedAssets = await prisma.operation.findMany({
      where: { portfolioId },
      select: { assetId: true },
      distinct: ['assetId'],
    });

    for (const { assetId } of affectedAssets) {
      await recalcHolding(portfolioId, assetId);
    }

    res.json({ imported, skipped, errors: errors.slice(0, 20) });
  } catch (err) { next(err); }
};

// Reuse same recalc logic from operations controller
async function recalcHolding(portfolioId, assetId) {
  const ops = await prisma.operation.findMany({
    where: { portfolioId, assetId },
    orderBy: { date: 'asc' },
  });

  let quantity  = 0;
  let totalCost = 0;

  for (const op of ops) {
    if (op.type === 'BUY' || op.type === 'TRANSFER_IN') {
      totalCost += (op.price + op.fees / op.quantity) * op.quantity;
      quantity  += op.quantity;
    } else if (op.type === 'SELL' || op.type === 'TRANSFER_OUT') {
      const avgCost = quantity > 0 ? totalCost / quantity : 0;
      totalCost -= avgCost * op.quantity;
      quantity  -= op.quantity;
    }
  }

  const avgCostBasis = quantity > 0 ? totalCost / quantity : 0;

  if (quantity <= 0) {
    await prisma.holding.deleteMany({ where: { portfolioId, assetId } });
  } else {
    await prisma.holding.upsert({
      where:  { portfolioId_assetId: { portfolioId, assetId } },
      update: { quantity, avgCostBasis },
      create: { portfolioId, assetId, quantity, avgCostBasis },
    });
  }
}

module.exports = { importOperations };
