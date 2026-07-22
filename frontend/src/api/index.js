// ─────────────────────────────────────────────────────────────────────────────
// Cliente HTTP centralizado (Axios) para todas las llamadas a la API del backend.
//
// Características:
//   - Adjunta automáticamente el token JWT en cada petición (interceptor de request)
//   - Si la respuesta es 401 desde nuestra API, cierra la sesión y redirige al login
//   - Renueva el token automáticamente cada 6 horas (token refresh silencioso)
//   - Todos los métodos retornan directamente res.data (sin necesidad de .data en cada uso)
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import { useAuthStore } from '../store';

// Instancia base apuntando a /api (el proxy de Vite redirige al backend en :3001)
const api = axios.create({ baseURL: '/api' });

// ─── Interceptor de petición: agrega el token JWT en el header ────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Renovación automática del token (stateless) ─────────────────────────────
// Una vez al iniciar la app y luego cada 6 horas verifica si el token necesita
// ser renovado. Esto evita que el usuario sea deslogueado por expiración inesperada.
let _refreshed = false;
function scheduleTokenRefresh() {
  if (_refreshed) return;
  _refreshed = true;
  const attempt = async () => {
    try {
      const { token: newToken, user } = await api.post('/auth/refresh');
      const store = useAuthStore.getState();
      if (newToken && newToken !== store.token) {
        store.setAuth(user, newToken); // actualizar el token en el store
      }
    } catch { /* token aún válido o usuario no logueado — ignorar silenciosamente */ }
  };
  attempt();
  setInterval(attempt, 6 * 60 * 60 * 1000); // revisar cada 6 horas
}
// Retrasar 5s para no bloquear la carga inicial de la página
setTimeout(scheduleTokenRefresh, 5_000);

