const router = require('express').Router();
const c = require('./watchlist.controller');

router.get('/',        c.listWatchlist);
router.post('/',       c.addToWatchlist);
router.delete('/:id',  c.removeFromWatchlist);

module.exports = router;
