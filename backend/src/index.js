// ─────────────────────────────────────────────────────────────────────────────
// Punto de entrada del servidor Express.
// Carga variables de entorno, registra middlewares globales, monta todas las
// rutas de la API y arranca el scheduler de precios.
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');

// ─── Rutas de cada módulo ────────────────────────────────────────────────────
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

// ─── Middleware y utilidades ─────────────────────────────────────────────────
const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const { schedulePriceFetch } = require('./config/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Rate Limiters ────────────────────────────────────────────────────────────
// Evitan abuso de la API limitando el número de peticiones por minuto.
const globalLimiter = rateLimit({
  windowMs: 60_000,          // ventana de 1 minuto
  max: 200,                  // máximo 200 peticiones por IP por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta en un momento.' },
});

// Límite más estricto para el módulo de IA (costoso en tiempo de proceso)
const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite de peticiones IA alcanzado (15/min), intenta más tarde.' },
});

// Límite para el screener de mercado (hace peticiones externas a Yahoo Finance)
const screenerLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite del screener alcanzado (10/min).' },
});

// ─── Middleware global ────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true })); // solo acepta peticiones desde el frontend local
app.use(express.json());      // parsea body JSON
app.use(morgan('dev'));        // logs de peticiones en consola
app.use(globalLimiter);       // aplica rate limit a todas las rutas

// ─── Rutas públicas (sin autenticación) ──────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Rutas protegidas (requieren JWT válido) ──────────────────────────────────
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

// ─── Health check ─────────────────────────────────────────────────────────────
// Endpoint simple para verificar que el servidor está vivo
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ─── Manejador global de errores ─────────────────────────────────────────────
// Captura cualquier error no manejado y devuelve un JSON estándar
app.use(errorHandler);

// ─── Scheduler ────────────────────────────────────────────────────────────────
// Registra los cron jobs para sincronización de precios y verificación de alertas
schedulePriceFetch();

app.listen(PORT, () => {
  console.log(`🚀 Investment ERP API running on http://localhost:${PORT}`);
});

module.exports = app;
