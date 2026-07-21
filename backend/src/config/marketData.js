/**
 * Market Data adapter — Yahoo Finance (no API key required)
 *
 * Uses Yahoo Finance v8 chart API for real prices.
 * Falls back to CoinGecko for crypto if Yahoo returns nothing.
 * In‑memory cache with configurable TTL to avoid rate-limit issues.
 */

const axios = require('axios');

const CG_URL = process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';

// ── In-memory cache ──────────────────────────────────────────────────────────
const cache = {};
function cached(key, fn, ttl = 300_000) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < ttl) return Promise.resolve(entry.value);
  return fn().then((val) => {
    cache[key] = { value: val, ts: Date.now() };
    return val;
  });
}

// ── Common Yahoo Finance headers ─────────────────────────────────────────────
const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; investment-erp/1.0)',
  Accept: 'application/json',
};

// ── Yahoo Finance: single latest price ──────────────────────────────────────
async function getYahooPrice(symbol) {
  const ticker = normalizeYahooTicker(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
  const res = await axios.get(url, {
    headers: YF_HEADERS,
    params: { interval: '1d', range: '1d' },
    timeout: 8000,
  });
  const meta = res.data?.chart?.result?.[0]?.meta;
  return meta?.regularMarketPrice ?? meta?.previousClose ?? null;
}

// ── CoinGecko for crypto (fallback) ─────────────────────────────────────────
const COIN_IDS = {
  BTC: 'bitcoin',   ETH: 'ethereum',   SOL: 'solana',    ADA: 'cardano',
  XRP: 'ripple',    DOT: 'polkadot',   DOGE: 'dogecoin', MATIC: 'matic-network',
  AVAX: 'avalanche-2', LINK: 'chainlink', LTC: 'litecoin',
  BNB: 'binancecoin', SHIB: 'shiba-inu', UNI: 'uniswap',
};

async function getCryptoPrice(symbol) {
  const id = COIN_IDS[symbol.toUpperCase()] || symbol.toLowerCase();
  const res = await axios.get(`${CG_URL}/simple/price`, {
    params: { ids: id, vs_currencies: 'usd' },
    timeout: 8000,
  });
  return res.data[id]?.usd ?? null;
}

// ── Normalize ticker for Yahoo Finance ──────────────────────────────────────
function normalizeYahooTicker(symbol) {
  const upper = symbol.toUpperCase();
  // Crypto: BTC → BTC-USD, ETH → ETH-USD, etc.
  if (COIN_IDS[upper] || upper.endsWith('-USD')) {
    return upper.includes('-') ? upper : `${upper}-USD`;
  }
  return upper;
}

// ── Public: get latest price ─────────────────────────────────────────────────
async function getLatestPrice(symbol, type) {
  return cached(`price:${symbol}`, async () => {
    try {
      if (type === 'CRYPTO') {
        // Try Yahoo first (BTC-USD), fall back to CoinGecko
        const yPrice = await getYahooPrice(symbol).catch(() => null);
        if (yPrice) return yPrice;
        return (await getCryptoPrice(symbol)) ?? null;
      }
      return await getYahooPrice(symbol);
    } catch {
      return null;
    }
  }, 5 * 60_000); // 5-minute cache
}

// ── Yahoo Finance: OHLC history ───────────────────────────────────────────────
async function fetchOHLC(symbol, days = 90) {
  const ticker = normalizeYahooTicker(symbol);
  const range  = days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : '1y';

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
    const res = await axios.get(url, {
      headers: YF_HEADERS,
      params: { interval: '1d', range },
      timeout: 10000,
    });

    const result = res.data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp ?? [];
    const quote      = result.indicators?.quote?.[0] ?? {};
    const adjClose   = result.indicators?.adjclose?.[0]?.adjclose ?? quote.close;

    const rows = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = adjClose?.[i] ?? quote.close?.[i];
      if (close == null) continue;
      rows.push({
        date:   new Date(timestamps[i] * 1000),
        open:   +(quote.open?.[i]   ?? close).toFixed(4),
        high:   +(quote.high?.[i]   ?? close).toFixed(4),
        low:    +(quote.low?.[i]    ?? close).toFixed(4),
        close:  +close.toFixed(4),
        volume: Math.round(quote.volume?.[i] ?? 0),
      });
    }
    // Only return the last `days` rows
    return rows.slice(-days);
  } catch (err) {
    console.warn(`[marketData] fetchOHLC failed for ${symbol}:`, err.message);
    return [];
  }
}

// ── Yahoo Finance: search for assets by query ────────────────────────────────
async function searchYahoo(query) {
  try {
    const res = await axios.get('https://query1.finance.yahoo.com/v1/finance/search', {
      headers: YF_HEADERS,
      params: { q: query, quotesCount: 20, newsCount: 0, enableFuzzyQuery: false, enableCb: false },
      timeout: 8000,
    });
    const quotes = res.data?.quotes ?? [];
    return quotes
      .filter(q => q.symbol && q.quoteType)
      .map(q => ({
        symbol:   q.symbol,
        name:     q.shortname || q.longname || q.symbol,
        type:     mapYahooType(q.quoteType),
        exchange: q.exchange,
        sector:   q.sector ?? null,
      }))
      .filter(q => q.type !== null);
  } catch (err) {
    console.warn('[marketData] Yahoo search failed:', err.message);
    return [];
  }
}

function mapYahooType(quoteType) {
  const map = {
    EQUITY:      'STOCK',
    ETF:         'ETF',
    MUTUALFUND:  'ETF',
    CRYPTOCURRENCY: 'CRYPTO',
    FUTURE:      'COMMODITY',
    INDEX:       null,
    CURRENCY:    null,
  };
  return map[quoteType] ?? 'STOCK';
}

module.exports = { getLatestPrice, fetchOHLC, searchYahoo, normalizeYahooTicker };
