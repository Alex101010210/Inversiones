/**
 * Alerts module
 * Permite crear alertas de precio sobre activos (above / below un threshold).
 * El scheduler las evalúa cada vez que corre el sync de precios.
 */

const prisma = require('../../config/prisma');
const { getLatestPrice } = require('../../config/marketData');

// ─── CRUD ─────────────────────────────────────────────────────────────────────

const listAlerts = async (req, res, next) => {
  try {
    const alerts = await prisma.priceAlert.findMany({
      where:   { userId: req.user.id },
      include: { asset: { select: { symbol: true, name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(alerts);
  } catch (err) { next(err); }
};

const createAlert = async (req, res, next) => {
  try {
    const { assetId, condition, threshold, note } = req.body;
    const alert = await prisma.priceAlert.create({
      data: { userId: req.user.id, assetId, condition, threshold: +threshold, note, active: true },
      include: { asset: { select: { symbol: true, name: true } } },
    });
    res.status(201).json(alert);
  } catch (err) { next(err); }
};

const deleteAlert = async (req, res, next) => {
  try {
    await prisma.priceAlert.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

const toggleAlert = async (req, res, next) => {
  try {
    const alert = await prisma.priceAlert.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada' });
    const updated = await prisma.priceAlert.update({
      where: { id: req.params.id },
      data:  { active: !alert.active },
    });
    res.json(updated);
  } catch (err) { next(err); }
};

// ─── Check (llamado desde el scheduler y también expuesto como endpoint) ─────

const checkAlerts = async (req, res, next) => {
  try {
    const alerts = await prisma.priceAlert.findMany({
      where:   { active: true },
      include: { asset: true },
    });

    const triggered = [];
    for (const alert of alerts) {
      const price = await getLatestPrice(alert.asset.symbol, alert.asset.type);
      const fired =
        (alert.condition === 'ABOVE' && price >= alert.threshold) ||
        (alert.condition === 'BELOW' && price <= alert.threshold);

      if (fired) {
        // Desactivar la alerta una vez disparada
        await prisma.priceAlert.update({ where: { id: alert.id }, data: { active: false, triggeredAt: new Date(), triggeredPrice: price } });
        triggered.push({ ...alert, triggeredPrice: price });
      }
    }

    if (res) res.json({ checked: alerts.length, triggered: triggered.length, items: triggered });
    return triggered;
  } catch (err) { if (next) next(err); }
};

module.exports = { listAlerts, createAlert, deleteAlert, toggleAlert, checkAlerts };
