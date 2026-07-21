const router = require('express').Router();
const c = require('./operations.controller');

router.get('/',        c.listOperations);
router.post('/',       c.createOperation);
router.get('/:id',     c.getOperation);
router.put('/:id',     c.updateOperation);
router.delete('/:id',  c.deleteOperation);

module.exports = router;