// ─── Interceptor de respuesta: manejo global de errores ──────────────────────
api.interceptors.response.use(
  (res) => res.data, // extraer directamente los datos de la respuesta
  (err) => {
    // Solo desloguear si el 401 viene de NUESTRA API (/api/*), no de servicios externos
    const url = err.config?.url ?? '';
    const isOwnApi = url.startsWith('/api') || url.startsWith('http://localhost');
    if (err.response?.status === 401 && isOwnApi) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data ?? err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (d) => api.post('/auth/register', d),
  login:    (d) => api.post('/auth/login', d),
  me:       ()  => api.get('/auth/me'),
  refresh:  ()  => api.post('/auth/refresh'),
};

// ─── Portafolios ──────────────────────────────────────────────────────────────
export const portfolioApi = {
  list:    ()        => api.get('/portfolios'),
  create:  (d)       => api.post('/portfolios', d),
  get:     (id)      => api.get(`/portfolios/${id}`),
  update:  (id, d)   => api.put(`/portfolios/${id}`, d),
  delete:  (id)      => api.delete(`/portfolios/${id}`),
  holdings:(id)      => api.get(`/portfolios/${id}/holdings`),
};

// ─── Activos (Assets) ─────────────────────────────────────────────────────────
export const assetApi = {
  list:    (type)    => api.get('/assets', { params: { type } }),
  // external=true → también consulta Yahoo Finance para resultados que no están en la BD local
  search:  (q, external = true) => api.get('/assets/search', { params: { q, external } }),
  get:     (symbol)  => api.get(`/assets/${symbol}`),
  price:   (symbol)  => api.get(`/assets/${symbol}/price`),
  history: (symbol, days) => api.get(`/assets/${symbol}/history`, { params: { days } }),
  create:  (d)       => api.post('/assets', d),
};

// ─── Operaciones ──────────────────────────────────────────────────────────────
export const operationApi = {
  list:   (params)   => api.get('/operations', { params }).then(r => {
    // Retrocompatibilidad: el backend antiguo devuelve array, el nuevo devuelve { ops, total, totalPages }
    if (Array.isArray(r)) return { ops: r, total: r.length, page: 1, pageSize: r.length, totalPages: 1 };
    return r;
  }),
  create: (d)        => api.post('/operations', d),
  get:    (id)       => api.get(`/operations/${id}`),
  update: (id, d)    => api.put(`/operations/${id}`, d),
  delete: (id)       => api.delete(`/operations/${id}`),
};

// ─── Riesgo ───────────────────────────────────────────────────────────────────
export const riskApi = {
  get:     (portfolioId)        => api.get(`/risk/portfolio/${portfolioId}`),
  history: (portfolioId, days)  => api.get(`/risk/portfolio/${portfolioId}/history`, { params: { days } }),
};

// ─── Análisis técnico ─────────────────────────────────────────────────────────
export const analysisApi = {
  rsi:    (symbol, params) => api.get(`/analysis/${symbol}/rsi`,  { params }),
  macd:   (symbol)         => api.get(`/analysis/${symbol}/macd`),
  sma:    (symbol, params) => api.get(`/analysis/${symbol}/sma`,  { params }),
  ema:    (symbol, params) => api.get(`/analysis/${symbol}/ema`,  { params }),
  full:   (symbol)         => api.get(`/analysis/${symbol}/full`), // RSI + MACD + SMAs en una sola llamada
};

// ─── IA ───────────────────────────────────────────────────────────────────────
export const aiApi = {
  recommendations: (portfolioId) => api.get(`/ai/recommendations/${portfolioId}`),
  predict:         (symbol)      => api.get(`/ai/predict/${symbol}`),
  news:            (symbol)      => api.get(`/ai/news/${symbol}`),
  insights:        (params)      => api.get('/ai/insights', { params }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  summary:     (portfolioId)        => api.get(`/dashboard/summary/${portfolioId}`),
  allocation:  (portfolioId)        => api.get(`/dashboard/allocation/${portfolioId}`),
  performance: (portfolioId, days)  => api.get(`/dashboard/performance/${portfolioId}`, { params: { days } }),
  overview:    ()                   => api.get('/dashboard/overview'),
  benchmark:   (symbol, days)       => api.get('/dashboard/benchmark', { params: { symbol, days } }),
};

// ─── Exportar a CSV ───────────────────────────────────────────────────────────
export const exportApi = {
  // Descarga el CSV directamente en el navegador sin pasar por el estado de React
  operations: (portfolioId) => {
    const token = useAuthStore.getState().token;
    const params = portfolioId ? `?portfolioId=${portfolioId}` : '';
    const url = `/api/export/operations${params}`;
    downloadCsv(url, token);
  },
  holdings: (portfolioId) => {
    const token = useAuthStore.getState().token;
    const params = portfolioId ? `?portfolioId=${portfolioId}` : '';
    const url = `/api/export/holdings${params}`;
    downloadCsv(url, token);
  },
};

// Helper: descarga un CSV usando fetch nativo para poder leer el nombre de archivo del header
function downloadCsv(url, token) {
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => {
      // Leer el nombre de archivo del header Content-Disposition
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : 'export.csv';
      return res.blob().then(blob => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
      // Crear un enlace temporal para disparar la descarga
      const a = document.createElement('a');
      a.href  = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
}

// ─── Configuración de cuenta ──────────────────────────────────────────────────
export const settingsApi = {
  get:             ()  => api.get('/settings'),
  updateProfile:   (d) => api.put('/settings/profile', d),
  changePassword:  (d) => api.put('/settings/password', d),
  resetData:       ()  => api.delete('/settings/data'), // borra TODOS los datos del usuario
};

// ─── Alertas de precio ────────────────────────────────────────────────────────
export const alertsApi = {
  list:   ()       => api.get('/alerts'),
  create: (d)      => api.post('/alerts', d),
  delete: (id)     => api.delete(`/alerts/${id}`),
  toggle: (id)     => api.patch(`/alerts/${id}/toggle`), // activar/desactivar alerta
  check:  ()       => api.get('/alerts/check'),           // verificar alertas disparadas
};

// ─── Watchlist ────────────────────────────────────────────────────────────────
export const watchlistApi = {
  list:   ()       => api.get('/watchlist'),
  add:    (d)      => api.post('/watchlist', d),
  remove: (id)     => api.delete(`/watchlist/${id}`),
};

// ─── Importar operaciones desde CSV ──────────────────────────────────────────
export const importApi = {
  operations: (portfolioId, file) => {
    const form = new FormData();
    form.append('file', file);
    form.append('portfolioId', portfolioId);
    return api.post('/import/operations', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Screener de mercado ──────────────────────────────────────────────────────
export const screenerApi = {
  screen:       (params) => api.get('/screener',         { params }), // filtra activos en BD
  screenMarket: (params) => api.get('/screener/market',  { params }), // filtra activos en Yahoo Finance (tiempo real)
  filters:      ()       => api.get('/screener/filters'),             // obtiene sectores y tipos disponibles
};

export default api;
