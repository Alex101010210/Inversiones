const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.json(user);
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data:  { name, email },
      select: { id: true, email: true, name: true },
    });
    res.json(user);
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/settings/data
 * Borra TODOS los datos del usuario autenticado:
 * operaciones, holdings, snapshots de riesgo, historial de precios de sus activos,
 * alertas, watchlist y AI insights.
 * Los portafolios quedan vacíos. Los activos compartidos NO se borran (solo los datos propios).
 */
const resetUserData = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all portfolio IDs that belong to this user
    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      select: { id: true },
    });
    const portfolioIds = portfolios.map(p => p.id);

    // Delete in correct order (FK constraints)
    await prisma.operation.deleteMany({ where: { portfolioId: { in: portfolioIds } } });
    await prisma.holding.deleteMany({ where: { portfolioId: { in: portfolioIds } } });
    await prisma.riskSnapshot.deleteMany({ where: { portfolioId: { in: portfolioIds } } });
    await prisma.priceAlert.deleteMany({ where: { userId } });
    await prisma.watchlistItem.deleteMany({ where: { userId } });
    await prisma.aiInsight.deleteMany({ where: { portfolioId: { in: portfolioIds } } });

    res.json({ message: 'Todos los datos han sido eliminados correctamente.' });
  } catch (err) { next(err); }
};

module.exports = { getProfile, updateProfile, changePassword, resetUserData };
