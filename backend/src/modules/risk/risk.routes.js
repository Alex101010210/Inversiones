const router = require('express').Router();
const c = require('./risk.controller');

router.get('/portfolio/:portfolioId',           c.getPortfolioRisk);
router.post('/portfolio/:portfolioId/snapshot', c.saveSnapshot);
router.get('/portfolio/:portfolioId/history',   c.getRiskHistory);

module.exports = router;
