import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import Layout from './components/ui/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/dashboard/Dashboard';
import Portfolio from './pages/portfolio/Portfolio';
import PortfolioDetail from './pages/portfolio/PortfolioDetail';
import Rebalance from './pages/portfolio/Rebalance';
import Operations from './pages/operations/Operations';
import Risk from './pages/risk/Risk';
import Analysis from './pages/analysis/Analysis';
import PositionCalculator from './pages/analysis/PositionCalculator';
import AiPage from './pages/ai/AiPage';
import Settings from './pages/settings/Settings';
import Watchlist from './pages/watchlist/Watchlist';
import Screener from './pages/screener/Screener';

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"              element={<Dashboard />} />
        <Route path="portfolio"              element={<Portfolio />} />
        <Route path="portfolio/:id"          element={<PortfolioDetail />} />
        <Route path="rebalance"              element={<Rebalance />} />
        <Route path="rebalance/:id"          element={<Rebalance />} />
        <Route path="operations"             element={<Operations />} />
        <Route path="risk"                   element={<Risk />} />
        <Route path="analysis"               element={<Analysis />} />
        <Route path="calculator"             element={<PositionCalculator />} />
        <Route path="ai"                     element={<AiPage />} />
        <Route path="settings"               element={<Settings />} />
        <Route path="watchlist"              element={<Watchlist />} />
        <Route path="screener"               element={<Screener />} />
      </Route>
    </Routes>
  );
}
