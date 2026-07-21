const router = require('express').Router();
const { screenAssets, screenMarket, getFilters } = require('./screener.controller');

router.get('/market',  screenMarket);   // live data from Yahoo Finance
router.get('/filters', getFilters);
router.get('/',        screenAssets);   // DB-based (portfolio holdings)

module.exports = router;
