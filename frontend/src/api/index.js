import axios from 'axios';
import { useAuthStore } from '../store';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auto-refresh stateless token ────────────────────────────────────────────
// Once on app startup (and every 6h) check if the token needs rotation.
let _refreshed = false;
function scheduleTokenRefresh() {
  if (_refreshed) return;
  _refreshed = true;
  const attempt = async () => {
    try {
      const { token: newToken, user } = await api.post('/auth/refresh');
      const store = useAuthStore.getState();
      if (newToken && newToken !== store.token) {
        store.setAuth(user, newToken);
      }
    } catch { /* token still valid or user logged out */ }
  };
  attempt();
  setInterval(attempt, 6 * 60 * 60 * 1000); // re-check every 6h
}
// Run after a short delay to avoid blocking initial page load
setTimeout(scheduleTokenRefresh, 5_000);

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    // Solo desloguear si el 401 viene de NUESTRA API (/api/*), no de APIs externas
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

// ─── Portfolios ───────────────────────────────────────────────────────────────
export const portfolioApi = {
  list:    ()        => api.get('/portfolios'),
  create:  (d)       => api.post('/portfolios', d),
  get:     (id)      => api.get(`/portfolios/${id}`),
  update:  (id, d)   => api.put(`/portfolios/${id}`, d),
  delete:  (id)      => api.delete(`/portfolios/${id}`),
  holdings:(id)      => api.get(`/portfolios/${id}/holdings`),
};

// ─── Assets ───────────────────────────────────────────────────────────────────
export const assetApi = {
  list:    (type)    => api.get('/assets', { params: { type } }),
  // external=true → also queries Yahoo Finance for results not in local DB
  search:  (q, external = true) => api.get('/assets/search', { params: { q, external } }),
  get:     (symbol)  => api.get(`/assets/${symbol}`),
  price:   (symbol)  => api.get(`/assets/${symbol}/price`),
  history: (symbol, days) => api.get(`/assets/${symbol}/history`, { params: { days } }),
  create:  (d)       => api.post('/assets', d),
};

// ─── Operations ───────────────────────────────────────────────────────────────
export const operationApi = {
  list:   (params)   => api.get('/operations', { params }).then(r => {
    // Backwards-compat: old backend returns array, new returns { ops, total, totalPages }
    if (Array.isArray(r)) return { ops: r, total: r.length, page: 1, pageSize: r.length, totalPages: 1 };
    return r;
  }),
  create: (d)        => api.post('/operations', d),
  get:    (id)       => api.get(`/operations/${id}`),
  update: (id, d)    => api.put(`/operations/${id}`, d),
  delete: (id)       => api.delete(`/operations/${id}`),
};

// ─── Risk ─────────────────────────────────────────────────────────────────────
export const riskApi = {
  get:     (portfolioId)        => api.get(`/risk/portfolio/${portfolioId}`),
  history: (portfolioId, days)  => api.get(`/risk/portfolio/${portfolioId}/history`, { params: { days } }),
};

// ─── Analysis ────────────────────────────────────────────────────────────────
export const analysisApi = {
  rsi:    (symbol, params) => api.get(`/analysis/${symbol}/rsi`,  { params }),
  macd:   (symbol)         => api.get(`/analysis/${symbol}/macd`),
  sma:    (symbol, params) => api.get(`/analysis/${symbol}/sma`,  { params }),
  ema:    (symbol, params) => api.get(`/analysis/${symbol}/ema`,  { params }),
  full:   (symbol)         => api.get(`/analysis/${symbol}/full`),
};

// ─── AI ───────────────────────────────────────────────────────────────────────
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

// ─── Export ──────────────────────────────────────────────────────────────────
export const exportApi = {
  // Descarga el CSV directamente desde el navegador
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

function downloadCsv(url, token) {
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => {
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : 'export.csv';
      return res.blob().then(blob => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
      const a = document.createElement('a');
      a.href  = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
}

// ─── Settings ────────────────────────────────────────────────────────────────
export const settingsApi = {
  get:             ()  => api.get('/settings'),
  updateProfile:   (d) => api.put('/settings/profile', d),
  changePassword:  (d) => api.put('/settings/password', d),
  resetData:       ()  => api.delete('/settings/data'),
};

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const alertsApi = {
  list:   ()       => api.get('/alerts'),
  create: (d)      => api.post('/alerts', d),
  delete: (id)     => api.delete(`/alerts/${id}`),
  toggle: (id)     => api.patch(`/alerts/${id}/toggle`),
  check:  ()       => api.get('/alerts/check'),
};

// ─── Watchlist ────────────────────────────────────────────────────────────────
export const watchlistApi = {
  list:   ()       => api.get('/watchlist'),
  add:    (d)      => api.post('/watchlist', d),
  remove: (id)     => api.delete(`/watchlist/${id}`),
};

// ─── Import ──────────────────────────────────────────────────────────────────
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

// ─── Screener ────────────────────────────────────────────────────────────────
export const screenerApi = {
  screen:       (params) => api.get('/screener',         { params }),
  screenMarket: (params) => api.get('/screener/market',  { params }),
  filters:      ()       => api.get('/screener/filters'),
};

export default api;
