const router = require('express').Router();
const { register, login, me, refreshToken } = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');

router.post('/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('name').notEmpty(),
    validate,
  ],
  register
);

router.post('/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
    validate,
  ],
  login
);

router.get('/me',      authenticate, me);
router.post('/refresh', authenticate, refreshToken);

module.exports = router;
