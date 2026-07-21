const prisma = require('../../config/prisma');
const { getLatestPrice } = require('../../config/marketData');

const listPortfolios = async (req, res, next) => {
  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId: req.user.id },
      include: { _count: { select: { holdings: true, operations: true } } },
    });
    res.json(portfolios);
  } catch (err) { next(err); }
};

const createPortfolio = async (req, res, next) => {
  try {
    const { name, description, currency } = req.body;
    const portfolio = await prisma.portfolio.create({
      data: { name, description, currency: currency || 'USD', userId: req.user.id },
    });
    res.status(201).json(portfolio);
  } catch (err) { next(err); }
};

const getPortfolio = async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { holdings: { include: { asset: true } } },
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    res.json(portfolio);
  } catch (err) { next(err); }
};

const updatePortfolio = async (req, res, next) => {
  try {
    const { name, description, currency } = req.body;
    const portfolio = await prisma.portfolio.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { name, description, currency },
    });
    res.json(portfolio);
  } catch (err) { next(err); }
};

const deletePortfolio = async (req, res, next) => {
  try {
    await prisma.portfolio.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    });
    res.status(204).send();
  } catch (err) { next(err); }
};

const getHoldings = async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const holdings = await prisma.holding.findMany({
      where: { portfolioId: req.params.id },
      include: { asset: true },
    });

    // Sum total fees paid per asset in this portfolio
    const feesByAsset = await prisma.operation.groupBy({
      by: ['assetId'],
      where: { portfolioId: req.params.id },
      _sum: { fees: true },
    });
    const feesMap = Object.fromEntries(feesByAsset.map(f => [f.assetId, f._sum.fees ?? 0]));

    // Enrich with current price (currentPrice may be null if Yahoo is unavailable)
    const enriched = await Promise.all(
      holdings.map(async (h) => {
        const currentPrice = await getLatestPrice(h.asset.symbol, h.asset.type) ?? h.avgCostBasis;
        const currentValue = currentPrice * h.quantity;
        const costBasis    = h.avgCostBasis * h.quantity;
        const pnl          = currentValue - costBasis;
        const pnlPct       = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
        const totalFees    = feesMap[h.assetId] ?? 0;
        return { ...h, currentPrice, currentValue, costBasis, pnl, pnlPct, totalFees };
      })
    );

    res.json(enriched);
  } catch (err) { next(err); }
};

module.exports = { listPortfolios, createPortfolio, getPortfolio, updatePortfolio, deletePortfolio, getHoldings };
