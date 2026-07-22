// ─────────────────────────────────────────────────────────────────────────────
// Middleware de autenticación JWT.
// Se ejecuta antes de cualquier ruta protegida.
// Lee el header "Authorization: Bearer <token>", verifica la firma con
// JWT_SECRET y adjunta el payload decodificado en req.user para que los
// controladores puedan acceder a req.user.id, req.user.email, etc.
// ─────────────────────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  // Si no viene el header, rechazar con 401
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    // Verificar firma y expiración del token
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // disponible en todos los controladores subsiguientes
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };
