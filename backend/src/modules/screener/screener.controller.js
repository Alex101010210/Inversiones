const prisma = require('../../config/prisma');
const { fetchOHLC, getLatestPrice, searchYahoo } = require('../../config/marketData');

// ── Popular assets catalog for live screener ──────────────────────────────────
const MARKET_CATALOG = [
  // US Large-cap Stocks
  { symbol: 'AAPL',  name: 'Apple Inc.',                type: 'STOCK',     sector: 'Technology' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',           type: 'STOCK',     sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',             type: 'STOCK',     sector: 'Technology' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',           type: 'STOCK',     sector: 'Consumer Discretionary' },
  { symbol: 'META',  name: 'Meta Platforms Inc.',       type: 'STOCK',     sector: 'Technology' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',                type: 'STOCK',     sector: 'Consumer Discretionary' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',              type: 'STOCK',     sector: 'Technology' },
  { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',      type: 'STOCK',     sector: 'Finance' },
  { symbol: 'V',     name: 'Visa Inc.',                 type: 'STOCK',     sector: 'Finance' },
  { symbol: 'MA',    name: 'Mastercard Inc.',           type: 'STOCK',     sector: 'Finance' },
  { symbol: 'BAC',   name: 'Bank of America Corp.',     type: 'STOCK',     sector: 'Finance' },
  { symbol: 'WMT',   name: 'Walmart Inc.',              type: 'STOCK',     sector: 'Consumer Staples' },
  { symbol: 'UNH',   name: 'UnitedHealth Group Inc.',   type: 'STOCK',     sector: 'Healthcare' },
  { symbol: 'JNJ',   name: 'Johnson & Johnson',         type: 'STOCK',     sector: 'Healthcare' },
  { symbol: 'PG',    name: 'Procter & Gamble Co.',      type: 'STOCK',     sector: 'Consumer Staples' },
  { symbol: 'XOM',   name: 'Exxon Mobil Corp.',         type: 'STOCK',     sector: 'Energy' },
  { symbol: 'CVX',   name: 'Chevron Corp.',             type: 'STOCK',     sector: 'Energy' },
  { symbol: 'NFLX',  name: 'Netflix Inc.',              type: 'STOCK',     sector: 'Communication Services' },
  { symbol: 'DIS',   name: 'Walt Disney Co.',           type: 'STOCK',     sector: 'Communication Services' },
  { symbol: 'PYPL',  name: 'PayPal Holdings Inc.',      type: 'STOCK',     sector: 'Finance' },
  // ETFs
  { symbol: 'SPY',   name: 'SPDR S&P 500 ETF',          type: 'ETF',       sector: 'Broad Market' },
  { symbol: 'QQQ',   name: 'Invesco QQQ Trust',         type: 'ETF',       sector: 'Technology' },
  { symbol: 'VTI',   name: 'Vanguard Total Stock Market ETF', type: 'ETF', sector: 'Broad Market' },
  { symbol: 'IWM',   name: 'iShares Russell 2000 ETF',  type: 'ETF',       sector: 'Broad Market' },
  { symbol: 'GLD',   name: 'SPDR Gold Shares',          type: 'ETF',       sector: 'Commodity' },
  { symbol: 'TLT',   name: 'iShares 20+ Year Treasury Bond ETF', type: 'ETF', sector: 'Fixed Income' },
  { symbol: 'VNQ',   name: 'Vanguard Real Estate ETF',  type: 'ETF',       sector: 'Real Estate' },
  { symbol: 'EEM',   name: 'iShares MSCI Emerging Markets ETF', type: 'ETF', sector: 'Emerging Markets' },
  { symbol: 'ARKK',  name: 'ARK Innovation ETF',        type: 'ETF',       sector: 'Technology' },
  // Crypto
  { symbol: 'BTC',   name: 'Bitcoin',                   type: 'CRYPTO',    sector: 'Crypto' },
  { symbol: 'ETH',   name: 'Ethereum',                  type: 'CRYPTO',    sector: 'Crypto' },
  { symbol: 'SOL',   name: 'Solana',                    type: 'CRYPTO',    sector: 'Crypto' },
  { symbol: 'XRP',   name: 'XRP',                       type: 'CRYPTO',    sector: 'Crypto' },
  { symbol: 'BNB',   name: 'BNB',                       type: 'CRYPTO',    sector: 'Crypto' },
  { symbol: 'ADA',   name: 'Cardano',                   type: 'CRYPTO',    sector: 'Crypto' },
  { symbol: 'DOGE',  name: 'Dogecoin',                  type: 'CRYPTO',    sector: 'Crypto' },
  { symbol: 'AVAX',  name: 'Avalanche',                 type: 'CRYPTO',    sector: 'Crypto' },
  { symbol: 'LINK',  name: 'Chainlink',                 type: 'CRYPTO',    sector: 'Crypto' },
  { symbol: 'DOT',   name: 'Polkadot',                  type: 'CRYPTO',    sector: 'Crypto' },
];

// ── Indicator helpers ─────────────────────────────────────────────────────────

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains  += change;
    else             losses -= change;
  }
  let avgGain = gains  / period;
  let avgLoss = losses / period;
  let rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const g = change >= 0 ? change : 0;
    const l = change <  0 ? -change : 0;
    avgGain  = (avgGain  * (period - 1) + g) / period;
    avgLoss  = (avgLoss  * (period - 1) + l) / period;
    rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

function calcSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

function calcEMA(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes[0];
  for (let i = 1; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return ema;
}

function signalFromIndicators(rsi, macdHist) {
  if (rsi === null) return 'N/A';
  if (rsi < 30 && (macdHist === null || macdHist > 0)) return 'BUY';
  if (rsi > 70 && (macdHist === null || macdHist < 0)) return 'SELL';
  return 'HOLD';
}

function computeIndicators(rows) {
  if (rows.length < 15) return null;
  const closes       = rows.map(r => r.close);
  const latestPrice  = closes[closes.length - 1];
  const rsi          = calcRSI(closes, 14);
  const sma20        = calcSMA(closes, 20);
  const sma50        = calcSMA(closes, 50);
  const ema12        = calcEMA(closes, 12);
  const ema26        = calcEMA(closes, 26);
  const macdVal      = ema12 !== null && ema26 !== null ? ema12 - ema26 : null;
  const sig          = signalFromIndicators(rsi, macdVal);
  const price7dAgo   = rows.length >= 7  ? rows[rows.length - 7].close  : null;
  const price30dAgo  = rows.length >= 30 ? rows[rows.length - 30].close : null;
  return {
    price:          +latestPrice.toFixed(4),
    rsi:            rsi   !== null ? +rsi.toFixed(2)   : null,
    sma20:          sma20 !== null ? +sma20.toFixed(4) : null,
    sma50:          sma50 !== null ? +sma50.toFixed(4) : null,
    macd:           macdVal !== null ? +macdVal.toFixed(4) : null,
    signal:         sig,
    change7d:       price7dAgo  ? +((latestPrice - price7dAgo)  / price7dAgo  * 100).toFixed(2) : null,
    change30d:      price30dAgo ? +((latestPrice - price30dAgo) / price30dAgo * 100).toFixed(2) : null,
    priceAboveSMA20: sma20 !== null ? latestPrice > sma20 : null,
    priceAboveSMA50: sma50 !== null ? latestPrice > sma50 : null,
  };
}

// ── GET /api/screener — DB-based (legacy, kept for portfolio-specific use) ────
const screenAssets = async (req, res, next) => {
  try {
    const { type, sector, rsiMin, rsiMax, signal: sigFilter, priceMin, priceMax } = req.query;

    const where = {};
    if (type)   where.type   = type.toUpperCase();
    if (sector) where.sector = { contains: sector, mode: 'insensitive' };

    const assets = await prisma.asset.findMany({ where, orderBy: { symbol: 'asc' } });
    const since  = new Date(Date.now() - 60 * 86400000);

    const results = [];

    for (const asset of assets) {
      const rows = await prisma.priceHistory.findMany({
        where:   { assetId: asset.id, date: { gte: since } },
        orderBy: { date: 'asc' },
        select:  { close: true, date: true },
      });

      if (rows.length < 15) continue;

      const closes      = rows.map(r => r.close);
      const latestPrice = closes[closes.length - 1];

      if (priceMin && latestPrice < +priceMin) continue;
      if (priceMax && latestPrice > +priceMax) continue;

      const rsi    = calcRSI(closes, 14);
      const sma20  = calcSMA(closes, 20);
      const sma50  = calcSMA(closes, 50);
      const ema12  = calcEMA(closes, 12);
      const ema26  = calcEMA(closes, 26);
      const macdVal = ema12 !== null && ema26 !== null ? ema12 - ema26 : null;
      const sig    = signalFromIndicators(rsi, macdVal);

      if (rsiMin && (rsi === null || rsi < +rsiMin)) continue;
      if (rsiMax && (rsi === null || rsi > +rsiMax)) continue;
      if (sigFilter && sig !== sigFilter.toUpperCase()) continue;

      const price7dAgo  = rows.length >= 7  ? rows[rows.length - 7].close  : null;
      const price30dAgo = rows.length >= 30 ? rows[rows.length - 30].close : null;

      results.push({
        id:              asset.id,
        symbol:          asset.symbol,
        name:            asset.name,
        type:            asset.type,
        sector:          asset.sector,
        exchange:        asset.exchange,
        currency:        asset.currency,
        price:           +latestPrice.toFixed(4),
        priceDate:       rows[rows.length - 1].date,
        rsi:             rsi   !== null ? +rsi.toFixed(2)    : null,
        sma20:           sma20 !== null ? +sma20.toFixed(4)  : null,
        sma50:           sma50 !== null ? +sma50.toFixed(4)  : null,
        macd:            macdVal !== null ? +macdVal.toFixed(4) : null,
        signal:          sig,
        change7d:        price7dAgo  ? +((latestPrice - price7dAgo)  / price7dAgo  * 100).toFixed(2) : null,
        change30d:       price30dAgo ? +((latestPrice - price30dAgo) / price30dAgo * 100).toFixed(2) : null,
        priceAboveSMA20: sma20 !== null ? latestPrice > sma20 : null,
        priceAboveSMA50: sma50 !== null ? latestPrice > sma50 : null,
      });
    }

    res.json({ count: results.length, assets: results });
  } catch (err) { next(err); }
};

/**
 * GET /api/screener/market
 * Returns live screener data for ~40 popular assets fetched directly from
 * Yahoo Finance (no DB price history required). Supports the same filter params.
 * Results are cached in memory for 10 minutes per symbol.
 */
const marketCache = {};
const MARKET_CACHE_TTL = 10 * 60_000;

const screenMarket = async (req, res, next) => {
  try {
    const { type, sector, rsiMin, rsiMax, signal: sigFilter, priceMin, priceMax, q } = req.query;

    // Determine which symbols to screen
    let catalog = MARKET_CATALOG;
    if (q) {
      const lower = q.toLowerCase();
      catalog = catalog.filter(a =>
        a.symbol.toLowerCase().includes(lower) || a.name.toLowerCase().includes(lower)
      );
    }
    if (type)   catalog = catalog.filter(a => a.type === type.toUpperCase());
    if (sector) catalog = catalog.filter(a => a.sector?.toLowerCase().includes(sector.toLowerCase()));

    const results = [];

    await Promise.allSettled(catalog.map(async (meta) => {
      try {
        // Check cache
        const cached = marketCache[meta.symbol];
        let indicators;
        if (cached && Date.now() - cached.ts < MARKET_CACHE_TTL) {
          indicators = cached.data;
        } else {
          const rows = await fetchOHLC(meta.symbol, 60);
          if (rows.length < 15) return;
          indicators = computeIndicators(rows);
          if (!indicators) return;
          marketCache[meta.symbol] = { data: indicators, ts: Date.now() };
        }

        // Price filter
        if (priceMin && indicators.price < +priceMin) return;
        if (priceMax && indicators.price > +priceMax) return;

        // RSI filter
        if (rsiMin && (indicators.rsi === null || indicators.rsi < +rsiMin)) return;
        if (rsiMax && (indicators.rsi === null || indicators.rsi > +rsiMax)) return;

        // Signal filter
        if (sigFilter && indicators.signal !== sigFilter.toUpperCase()) return;

        results.push({
          id:       meta.symbol,   // use symbol as id for frontend key
          symbol:   meta.symbol,
          name:     meta.name,
          type:     meta.type,
          sector:   meta.sector,
          exchange: null,
          currency: 'USD',
          priceDate: new Date(),
          ...indicators,
        });
      } catch (err) {
        // skip failed symbol silently
      }
    }));

    // Sort results
    const { sortBy = 'symbol', sortDir = 'asc' } = req.query;
    const allowedSorts = ['symbol', 'price', 'rsi', 'macd', 'change7d', 'change30d', 'sma20'];
    const field = allowedSorts.includes(sortBy) ? sortBy : 'symbol';
    const dir   = sortDir === 'desc' ? -1 : 1;
    results.sort((a, b) => {
      const va = a[field] ?? (typeof a[field] === 'string' ? '' : -Infinity);
      const vb = b[field] ?? (typeof b[field] === 'string' ? '' : -Infinity);
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });

    res.json({ count: results.length, assets: results });
  } catch (err) { next(err); }
};

/**
 * GET /api/screener/filters
 */
const getFilters = async (req, res, next) => {
  try {
    const [sectors, types] = await Promise.all([
      prisma.asset.findMany({ select: { sector: true }, distinct: ['sector'], where: { sector: { not: null } } }),
      prisma.asset.findMany({ select: { type: true },   distinct: ['type']   }),
    ]);

    // Merge with catalog sectors/types
    const catalogSectors = [...new Set(MARKET_CATALOG.map(a => a.sector))];
    const catalogTypes   = [...new Set(MARKET_CATALOG.map(a => a.type))];

    const allSectors = [...new Set([...sectors.map(s => s.sector).filter(Boolean), ...catalogSectors])].sort();
    const allTypes   = [...new Set([...types.map(t => t.type), ...catalogTypes])];

    res.json({ sectors: allSectors, types: allTypes });
  } catch (err) { next(err); }
};

module.exports = { screenAssets, screenMarket, getFilters };
