const router = require('express').Router();
const c = require('./ai.controller');

router.get('/recommendations/:portfolioId',  c.getRecommendations);
router.get('/predict/:symbol',               c.predictTrend);
router.get('/news/:symbol',                  c.getNewsAnalysis);
router.get('/insights',                      c.listInsights);

module.exports = router;
