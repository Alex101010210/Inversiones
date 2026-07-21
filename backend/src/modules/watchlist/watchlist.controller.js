const prisma = require('../../config/prisma');
const { getLatestPrice } = require('../../config/marketData');

const listWatchlist = async (req, res, next) => {
  try {
    const items = await prisma.watchlistItem.findMany({
      where:   { userId: req.user.id },
      include: { asset: true },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with live price
    const enriched = await Promise.all(
      items.map(async (item) => {
        const currentPrice = await getLatestPrice(item.asset.symbol, item.asset.type);
        return { ...item, currentPrice };
      })
    );
    res.json(enriched);
  } catch (err) { next(err); }
};

const addToWatchlist = async (req, res, next) => {
  try {
    const { assetId, note } = req.body;
    const item = await prisma.watchlistItem.upsert({
      where:  { userId_assetId: { userId: req.user.id, assetId } },
      update: { note },
      create: { userId: req.user.id, assetId, note },
      include: { asset: true },
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
};

const removeFromWatchlist = async (req, res, next) => {
  try {
    await prisma.watchlistItem.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { listWatchlist, addToWatchlist, removeFromWatchlist };
