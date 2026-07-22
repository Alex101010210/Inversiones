// ─────────────────────────────────────────────────────────────────────────────
// Controlador de operaciones (BUY, SELL, DIVIDEND, SPLIT, TRANSFER_IN/OUT).
//
// Tras cada creación, edición o eliminación de una operación se recalcula
// automáticamente el holding correspondiente usando la función recalcHolding.
// Esto garantiza que la cantidad y el costo promedio del holding siempre
// reflejen el historial completo de operaciones.
// ─────────────────────────────────────────────────────────────────────────────

const prisma = require('../../config/prisma');

// ─── Recalcula el holding después de cualquier cambio en operaciones ──────────
// Recorre todas las operaciones del par (portafolio, activo) en orden cronológico
// y recalcula la cantidad total y el costo promedio ponderado.
async function recalcHolding(portfolioId, assetId) {
  const ops = await prisma.operation.findMany({
    where: { portfolioId, assetId },
    orderBy: { date: 'asc' },
  });

  let quantity = 0;
  let totalCost = 0;

  for (const op of ops) {
    if (op.type === 'BUY' || op.type === 'TRANSFER_IN') {
      // Costo unitario = precio + comisión prorrateada por unidad
      totalCost += (op.price + op.fees / op.quantity) * op.quantity;
      quantity  += op.quantity;
    } else if (op.type === 'SELL' || op.type === 'TRANSFER_OUT') {
      // Al vender se reduce la posición al costo promedio actual
      const avgCost = quantity > 0 ? totalCost / quantity : 0;
      totalCost -= avgCost * op.quantity;
      quantity  -= op.quantity;
    }
    // DIVIDEND y SPLIT no afectan la base de costo en este modelo simplificado
  }

  const avgCostBasis = quantity > 0 ? totalCost / quantity : 0;

  if (quantity <= 0) {
    // Si la posición llega a cero o negativa, eliminar el holding
    await prisma.holding.deleteMany({ where: { portfolioId, assetId } });
  } else {
    await prisma.holding.upsert({
      where: { portfolioId_assetId: { portfolioId, assetId } },
      update: { quantity, avgCostBasis },
      create: { portfolioId, assetId, quantity, avgCostBasis },
    });
  }
}

// ─── Listar operaciones ───────────────────────────────────────────────────────
// Soporta filtros por portafolio, activo, tipo, símbolo y rango de fechas.
// Incluye paginación servidor con page + limit y ordenamiento configurable.
const listOperations = async (req, res, next) => {
  try {
    const {
      portfolioId, assetId, type,
      symbol,                        // filtro por símbolo del activo (coincidencia parcial)
      dateFrom, dateTo,
      page = 1, limit = 50,          // paginación: página actual y tamaño de página
      sortBy = 'date', sortDir = 'desc',
    } = req.query;

    // Solo devolver operaciones del usuario autenticado
    const where = { portfolio: { userId: req.user.id } };
    if (portfolioId) where.portfolioId = portfolioId;
    if (assetId)     where.assetId     = assetId;
    if (type)        where.type        = type;
    if (symbol)      where.asset       = { symbol: { contains: symbol.toUpperCase() } };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo)   where.date.lte = new Date(dateTo);
    }

    // Protección contra campos de ordenamiento arbitrarios (SQL injection prevention)
    const allowedSort = ['date', 'quantity', 'price'];
    const orderField  = allowedSort.includes(sortBy) ? sortBy : 'date';
    const orderDir    = sortDir === 'asc' ? 'asc' : 'desc';

    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const pageSize = Math.min(200, parseInt(limit) || 50); // máximo 200 por página
    const skip     = (pageNum - 1) * pageSize;

    // Ejecutar count y query en paralelo para mejor rendimiento
    const [total, ops] = await Promise.all([
      prisma.operation.count({ where }),
      prisma.operation.findMany({
        where,
        include: { asset: true, portfolio: { select: { name: true } } },
        orderBy: { [orderField]: orderDir },
        skip,
        take: pageSize,
      }),
    ]);

    res.json({ total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize), ops });
  } catch (err) { next(err); }
};

// ─── Crear operación ──────────────────────────────────────────────────────────
// Valida que una SELL/TRANSFER_OUT no supere la cantidad disponible en el holding
// antes de persistir la operación. Después recalcula el holding afectado.
const createOperation = async (req, res, next) => {
  try {
    const { portfolioId, assetId, type, quantity, price, fees, date, notes } = req.body;

    // Verificar que el portafolio pertenece al usuario autenticado
    const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId: req.user.id } });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    // Prevenir ventas que superen el holding actual
    if (type === 'SELL' || type === 'TRANSFER_OUT') {
      const holding = await prisma.holding.findUnique({
        where: { portfolioId_assetId: { portfolioId, assetId } },
      });
      const currentQty = holding?.quantity ?? 0;
      if (+quantity > currentQty) {
        return res.status(400).json({
          error: `No puedes vender ${quantity} unidades — solo tienes ${currentQty.toFixed(6)} en este portafolio.`,
        });
      }
    }

    const op = await prisma.operation.create({
      data: { portfolioId, assetId, type, quantity, price, fees: fees || 0, date: new Date(date), notes },
      include: { asset: true },
    });

    // Recalcular holding afectado
    await recalcHolding(portfolioId, assetId);

    res.status(201).json(op);
  } catch (err) { next(err); }
};

// ─── Obtener una operación por ID ─────────────────────────────────────────────
const getOperation = async (req, res, next) => {
  try {
    const op = await prisma.operation.findFirst({
      where: { id: req.params.id, portfolio: { userId: req.user.id } },
      include: { asset: true, portfolio: true },
    });
    if (!op) return res.status(404).json({ error: 'Operation not found' });
    res.json(op);
  } catch (err) { next(err); }
};

// ─── Editar operación ─────────────────────────────────────────────────────────
// Actualiza los campos editables y recalcula el holding del activo afectado
const updateOperation = async (req, res, next) => {
  try {
    const { type, quantity, price, fees, date, notes } = req.body;
    const existing = await prisma.operation.findFirst({
      where: { id: req.params.id, portfolio: { userId: req.user.id } },
    });
    if (!existing) return res.status(404).json({ error: 'Operation not found' });

    const op = await prisma.operation.update({
      where: { id: req.params.id },
      data: { type, quantity, price, fees, date: new Date(date), notes },
      include: { asset: true },
    });

    await recalcHolding(existing.portfolioId, existing.assetId);

    res.json(op);
  } catch (err) { next(err); }
};

// ─── Eliminar operación ───────────────────────────────────────────────────────
// Borra la operación y recalcula el holding para que el saldo sea correcto
const deleteOperation = async (req, res, next) => {
  try {
    const existing = await prisma.operation.findFirst({
      where: { id: req.params.id, portfolio: { userId: req.user.id } },
    });
    if (!existing) return res.status(404).json({ error: 'Operation not found' });

    await prisma.operation.delete({ where: { id: req.params.id } });
    await recalcHolding(existing.portfolioId, existing.assetId);

    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { listOperations, createOperation, getOperation, updateOperation, deleteOperation };
