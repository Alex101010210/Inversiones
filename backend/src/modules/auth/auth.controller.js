const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

// ─── Refresh token (stateless rotation) ──────────────────────────────────────
// If the current valid token expires in < 24h, issue a new one automatically.
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
      // Token expires within 24h → issue a fresh token
      return res.json({ token: signToken(user), user, refreshed: true });
    }

    res.json({ token, user, refreshed: false });
  } catch (err) { next(err); }
};

const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash, name } });

    // Create a default portfolio for new user
    await prisma.portfolio.create({
      data: { name: 'My Portfolio', userId: user.id, currency: 'USD' },
    });

    res.status(201).json({ token: signToken(user), user: { id: user.id, email, name } });
  } catch (err) {
    next(err);
  }
};

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
