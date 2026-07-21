/**
 * Seed de operaciones demo para el portafolio existente.
 * Crea 6 meses de compras en activos reales y genera snapshots de riesgo históricos.
 * 
 * Uso: node prisma/seedOperations.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Operaciones demo: símbolo, tipo, qty, precio aproximado, días atrás
const DEMO_OPS = [
  { symbol: 'AAPL',  type: 'BUY', qty: 10,  daysAgo: 180, note: 'Compra inicial Apple' },
  { symbol: 'MSFT',  type: 'BUY', qty: 5,   daysAgo: 170, note: 'Compra inicial Microsoft' },
  { symbol: 'SPY',   type: 'BUY', qty: 8,   daysAgo: 160, note: 'ETF S&P 500' },
  { symbol: 'NVDA',  type: 'BUY', qty: 3,   daysAgo: 140, note: 'Compra Nvidia' },
  { symbol: 'BTC',   type: 'BUY', qty: 0.05, daysAgo: 130, note: 'Bitcoin' },
  { symbol: 'ETH',   type: 'BUY', qty: 0.5,  daysAgo: 120, note: 'Ethereum' },
  { symbol: 'AAPL',  type: 'BUY', qty: 5,   daysAgo: 90,  note: 'Compra adicional Apple' },
  { symbol: 'MSFT',  type: 'DIVIDEND', qty: 1, daysAgo: 60, note: 'Dividendo Q1' },
  { symbol: 'QQQ',   type: 'BUY', qty: 4,   daysAgo: 45,  note: 'ETF Nasdaq' },
  { symbol: 'TSLA',  type: 'BUY', qty: 2,   daysAgo: 30,  note: 'Compra Tesla' },
];

async function seedOperations() {
  console.log('🌱 Seeding demo operations...');

  // Obtener el primer portafolio y usuario
  const portfolio = await prisma.portfolio.findFirst({
    orderBy: { createdAt: 'asc' },
  });
  if (!portfolio) { console.error('No portfolios found. Register first.'); return; }

  // Revisar si ya hay operaciones
  const existing = await prisma.operation.count({ where: { portfolioId: portfolio.id } });
  if (existing > 0) {
    console.log(`⚠️  El portafolio "${portfolio.name}" ya tiene ${existing} operaciones. Saltando seed.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`📁 Portafolio: "${portfolio.name}" (${portfolio.id})`);

  // Insertar operaciones
  for (const op of DEMO_OPS) {
    const asset = await prisma.asset.findUnique({ where: { symbol: op.symbol } });
    if (!asset) { console.log(`  ⚠ Asset ${op.symbol} not found, skipping`); continue; }

    // Buscar precio histórico cercano a esa fecha
    const targetDate = new Date(Date.now() - op.daysAgo * 86400000);
    const priceRow = await prisma.priceHistory.findFirst({
      where: { assetId: asset.id, date: { gte: new Date(targetDate.getTime() - 5 * 86400000) } },
      orderBy: { date: 'asc' },
    });
    const price = priceRow?.close ?? 100;

    await prisma.operation.create({
      data: {
        portfolioId: portfolio.id,
        assetId:     asset.id,
        type:        op.type,
        quantity:    op.qty,
        price:       price,
        fees:        price * op.qty * 0.001, // 0.1% comisión
        date:        targetDate,
        notes:       op.note,
      },
    });
    console.log(`  ✓ ${op.type} ${op.qty} ${op.symbol} @ $${price.toFixed(2)}`);
  }

  // Recalcular holdings manualmente
  console.log('\n📊 Recalculando holdings...');
  const ops = await prisma.operation.findMany({
    where:   { portfolioId: portfolio.id },
    include: { asset: true },
    orderBy: { date: 'asc' },
  });

  const holdingMap = {};
  for (const op of ops) {
    if (!holdingMap[op.assetId]) holdingMap[op.assetId] = { qty: 0, totalCost: 0 };
    const h = holdingMap[op.assetId];
    if (op.type === 'BUY' || op.type === 'TRANSFER_IN') {
      h.totalCost += (op.price + op.fees / op.quantity) * op.quantity;
      h.qty       += op.quantity;
    } else if (op.type === 'SELL' || op.type === 'TRANSFER_OUT') {
      const avg = h.qty > 0 ? h.totalCost / h.qty : 0;
      h.totalCost -= avg * op.quantity;
      h.qty       -= op.quantity;
    }
  }

  for (const [assetId, h] of Object.entries(holdingMap)) {
    if (h.qty <= 0) continue;
    const avgCostBasis = h.qty > 0 ? h.totalCost / h.qty : 0;
    await prisma.holding.upsert({
      where:  { portfolioId_assetId: { portfolioId: portfolio.id, assetId } },
      update: { quantity: h.qty, avgCostBasis },
      create: { portfolioId: portfolio.id, assetId, quantity: h.qty, avgCostBasis },
    });
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    console.log(`  ✓ Holding: ${asset?.symbol} qty=${h.qty.toFixed(4)} avgCost=$${avgCostBasis.toFixed(2)}`);
  }

  // Generar snapshots de riesgo históricos (últimos 90 días)
  console.log('\n📈 Generando snapshots de riesgo históricos (90 días)...');
  const holdings = await prisma.holding.findMany({
    where:   { portfolioId: portfolio.id },
    include: { asset: true },
  });

  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    const snapDate = new Date(Date.now() - daysAgo * 86400000);
    snapDate.setHours(18, 0, 0, 0);

    let totalValue = 0;
    for (const h of holdings) {
      const priceRow = await prisma.priceHistory.findFirst({
        where:   { assetId: h.assetId, date: { lte: snapDate } },
        orderBy: { date: 'desc' },
      });
      totalValue += (priceRow?.close ?? 0) * h.quantity;
    }
    if (totalValue === 0) continue;

    // Calcular drawdown simple desde el máximo
    const prevMax = await prisma.riskSnapshot.aggregate({
      where:  { portfolioId: portfolio.id },
      _max:   { totalValue: true },
    });
    const peak    = prevMax._max.totalValue ?? totalValue;
    const drawdown = peak > 0 ? Math.max(0, (peak - totalValue) / peak * 100) : 0;
    const vol      = 10 + Math.random() * 15; // Volatilidad simulada 10–25%
    const sharpe   = 0.5 + Math.random() * 1.5; // Sharpe simulado 0.5–2.0

    await prisma.riskSnapshot.upsert({
      where:  { id: `${portfolio.id}-${daysAgo}` },
      update: { totalValue, drawdown, volatility: vol, sharpeRatio: sharpe, var95: -(vol * 0.16) },
      create: {
        id:          `${portfolio.id}-${daysAgo}`,
        portfolioId: portfolio.id,
        date:        snapDate,
        totalValue,
        drawdown,
        volatility:  vol,
        sharpeRatio: sharpe,
        var95:       -(vol * 0.16),
      },
    });

    if (daysAgo % 10 === 0) console.log(`  ✓ Snapshot día -${daysAgo}: $${totalValue.toFixed(0)}`);
  }

  console.log('\n✅ Demo data seed complete!');
  await prisma.$disconnect();
}

seedOperations().catch(e => { console.error(e); process.exit(1); });
