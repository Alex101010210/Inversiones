const cron = require('node-cron');
const prisma = require('./prisma');
const { fetchOHLC } = require('./marketData');
const { checkAlerts } = require('../modules/alerts/alerts.controller');

async function syncPricesForAllAssets() {
  console.log('[Scheduler] Starting price sync…');
  const assets = await prisma.asset.findMany();

  for (const asset of assets) {
    try {
      const ohlc = await fetchOHLC(asset.symbol, 1);
      for (const row of ohlc) {
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

function schedulePriceFetch() {
  // Every day at 18:00 UTC (after US market close)
  cron.schedule('0 18 * * 1-5', async () => {
    await syncPricesForAllAssets();
    await checkAlerts(null, null, null); // Check alerts after price sync
  });
  // Also check alerts every 15 minutes during market hours
  cron.schedule('*/15 14-21 * * 1-5', () => checkAlerts(null, null, null));
  console.log('[Scheduler] Price-sync + alerts cron registered');
}

module.exports = { schedulePriceFetch, syncPricesForAllAssets };
