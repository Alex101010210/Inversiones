const router = require('express').Router();
const c = require('./portfolio.controller');

router.get('/',       c.listPortfolios);
router.post('/',      c.createPortfolio);
router.get('/:id',    c.getPortfolio);
router.put('/:id',    c.updatePortfolio);
router.delete('/:id', c.deletePortfolio);
router.get('/:id/holdings', c.getHoldings);

module.exports = router;
