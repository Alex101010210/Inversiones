const router = require('express').Router();
const c = require('./dashboard.controller');

router.get('/summary/:portfolioId',     c.getSummary);
router.get('/allocation/:portfolioId',  c.getAllocation);
router.get('/performance/:portfolioId', c.getPerformance);
router.get('/overview',                 c.getOverview);
router.get('/benchmark',                c.getBenchmark);

module.exports = router;
