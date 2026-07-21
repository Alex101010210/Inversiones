const prisma = require('../../config/prisma');
const { getLatestPrice, fetchOHLC, searchYahoo } = require('../../config/marketData');

const listAssets = async (req, res, next) => {
  try {
    const { type } = req.query;
    const where = type ? { type } : {};
    const assets = await prisma.asset.findMany({ where, orderBy: { symbol: 'asc' } });
    res.json(assets);
  } catch (err) { next(err); }
};

/**
 * Search: first queries the DB, then if insufficient results,
 * also queries Yahoo Finance and returns merged results.
 */
const searchAssets = async (req, res, next) => {
  try {
    const { q, external } = req.query;
    if (!q) return res.json([]);

    // DB results
    const dbAssets = await prisma.asset.findMany({
      where: {
        OR: [
          { symbol: { contains: q, mode: 'insensitive' } },
          { name:   { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });

    // If DB has enough results and external=false, return early
    if (external === 'false' || (dbAssets.length >= 5 && !external)) {
      return res.json(dbAssets);
    }

    // Augment with Yahoo Finance search
    const yahooResults = await searchYahoo(q);
    const dbSymbols = new Set(dbAssets.map(a => a.symbol));

    // Merge: DB results first, then unique Yahoo results
    const merged = [...dbAssets];
    for (const y of yahooResults) {
      if (!dbSymbols.has(y.symbol) && y.type) {
        merged.push({
          id:       null,      // not in DB yet
          symbol:   y.symbol,
          name:     y.name,
          type:     y.type,
          exchange: y.exchange ?? null,
          sector:   y.sector  ?? null,
          currency: 'USD',
          _external: true,     // flag for frontend
        });
      }
      if (merged.length >= 15) break;
    }

    res.json(merged);
  } catch (err) { next(err); }
};

const getAsset = async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    let asset = await prisma.asset.findUnique({ where: { symbol } });

    // Auto-create from Yahoo Finance if not in DB
    if (!asset) {
      const results = await searchYahoo(symbol);
      const match   = results.find(r => r.symbol.toUpperCase() === symbol);
      if (match) {
        asset = await prisma.asset.upsert({
          where:  { symbol },
          update: { name: match.name, exchange: match.exchange ?? undefined, sector: match.sector ?? undefined },
          create: {
            symbol,
            name:     match.name,
            type:     match.type,
            exchange: match.exchange ?? null,
            sector:   match.sector   ?? null,
            currency: 'USD',
          },
        });
      }
    }

    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (err) { next(err); }
};

const createAsset = async (req, res, next) => {
  try {
    const { symbol, name, type, exchange, sector, currency } = req.body;
    const upperSymbol = symbol.toUpperCase();

    // Try to enrich from Yahoo if only symbol provided
    let finalName = name || upperSymbol;
    let finalType = type || 'STOCK';

    if (!name || !type) {
      const results = await searchYahoo(upperSymbol).catch(() => []);
      const match   = results.find(r => r.symbol.toUpperCase() === upperSymbol);
      if (match) {
        finalName = name || match.name;
        finalType = type || match.type;
      }
    }

    const asset = await prisma.asset.upsert({
      where:  { symbol: upperSymbol },
      update: { name: finalName, exchange: exchange ?? undefined, sector: sector ?? undefined },
      create: {
        symbol:   upperSymbol,
        name:     finalName,
        type:     finalType,
        exchange: exchange ?? null,
        sector:   sector   ?? null,
        currency: currency || 'USD',
      },
    });
    res.status(201).json(asset);
  } catch (err) { next(err); }
};

const getPrice = async (req, res, next) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { symbol: req.params.symbol.toUpperCase() } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    const price = await getLatestPrice(asset.symbol, asset.type);
    res.json({ symbol: asset.symbol, price, timestamp: new Date() });
  } catch (err) { next(err); }
};

const getPriceHistory = async (req, res, next) => {
  try {
    const { days = 90 } = req.query;
    const symbol = req.params.symbol.toUpperCase();
    const since  = new Date(Date.now() - days * 86400000);

    const history = await prisma.priceHistory.findMany({
      where:   { asset: { symbol }, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    if (history.length === 0) {
      const ohlc = await fetchOHLC(symbol, +days);
      res.json(ohlc);
    } else {
      res.json(history);
    }
  } catch (err) { next(err); }
};

module.exports = { listAssets, searchAssets, getAsset, createAsset, getPrice, getPriceHistory };
