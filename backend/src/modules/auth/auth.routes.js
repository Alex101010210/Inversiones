// ─────────────────────────────────────────────────────────────────────────────
// Rutas de autenticación — todas son públicas excepto /me y /refresh.
// Usa express-validator para validar el body antes de ejecutar el controlador.
// ─────────────────────────────────────────────────────────────────────────────

const router = require('express').Router();
const { register, login, me, refreshToken } = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');

// POST /api/auth/register — email único, contraseña mínimo 8 caracteres
router.post('/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('name').notEmpty(),
    validate,
  ],
  register
);

// POST /api/auth/login — valida que vengan email y password no vacíos
router.post('/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
    validate,
  ],
  login
);

// GET  /api/auth/me       — perfil del usuario autenticado
// POST /api/auth/refresh  — renueva el token si está próximo a expirar
router.get('/me',      authenticate, me);
router.post('/refresh', authenticate, refreshToken);

module.exports = router;
