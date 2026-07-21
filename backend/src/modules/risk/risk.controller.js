const prisma = require('../../config/prisma');
const { getLatestPrice } = require('../../config/marketData');

// ─── Math helpers ─────────────────────────────────────────────────────────────

function calcReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr) {
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function calcDrawdown(valueSeries) {
  let peak = -Infinity;
  let maxDD = 0;
  for (const v of valueSeries) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

function calcSharpe(returns, riskFreeRate = 0.05) {
  const annualRF = riskFreeRate / 252;
  const excess   = returns.map((r) => r - annualRF);
  const mu       = mean(excess);
  const sigma    = stdDev(excess);
  return sigma === 0 ? 0 : (mu / sigma) * Math.sqrt(252);
}

function calcVolatility(returns) {
  return stdDev(returns) * Math.sqrt(252); // annualised
}

// VaR using historical simulation (95%)
function calcVaR(returns, confidence = 0.95) {
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return sorted[idx];
}

// ─── Controller ───────────────────────────────────────────────────────────────

const getPortfolioRisk = async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: req.params.portfolioId, userId: req.user.id },
      include: { holdings: { include: { asset: true } } },
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    // Get 90-day price history for all holdings
    const since = new Date(Date.now() - 90 * 86400000);
    let allReturns = [];
    let valueSeries = {};

    for (const h of portfolio.holdings) {
      const prices = await prisma.priceHistory.findMany({
        where: { assetId: h.assetId, date: { gte: since } },
        orderBy: { date: 'asc' },
        select: { date: true, close: true },
      });
      if (prices.length < 2) continue;

      const closePrices = prices.map((p) => p.close);
      const returns     = calcReturns(closePrices);
      allReturns.push(...returns);

      // Build portfolio value time series weighted by quantity
      prices.forEach((p, i) => {
        const key = p.date.toISOString().split('T')[0];
        valueSeries[key] = (valueSeries[key] || 0) + p.close * h.quantity;
      });
    }

    const valueArr  = Object.values(valueSeries);
    const drawdown  = valueArr.length > 1 ? calcDrawdown(valueArr)    : 0;
    const volatility = allReturns.length > 1 ? calcVolatility(allReturns) : 0;
    const sharpe     = allReturns.length > 1 ? calcSharpe(allReturns)    : 0;
    const var95      = allReturns.length > 1 ? calcVaR(allReturns)       : 0;

    // Current total value (fall back to avgCostBasis if live price unavailable)
    const totalValue = await Promise.all(
      portfolio.holdings.map(async (h) => {
        const price = (await getLatestPrice(h.asset.symbol, h.asset.type)) ?? h.avgCostBasis;
        return price * h.quantity;
      })
    ).then((vals) => vals.reduce((s, v) => s + v, 0));

    res.json({
      portfolioId:  portfolio.id,
      totalValue,
      drawdown:     +(drawdown   * 100).toFixed(2),
      volatility:   +(volatility * 100).toFixed(2),
      sharpeRatio:  +sharpe.toFixed(4),
      var95:        +(var95      * 100).toFixed(2),
      calculatedAt: new Date(),
    });
  } catch (err) { next(err); }
};

const saveSnapshot = async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: req.params.portfolioId, userId: req.user.id },
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const riskData = req.body;
    const snapshot = await prisma.riskSnapshot.create({
      data: {
        portfolioId: req.params.portfolioId,
        date:        new Date(),
        totalValue:  riskData.totalValue,
        drawdown:    riskData.drawdown,
        volatility:  riskData.volatility,
        sharpeRatio: riskData.sharpeRatio,
        var95:       riskData.var95,
      },
    });
    res.status(201).json(snapshot);
  } catch (err) { next(err); }
};

const getRiskHistory = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 86400000);
    const history = await prisma.riskSnapshot.findMany({
      where: { portfolioId: req.params.portfolioId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });
    res.json(history);
  } catch (err) { next(err); }
};

module.exports = { getPortfolioRisk, saveSnapshot, getRiskHistory };
