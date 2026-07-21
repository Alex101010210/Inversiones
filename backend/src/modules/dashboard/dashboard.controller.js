const prisma = require('../../config/prisma');
const { getLatestPrice } = require('../../config/marketData');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function enrichHoldings(holdings) {
  return Promise.all(
    holdings.map(async (h) => {
      // Fall back to avgCostBasis if live price is unavailable
      const currentPrice = (await getLatestPrice(h.asset.symbol, h.asset.type)) ?? h.avgCostBasis;
      const currentValue = currentPrice * h.quantity;
      const costBasis    = h.avgCostBasis * h.quantity;
      const pnl          = currentValue - costBasis;
      const pnlPct       = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return { ...h, currentPrice, currentValue, costBasis, pnl, pnlPct };
    })
  );
}

// ─── Controllers ─────────────────────────────────────────────────────────────

const getSummary = async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: req.params.portfolioId, userId: req.user.id },
      include: { holdings: { include: { asset: true } } },
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const enriched   = await enrichHoldings(portfolio.holdings);
    const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);
    const totalCost  = enriched.reduce((s, h) => s + h.costBasis, 0);
    const totalPnL   = totalValue - totalCost;
    const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    // Operations stats
    const opStats = await prisma.operation.groupBy({
      by: ['type'],
      where: { portfolioId: req.params.portfolioId },
      _count: { id: true },
      _sum:   { price: true },
    });

    res.json({
      portfolioId:  portfolio.id,
      name:         portfolio.name,
      currency:     portfolio.currency,
      totalValue:   +totalValue.toFixed(2),
      totalCost:    +totalCost.toFixed(2),
      totalPnL:     +totalPnL.toFixed(2),
      totalPnLPct:  +totalPnLPct.toFixed(2),
      holdingsCount: enriched.length,
      operationStats: opStats,
      lastUpdated: new Date(),
    });
  } catch (err) { next(err); }
};

const getAllocation = async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: req.params.portfolioId, userId: req.user.id },
      include: { holdings: { include: { asset: true } } },
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const enriched   = await enrichHoldings(portfolio.holdings);
    const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);

    // By asset
    const byAsset = enriched.map((h) => ({
      symbol:      h.asset.symbol,
      name:        h.asset.name,
      type:        h.asset.type,
      value:       +h.currentValue.toFixed(2),
      pct:         totalValue > 0 ? +((h.currentValue / totalValue) * 100).toFixed(2) : 0,
    }));

    // By type
    const byType = {};
    for (const h of enriched) {
      byType[h.asset.type] = (byType[h.asset.type] || 0) + h.currentValue;
    }
    const byTypeArr = Object.entries(byType).map(([type, value]) => ({
      type,
      value:  +value.toFixed(2),
      pct:    totalValue > 0 ? +((value / totalValue) * 100).toFixed(2) : 0,
    }));

    res.json({ portfolioId: portfolio.id, totalValue: +totalValue.toFixed(2), byAsset, byType: byTypeArr });
  } catch (err) { next(err); }
};

const getPerformance = async (req, res, next) => {
  try {
    const { days = 90 } = req.query;
    const since = new Date(Date.now() - days * 86400000);

    // First try risk snapshots
    let snapshots = await prisma.riskSnapshot.findMany({
      where:   { portfolioId: req.params.portfolioId, date: { gte: since } },
      orderBy: { date: 'asc' },
      select:  { date: true, totalValue: true, drawdown: true, sharpeRatio: true, volatility: true },
    });

    // If no snapshots, build series from price history + holdings
    if (snapshots.length === 0) {
      const portfolio = await prisma.portfolio.findFirst({
        where:   { id: req.params.portfolioId },
        include: { holdings: { include: { asset: true } } },
      });

      if (portfolio?.holdings?.length > 0) {
        // Get all price histories for holdings
        const seriesMap = {};
        for (const h of portfolio.holdings) {
          const prices = await prisma.priceHistory.findMany({
            where:   { assetId: h.assetId, date: { gte: since } },
            orderBy: { date: 'asc' },
            select:  { date: true, close: true },
          });
          for (const p of prices) {
            const key = p.date.toISOString().split('T')[0];
            seriesMap[key] = (seriesMap[key] || 0) + p.close * h.quantity;
          }
        }
        snapshots = Object.entries(seriesMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, totalValue]) => ({ date: new Date(date), totalValue, drawdown: 0, sharpeRatio: 0, volatility: 0 }));
      }
    }

    const ops = await prisma.operation.findMany({
      where:   { portfolioId: req.params.portfolioId },
      include: { asset: true },
      orderBy: { date: 'desc' },
      take: 10,
    });

    res.json({ snapshots, recentOperations: ops });
  } catch (err) { next(err); }
};

// ─── Benchmark ───────────────────────────────────────────────────────────────

const getBenchmark = async (req, res, next) => {
  try {
    const { days = 90, symbol = 'SPY' } = req.query;
    const since = new Date(Date.now() - days * 86400000);

    const benchmarkAsset = await prisma.asset.findFirst({
      where: { symbol: symbol.toUpperCase() },
    });

    if (!benchmarkAsset) {
      return res.json({ symbol, series: [], warning: `Asset ${symbol} not found in DB` });
    }

    const prices = await prisma.priceHistory.findMany({
      where:   { assetId: benchmarkAsset.id, date: { gte: since } },
      orderBy: { date: 'asc' },
      select:  { date: true, close: true },
    });

    if (prices.length === 0) {
      return res.json({ symbol, series: [], warning: 'No price history found' });
    }

    // Normalise to 100 at first data point so we can overlay any portfolio
    const base = prices[0].close;
    const series = prices.map(p => ({
      date:       p.date,
      close:      p.close,
      normalised: +((p.close / base) * 100).toFixed(4),
      returnPct:  +(((p.close - base) / base) * 100).toFixed(2),
    }));

    const totalReturn = series[series.length - 1]?.returnPct ?? 0;

    res.json({ symbol, series, totalReturn, days: +days });
  } catch (err) { next(err); }
};

const getOverview = async (req, res, next) => {
  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId: req.user.id },
      include: { holdings: { include: { asset: true } } },
    });

    const summaries = await Promise.all(
      portfolios.map(async (p) => {
        const enriched   = await enrichHoldings(p.holdings);
        const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);
        const totalCost  = enriched.reduce((s, h) => s + h.costBasis, 0);
        return {
          id:          p.id,
          name:        p.name,
          currency:    p.currency,
          totalValue:  +totalValue.toFixed(2),
          totalCost:   +totalCost.toFixed(2),
          totalPnL:    +(totalValue - totalCost).toFixed(2),
          totalPnLPct: totalCost > 0 ? +((totalValue - totalCost) / totalCost * 100).toFixed(2) : 0,
          holdingsCount: enriched.length,
        };
      })
    );

    const grandTotal = summaries.reduce((s, p) => s + p.totalValue, 0);
    res.json({ portfolios: summaries, grandTotal: +grandTotal.toFixed(2) });
  } catch (err) { next(err); }
};

module.exports = { getSummary, getAllocation, getPerformance, getOverview, getBenchmark };
