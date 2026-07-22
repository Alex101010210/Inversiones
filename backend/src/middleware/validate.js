// ─────────────────────────────────────────────────────────────────────────────
// Middleware de validación de campos.
// Se usa junto con express-validator en las rutas de autenticación.
// Si hay errores de validación (email inválido, password corto, etc.)
// responde con 422 y la lista de errores. Si todo es válido, llama a next().
// ─────────────────────────────────────────────────────────────────────────────

const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

module.exports = { validate };
