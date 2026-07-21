const router = require('express').Router();
const c = require('./analysis.controller');

router.get('/:symbol/rsi',  c.getRSI);
router.get('/:symbol/macd', c.getMACD);
router.get('/:symbol/sma',  c.getSMA);
router.get('/:symbol/ema',  c.getEMA);
router.get('/:symbol/full', c.getFullAnalysis);

module.exports = router;
