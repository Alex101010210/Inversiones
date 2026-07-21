const router = require('express').Router();
const c = require('./alerts.controller');

router.get('/',           c.listAlerts);
router.post('/',          c.createAlert);
router.delete('/:id',     c.deleteAlert);
router.patch('/:id/toggle', c.toggleAlert);
router.get('/check',      c.checkAlerts);

module.exports = router;
