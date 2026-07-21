const router = require('express').Router();
const { exportOperations, exportHoldings } = require('./export.controller');

router.get('/operations', exportOperations);
router.get('/holdings',   exportHoldings);

module.exports = router;
