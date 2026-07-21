const prisma = require('../../config/prisma');
const { fetchOHLC } = require('../../config/marketData');

// ─── In-memory analysis cache (TTL: 5 minutes) ───────────────────────────────
const analysisCache = new Map();
const ANALYSIS_TTL  = 5 * 60_000;

function cachedAnalysis(key, fn) {
  const hit = analysisCache.get(key);
  if (hit && Date.now() - hit.ts < ANALYSIS_TTL) return Promise.resolve(hit.value);
  return fn().then(val => { analysisCache.set(key, { value: val, ts: Date.now() }); return val; });
}

// ─── Indicator helpers ────────────────────────────────────────────────────────

function calcSMA(closes, period) {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    return slice.reduce((s, v) => s + v, 0) / period;
  });
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  const ema = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcRSI(closes, period = 14) {
  const rsi = new Array(period).fill(null);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains  += change;
    else             losses -= change;
  }
  let avgGain = gains  / period;
  let avgLoss = losses / period;
  rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const g = change >= 0 ? change : 0;
    const l = change <  0 ? -change : 0;
    avgGain  = (avgGain  * (period - 1) + g) / period;
    avgLoss  = (avgLoss  * (period - 1) + l) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return rsi;
}

function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast   = calcEMA(closes, fast);
  const emaSlow   = calcEMA(closes, slow);
  const macdLine  = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = calcEMA(macdLine.slice(slow - 1), signal);
  const histogram  = macdLine.slice(slow - 1).map((v, i) => v - (signalLine[i] ?? 0));
  return { macdLine: macdLine.slice(slow - 1), signalLine, histogram };
}

function signal(rsi, macd) {
  if (rsi < 30 && macd.histogram[macd.histogram.length - 1] > 0) return 'BUY';
  if (rsi > 70 && macd.histogram[macd.histogram.length - 1] < 0) return 'SELL';
  return 'HOLD';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getPrices(symbol, days = 200) {
  return cachedAnalysis(`prices:${symbol}:${days}`, async () => {
    const since = new Date(Date.now() - days * 86400000);
    const rows   = await prisma.priceHistory.findMany({
      where:   { asset: { symbol: symbol.toUpperCase() }, date: { gte: since } },
      orderBy: { date: 'asc' },
      select:  { date: true, close: true },
    });
    if (rows.length >= 30) return rows;

    // Fall back to live Yahoo Finance data if DB is empty / insufficient
    const ohlc = await fetchOHLC(symbol.toUpperCase(), days).catch(() => []);
    return ohlc.map(r => ({ date: r.date, close: r.close }));
  });
}

// ─── Controllers ─────────────────────────────────────────────────────────────

const getRSI = async (req, res, next) => {
  try {
    const { period = 14, days = 100 } = req.query;
    const rows   = await getPrices(req.params.symbol, days);
    const closes = rows.map((r) => r.close);
    const rsi    = calcRSI(closes, +period);
    res.json({ symbol: req.params.symbol, period: +period, data: rows.map((r, i) => ({ date: r.date, rsi: rsi[i] })) });
  } catch (err) { next(err); }
};

const getMACD = async (req, res, next) => {
  try {
    const rows   = await getPrices(req.params.symbol, 200);
    const closes = rows.map((r) => r.close);
    const macd   = calcMACD(closes);
    const offset = rows.length - macd.macdLine.length;
    res.json({
      symbol: req.params.symbol,
      data: macd.macdLine.map((_, i) => ({
        date:       rows[i + offset].date,
        macd:       macd.macdLine[i],
        signal:     macd.signalLine[i],
        histogram:  macd.histogram[i],
      })),
    });
  } catch (err) { next(err); }
};

const getSMA = async (req, res, next) => {
  try {
    const { period = 20, days = 120 } = req.query;
    const rows   = await getPrices(req.params.symbol, days);
    const closes = rows.map((r) => r.close);
    const sma    = calcSMA(closes, +period);
    res.json({ symbol: req.params.symbol, period: +period, data: rows.map((r, i) => ({ date: r.date, sma: sma[i] })) });
  } catch (err) { next(err); }
};

const getEMA = async (req, res, next) => {
  try {
    const { period = 20, days = 120 } = req.query;
    const rows   = await getPrices(req.params.symbol, days);
    const closes = rows.map((r) => r.close);
    const ema    = calcEMA(closes, +period);
    res.json({ symbol: req.params.symbol, period: +period, data: rows.map((r, i) => ({ date: r.date, ema: ema[i] })) });
  } catch (err) { next(err); }
};

const getFullAnalysis = async (req, res, next) => {
  try {
    const rows   = await getPrices(req.params.symbol, 200);
    if (rows.length < 30) return res.json({ symbol: req.params.symbol, warning: 'Insufficient data' });

    const closes = rows.map((r) => r.close);
    const rsi    = calcRSI(closes);
    const macd   = calcMACD(closes);
    const sma20  = calcSMA(closes, 20);
    const sma50  = calcSMA(closes, 50);
    const ema12  = calcEMA(closes, 12);
    const ema20  = calcEMA(closes, 20);
    const ema26  = calcEMA(closes, 26);

    const currentRSI = rsi[rsi.length - 1];
    const currentSig = signal(currentRSI, macd);

    res.json({
      symbol:      req.params.symbol,
      signal:      currentSig,
      currentRSI:  +currentRSI.toFixed(2),
      macd: {
        value:     +macd.macdLine[macd.macdLine.length - 1].toFixed(4),
        signal:    +macd.signalLine[macd.signalLine.length - 1].toFixed(4),
        histogram: +macd.histogram[macd.histogram.length - 1].toFixed(4),
      },
      sma20:  +sma20[sma20.length - 1].toFixed(4),
      sma50:  sma50[sma50.length - 1] ? +sma50[sma50.length - 1].toFixed(4) : null,
      ema12:  +ema12[ema12.length - 1].toFixed(4),
      ema20:  +ema20[ema20.length - 1].toFixed(4),
      ema26:  +ema26[ema26.length - 1].toFixed(4),
      priceAboveSMA20: closes[closes.length - 1] > sma20[sma20.length - 1],
      priceAboveSMA50: sma50[sma50.length - 1] ? closes[closes.length - 1] > sma50[sma50.length - 1] : null,
      analyzedAt: new Date(),
    });
  } catch (err) { next(err); }
};

module.exports = { getRSI, getMACD, getSMA, getEMA, getFullAnalysis };
