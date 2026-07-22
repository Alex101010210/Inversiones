// ─────────────────────────────────────────────────────────────────────────────
// Controlador de autenticación.
// Maneja el registro de nuevos usuarios, el inicio de sesión y la consulta
// del perfil. Los tokens JWT tienen una vida de 7 días y se renuevan
// automáticamente cuando quedan menos de 24 horas de validez.
// ─────────────────────────────────────────────────────────────────────────────

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');

// Genera un JWT firmado con los datos básicos del usuario (id + email)
const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

// ─── Renovación automática de token (rotación stateless) ─────────────────────
// Si el token actual vence en menos de 24 horas, se emite uno nuevo
// sin que el usuario tenga que volver a iniciar sesión.
const refreshToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = header.split(' ')[1];
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ error: 'Token inválido o expirado' }); }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true },
    });
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    const expiresAt = payload.exp * 1000;
    const in24h     = Date.now() + 24 * 60 * 60 * 1000;

    if (expiresAt < in24h) {
      // El token expira pronto → emitir uno nuevo
      return res.json({ token: signToken(user), user, refreshed: true });
    }

    // Token aún vigente, devolver el mismo
    res.json({ token, user, refreshed: false });
  } catch (err) { next(err); }
};

// ─── Registro de nuevo usuario ────────────────────────────────────────────────
// Verifica que el email no esté en uso, hashea la contraseña con bcrypt,
// crea el usuario y automáticamente le crea un portafolio vacío por defecto.
const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12); // factor de costo 12
    const user = await prisma.user.create({ data: { email, passwordHash, name } });

    // Crear portafolio inicial para que el usuario pueda empezar a operar
    await prisma.portfolio.create({
      data: { name: 'My Portfolio', userId: user.id, currency: 'USD' },
    });

    res.status(201).json({ token: signToken(user), user: { id: user.id, email, name } });
  } catch (err) {
    next(err);
  }
};

// ─── Inicio de sesión ─────────────────────────────────────────────────────────
// Busca el usuario por email y compara la contraseña con el hash almacenado.
// Devuelve el token JWT y los datos básicos del usuario (sin passwordHash).
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ token: signToken(user), user: { id: user.id, email, name: user.name } });
  } catch (err) {
    next(err);
  }
};

// ─── Perfil del usuario autenticado ──────────────────────────────────────────
// Devuelve los datos del usuario actual (req.user viene del middleware authenticate)
const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me, refreshToken };
