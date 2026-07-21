require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');

const authRoutes      = require('./modules/auth/auth.routes');
const portfolioRoutes = require('./modules/portfolio/portfolio.routes');
const operationRoutes = require('./modules/operations/operations.routes');
const riskRoutes      = require('./modules/risk/risk.routes');
const analysisRoutes  = require('./modules/analysis/analysis.routes');
const aiRoutes        = require('./modules/ai/ai.routes');
const dashboardRoutes  = require('./modules/dashboard/dashboard.routes');
const assetRoutes      = require('./modules/portfolio/asset.routes');
const settingsRoutes   = require('./modules/settings/settings.routes');
const alertsRoutes     = require('./modules/alerts/alerts.routes');
const watchlistRoutes  = require('./modules/watchlist/watchlist.routes');
const exportRoutes     = require('./modules/export/export.routes');
const importRoutes     = require('./modules/import/import.routes');
const screenerRoutes   = require('./modules/screener/screener.routes');

const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const { schedulePriceFetch } = require('./config/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60_000,          // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta en un momento.' },
});

const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite de peticiones IA alcanzado (15/min), intenta más tarde.' },
});

const screenerLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite del screener alcanzado (10/min).' },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(globalLimiter);

// ─── Public Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Protected Routes ────────────────────────────────────────────────────────
app.use('/api/portfolios', authenticate, portfolioRoutes);
app.use('/api/operations', authenticate, operationRoutes);
app.use('/api/risk',       authenticate, riskRoutes);
app.use('/api/analysis',   authenticate, analysisRoutes);
app.use('/api/ai',         authenticate, aiLimiter, aiRoutes);
app.use('/api/dashboard',  authenticate, dashboardRoutes);
app.use('/api/assets',     authenticate, assetRoutes);
app.use('/api/settings',   authenticate, settingsRoutes);
app.use('/api/alerts',     authenticate, alertsRoutes);
app.use('/api/watchlist',  authenticate, watchlistRoutes);
app.use('/api/export',     authenticate, exportRoutes);
app.use('/api/import',     authenticate, importRoutes);
app.use('/api/screener',   authenticate, screenerLimiter, screenerRoutes);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Scheduler ────────────────────────────────────────────────────────────────
schedulePriceFetch();

app.listen(PORT, () => {
  console.log(`🚀 Investment ERP API running on http://localhost:${PORT}`);
});

module.exports = app;
