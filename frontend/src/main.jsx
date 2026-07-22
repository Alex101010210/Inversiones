// ─────────────────────────────────────────────────────────────────────────────
// Punto de entrada del frontend React.
// Configura:
//   - React Query (caché de datos del servidor con staleTime 30 s)
//   - BrowserRouter (enrutamiento del lado del cliente)
//   - ErrorBoundary (captura errores en el árbol de componentes y muestra
//     una pantalla de error en lugar de una página en blanco)
//   - Tema (aplica modo oscuro/claro antes del primer render para evitar
//     el "flash" de tema incorrecto)
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { useThemeStore } from './store';

// Aplicar la clase dark/light al <html> antes del primer pintado para evitar flash
useThemeStore.getState().initTheme();

// Configuración global de React Query:
// - staleTime 30s: los datos se consideran frescos por 30 segundos antes de refetchar
// - retry 1: en caso de error solo reintenta una vez
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// ─── Error Boundary ───────────────────────────────────────────────────────────
// Captura errores en tiempo de render y muestra un mensaje amigable con
// el detalle del error en lugar de dejar la pantalla en blanco.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ color: '#b91c1c', marginBottom: 8 }}>⚠️ Error en la aplicación</h2>
          <pre style={{
            background: '#fef2f2', border: '1px solid #fca5a5',
            padding: 12, borderRadius: 8, fontSize: 12,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#7f1d1d',
          }}>
            {this.state.error?.message ?? String(this.state.error)}
            {'\n\n'}
            {this.state.error?.stack ?? ''}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              marginTop: 16, padding: '8px 16px', background: '#1d4ed8',
              color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer',
            }}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
