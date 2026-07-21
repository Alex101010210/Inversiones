const router  = require('express').Router();
const multer  = require('multer');
const { importOperations } = require('./import.controller');

// Store file in memory (no disk writes)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/operations', upload.single('file'), importOperations);

module.exports = router;
