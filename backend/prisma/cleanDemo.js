/**
 * Script para limpiar TODOS los datos de demo/seed de la base de datos.
 * Borra: operaciones, holdings, snapshots de riesgo, historial de precios,
 *        alertas, watchlist, AI insights, activos.
 * NO borra usuarios ni portafolios (sólo los vacía).
 *
 * Uso: node prisma/cleanDemo.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  console.log('🧹 Limpiando datos de demo...\n');

  const ops = await prisma.operation.deleteMany({});
  console.log(`  ✓ Operaciones eliminadas:       ${ops.count}`);

  const holdings = await prisma.holding.deleteMany({});
  console.log(`  ✓ Holdings eliminados:           ${holdings.count}`);

  const snapshots = await prisma.riskSnapshot.deleteMany({});
  console.log(`  ✓ Snapshots de riesgo borrados:  ${snapshots.count}`);

  const prices = await prisma.priceHistory.deleteMany({});
  console.log(`  ✓ Historial de precios borrado:  ${prices.count}`);

  const alerts = await prisma.priceAlert.deleteMany({});
  console.log(`  ✓ Alertas eliminadas:            ${alerts.count}`);

  const watchlist = await prisma.watchlistItem.deleteMany({});
  console.log(`  ✓ Watchlist borrada:             ${watchlist.count}`);

  const insights = await prisma.aiInsight.deleteMany({});
  console.log(`  ✓ AI Insights borrados:          ${insights.count}`);

  const assets = await prisma.asset.deleteMany({});
  console.log(`  ✓ Activos eliminados:            ${assets.count}`);

  console.log('\n✅ Limpieza completa. La base de datos está limpia.');
  console.log('   Los usuarios y portafolios se conservan (vacíos).');
  await prisma.$disconnect();
}

clean().catch(e => { console.error(e); process.exit(1); });
