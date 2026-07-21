/**
 * CSV Export module
 * GET /api/export/operations  → CSV de todas las operaciones
 * GET /api/export/holdings    → CSV del estado actual del portafolio
 * GET /api/export/portfolio/:id/operations → CSV filtrado por portafolio
 */

const prisma = require('../../config/prisma');
const { getLatestPrice } = require('../../config/marketData');

function toCSV(rows, headers) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const header = headers.map(h => h.label).join(',');
  const body   = rows.map(r => headers.map(h => escape(r[h.key])).join(',')).join('\n');
  return `${header}\n${body}`;
}

const exportOperations = async (req, res, next) => {
  try {
    const { portfolioId } = req.query;
    const where = { portfolio: { userId: req.user.id } };
    if (portfolioId) where.portfolioId = portfolioId;

    const ops = await prisma.operation.findMany({
      where,
      include: { asset: true, portfolio: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });

    const headers = [
      { key: 'date',      label: 'Fecha' },
      { key: 'portfolio', label: 'Portafolio' },
      { key: 'symbol',    label: 'Símbolo' },
      { key: 'name',      label: 'Nombre del activo' },
      { key: 'type',      label: 'Tipo de activo' },
      { key: 'operation', label: 'Operación' },
      { key: 'quantity',  label: 'Cantidad' },
      { key: 'price',     label: 'Precio unitario (USD)' },
      { key: 'fees',      label: 'Comisiones (USD)' },
      { key: 'total',     label: 'Total (USD)' },
      { key: 'notes',     label: 'Notas' },
    ];

    const rows = ops.map(op => ({
      date:       new Date(op.date).toISOString().split('T')[0],
      portfolio:  op.portfolio?.name ?? '',
      symbol:     op.asset?.symbol ?? '',
      name:       op.asset?.name ?? '',
      type:       op.asset?.type ?? '',
      operation:  op.type,
      quantity:   op.quantity,
      price:      op.price.toFixed(4),
      fees:       op.fees.toFixed(2),
      total:      (op.quantity * op.price + op.fees).toFixed(2),
      notes:      op.notes ?? '',
    }));

    const csv = toCSV(rows, headers);
    const filename = `operaciones_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM para que Excel abra bien con tildes
  } catch (err) { next(err); }
};

const exportHoldings = async (req, res, next) => {
  try {
    const { portfolioId } = req.query;

    const portfolios = await prisma.portfolio.findMany({
      where: portfolioId
        ? { id: portfolioId, userId: req.user.id }
        : { userId: req.user.id },
      include: { holdings: { include: { asset: true } } },
    });

    const headers = [
      { key: 'portfolio',    label: 'Portafolio' },
      { key: 'symbol',       label: 'Símbolo' },
      { key: 'name',         label: 'Nombre' },
      { key: 'type',         label: 'Tipo' },
      { key: 'quantity',     label: 'Cantidad' },
      { key: 'avgCost',      label: 'Costo Promedio (USD)' },
      { key: 'currentPrice', label: 'Precio Actual (USD)' },
      { key: 'costBasis',    label: 'Base de Costo (USD)' },
      { key: 'currentValue', label: 'Valor Actual (USD)' },
      { key: 'pnl',          label: 'P&L (USD)' },
      { key: 'pnlPct',       label: 'P&L (%)' },
    ];

    const rows = [];
    for (const p of portfolios) {
      for (const h of p.holdings) {
        const currentPrice = await getLatestPrice(h.asset.symbol, h.asset.type);
        const costBasis    = h.avgCostBasis * h.quantity;
        const currentValue = currentPrice * h.quantity;
        const pnl          = currentValue - costBasis;
        const pnlPct       = costBasis > 0 ? (pnl / costBasis * 100) : 0;
        rows.push({
          portfolio:    p.name,
          symbol:       h.asset.symbol,
          name:         h.asset.name,
          type:         h.asset.type,
          quantity:     h.quantity,
          avgCost:      h.avgCostBasis.toFixed(4),
          currentPrice: currentPrice.toFixed(4),
          costBasis:    costBasis.toFixed(2),
          currentValue: currentValue.toFixed(2),
          pnl:          pnl.toFixed(2),
          pnlPct:       pnlPct.toFixed(2),
        });
      }
    }

    const csv = toCSV(rows, headers);
    const filename = `holdings_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (err) { next(err); }
};

module.exports = { exportOperations, exportHoldings };
