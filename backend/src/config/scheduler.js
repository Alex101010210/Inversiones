// ─────────────────────────────────────────────────────────────────────────────
// Scheduler de tareas programadas (cron jobs).
//
// Dos tareas principales:
//   1. Sincronización diaria de precios: todos los días de lunes a viernes a
//      las 18:00 UTC (después del cierre del mercado americano) descarga el
//      precio más reciente de todos los activos en la base de datos.
//
//   2. Verificación de alertas: cada 15 minutos en horario de mercado
//      (14:00–21:00 UTC, lunes a viernes) revisa si alguna alerta de precio
//      se activó y la marca como disparada.
// ─────────────────────────────────────────────────────────────────────────────

const cron = require('node-cron');
const prisma = require('./prisma');
const { fetchOHLC } = require('./marketData');
const { checkAlerts } = require('../modules/alerts/alerts.controller');

// Sincroniza el precio más reciente de cada activo en la base de datos
async function syncPricesForAllAssets() {
  console.log('[Scheduler] Starting price sync…');
  const assets = await prisma.asset.findMany();

  for (const asset of assets) {
    try {
      // fetchOHLC(symbol, 1) obtiene solo la vela del último día
      const ohlc = await fetchOHLC(asset.symbol, 1);
      for (const row of ohlc) {
        // upsert: actualiza si ya existe el registro del día, lo crea si no
        await prisma.priceHistory.upsert({
          where: { assetId_date: { assetId: asset.id, date: row.date } },
          update: { open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume },
          create: { assetId: asset.id, date: row.date, open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume },
        });
      }
    } catch (err) {
      console.error(`[Scheduler] Failed to sync ${asset.symbol}:`, err.message);
    }
  }
  console.log('[Scheduler] Price sync complete.');
}

// Registra los dos cron jobs al iniciar el servidor
function schedulePriceFetch() {
  // Lunes a viernes a las 18:00 UTC — sincronización de cierre de mercado
  cron.schedule('0 18 * * 1-5', async () => {
    await syncPricesForAllAssets();
    await checkAlerts(null, null, null); // verificar alertas después de actualizar precios
  });

  // Cada 15 minutos entre 14:00 y 21:00 UTC en días hábiles — alertas en tiempo real
  cron.schedule('*/15 14-21 * * 1-5', () => checkAlerts(null, null, null));

  console.log('[Scheduler] Price-sync + alerts cron registered');
}

module.exports = { schedulePriceFetch, syncPricesForAllAssets };
