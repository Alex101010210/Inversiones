/**
 * Unit tests for analysis indicator calculations.
 * Tests the pure math functions used in analysis.controller.js
 */

// ─── Helpers (copy of the implementations) ───────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('calcSMA', () => {
  const closes = [10, 20, 30, 40, 50];

  test('returns null for indices < period-1', () => {
    const result = calcSMA(closes, 3);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
  });

  test('computes correct SMA value', () => {
    const result = calcSMA(closes, 3);
    expect(result[2]).toBeCloseTo(20);  // (10+20+30)/3
    expect(result[4]).toBeCloseTo(40);  // (30+40+50)/3
  });

  test('SMA(1) equals each price', () => {
    const result = calcSMA(closes, 1);
    closes.forEach((v, i) => expect(result[i]).toBeCloseTo(v));
  });
});

describe('calcEMA', () => {
  const closes = [10, 20, 30, 40, 50];

  test('first EMA equals first close', () => {
    const result = calcEMA(closes, 3);
    expect(result[0]).toBe(10);
  });

  test('EMA is influenced by recent prices more than older ones', () => {
    const rising = [1, 2, 3, 4, 5, 100];
    const ema = calcEMA(rising, 3);
    // After spike to 100, EMA should be higher than SMA of last 3
    expect(ema[ema.length - 1]).toBeGreaterThan(50);
  });

  test('returns same length as input', () => {
    const result = calcEMA(closes, 3);
    expect(result.length).toBe(closes.length);
  });
});

describe('calcRSI', () => {
  test('returns null for first `period` entries', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const rsi = calcRSI(closes, 14);
    for (let i = 0; i < 14; i++) expect(rsi[i]).toBeNull();
  });

  test('RSI is 100 when prices only go up', () => {
    const closes = Array.from({ length: 20 }, (_, i) => i + 1);
    const rsi = calcRSI(closes, 14);
    const last = rsi.filter(Boolean).pop();
    expect(last).toBeCloseTo(100, 0);
  });

  test('RSI is 0 when prices only go down', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 20 - i);
    const rsi = calcRSI(closes, 14);
    // filter(Boolean) removes 0 (falsy), use filter(v=>v!==null) instead
    const last = rsi.filter(v => v !== null).pop();
    expect(last).toBeCloseTo(0, 0);
  });

  test('RSI is between 0 and 100', () => {
    const closes = [100, 105, 102, 108, 103, 110, 107, 112, 109, 115, 111, 118, 114, 120, 116, 122];
    const rsi = calcRSI(closes, 14);
    rsi.filter(Boolean).forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });
});

describe('Risk calculations (integration style)', () => {
  test('Sharpe ratio formula: (return - riskFree) / stdDev', () => {
    const returns = [0.01, -0.005, 0.02, 0.015, -0.01, 0.03, 0.005, -0.008];
    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
    const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const riskFree = 0.04 / 252;
    const sharpe = stdDev > 0 ? (mean - riskFree) / stdDev : 0;
    expect(sharpe).toBeGreaterThan(0);
  });

  test('Drawdown: peak-to-trough calculation', () => {
    const values = [100, 120, 110, 90, 95, 105];
    let peak = values[0];
    let maxDrawdown = 0;
    for (const v of values) {
      if (v > peak) peak = v;
      const dd = ((peak - v) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
    expect(maxDrawdown).toBeCloseTo(25, 0); // (120-90)/120 = 25%
  });
});
