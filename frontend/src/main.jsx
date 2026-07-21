import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { useThemeStore } from './store';

// Apply saved dark-mode class before first paint
useThemeStore.getState().initTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// Simple error boundary — shows the error instead of a blank page
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
