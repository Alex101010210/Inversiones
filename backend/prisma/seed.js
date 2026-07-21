/**
 * Seed file – populates a default set of assets with 180 days of stub prices
 * Run: npm run db:seed
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { fetchOHLC }    = require('../src/config/marketData');

const prisma = new PrismaClient();

const ASSETS = [
  // Stocks
  { symbol: 'AAPL',  name: 'Apple Inc.',            type: 'STOCK',  exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'MSFT',  name: 'Microsoft Corporation', type: 'STOCK',  exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',          type: 'STOCK',  exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',        type: 'STOCK',  exchange: 'NASDAQ', sector: 'Consumer Discretionary' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',             type: 'STOCK',  exchange: 'NASDAQ', sector: 'Automotive' },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation',     type: 'STOCK',  exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',   type: 'STOCK',  exchange: 'NYSE',   sector: 'Finance' },
  { symbol: 'V',     name: 'Visa Inc.',              type: 'STOCK',  exchange: 'NYSE',   sector: 'Finance' },
  // ETFs
  { symbol: 'SPY',   name: 'SPDR S&P 500 ETF',          type: 'ETF', exchange: 'NYSE' },
  { symbol: 'QQQ',   name: 'Invesco QQQ Trust',          type: 'ETF', exchange: 'NASDAQ' },
  { symbol: 'VTI',   name: 'Vanguard Total Stock Market', type: 'ETF', exchange: 'NYSE' },
  { symbol: 'ARKK',  name: 'ARK Innovation ETF',         type: 'ETF', exchange: 'NYSE' },
  // Crypto
  { symbol: 'BTC',   name: 'Bitcoin',   type: 'CRYPTO', currency: 'USD' },
  { symbol: 'ETH',   name: 'Ethereum',  type: 'CRYPTO', currency: 'USD' },
  { symbol: 'SOL',   name: 'Solana',    type: 'CRYPTO', currency: 'USD' },
  { symbol: 'ADA',   name: 'Cardano',   type: 'CRYPTO', currency: 'USD' },
];

async function seed() {
  console.log('🌱 Seeding assets and price history…');

  for (const a of ASSETS) {
    const asset = await prisma.asset.upsert({
      where:  { symbol: a.symbol },
      update: { name: a.name },
      create: { symbol: a.symbol, name: a.name, type: a.type, exchange: a.exchange ?? null, sector: a.sector ?? null, currency: a.currency ?? 'USD' },
    });

    const ohlc = await fetchOHLC(a.symbol, 180);
    for (const row of ohlc) {
      await prisma.priceHistory.upsert({
        where:  { assetId_date: { assetId: asset.id, date: row.date } },
        update: { open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume },
        create: { assetId: asset.id, date: row.date, open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume },
      });
    }
    console.log(`  ✓ ${a.symbol}`);
  }

  console.log('✅ Seed complete!');
  await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
