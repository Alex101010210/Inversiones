const router = require('express').Router();
const { getProfile, updateProfile, changePassword, resetUserData } = require('./settings.controller');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');

router.get('/',  getProfile);
router.put('/profile',
  [body('name').notEmpty(), body('email').isEmail(), validate],
  updateProfile
);
router.put('/password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
    validate,
  ],
  changePassword
);
router.delete('/data', resetUserData);

module.exports = router;
