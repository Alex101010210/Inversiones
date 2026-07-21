const router = require('express').Router();
const c = require('./asset.controller');

router.get('/',        c.listAssets);
router.post('/',       c.createAsset);
router.get('/search',  c.searchAssets);
router.get('/:symbol', c.getAsset);
router.get('/:symbol/price', c.getPrice);
router.get('/:symbol/history', c.getPriceHistory);

module.exports = router;
