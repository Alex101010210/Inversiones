import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, ArrowLeftRight,
  ShieldAlert, BarChart2, Sparkles, LogOut, TrendingUp,
  Settings, ChevronDown, Eye, Search, Moon, Sun, Menu, X, Calculator, Scale
} from 'lucide-react';
import { useAuthStore, usePortfolioStore, useThemeStore } from '../../store';
import { useQuery } from '@tanstack/react-query';
import { portfolioApi } from '../../api';
import { useLivePrices } from '../../hooks/useLivePrices';
import { useState } from 'react';
import clsx from 'clsx';
import AlertToastContainer from '../ui/AlertToastContainer';

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/portfolio',  icon: Briefcase,        label: 'Portafolio' },
  { to: '/rebalance',  icon: Scale,            label: 'Rebalanceo' },
  { to: '/operations', icon: ArrowLeftRight,   label: 'Operaciones' },
  { to: '/risk',       icon: ShieldAlert,      label: 'Riesgo' },
  { to: '/analysis',   icon: BarChart2,        label: 'Análisis Técnico' },
  { to: '/calculator', icon: Calculator,       label: 'Calculadora' },
  { to: '/ai',         icon: Sparkles,         label: 'IA Insights' },
  { to: '/watchlist',  icon: Eye,              label: 'Watchlist' },
  { to: '/screener',   icon: Search,           label: 'Screener' },
];

function PortfolioSelector() {
  const { activePortfolioId, setActivePortfolio } = usePortfolioStore();
  const [open, setOpen] = useState(false);

  const { data: portfolios = [] } = useQuery({
    queryKey: ['portfolios'],
    queryFn:  portfolioApi.list,
  });

  const active = portfolios.find(p => p.id === activePortfolioId) ?? portfolios[0];

  if (portfolios.length === 0) return null;

  if (!activePortfolioId && portfolios[0]) {
    setActivePortfolio(portfolios[0].id);
  }

  return (
    <div className="px-3 mb-2 relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Briefcase className="w-3.5 h-3.5 text-blue-200 flex-shrink-0" />
          <span className="truncate text-white font-medium">{active?.name ?? 'Portafolio'}</span>
        </div>
        <ChevronDown className={clsx('w-3.5 h-3.5 text-blue-200 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {portfolios.map(p => (
            <button
              key={p.id}
              onClick={() => { setActivePortfolio(p.id); setOpen(false); }}
              className={clsx(
                'w-full text-left px-3 py-2.5 text-sm transition-colors',
                p.id === (activePortfolioId ?? portfolios[0]?.id)
                  ? 'bg-brand-50 text-brand-700 font-semibold dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {p.name}
              <span className="text-xs text-gray-400 ml-1">({p._count?.holdings ?? 0} holdings)</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, clearAuth } = useAuthStore();
  const { dark, toggleDark } = useThemeStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useLivePrices(30_000);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-brand-100" />
          <span className="font-bold text-lg tracking-tight">Investment ERP</span>
        </div>
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          title={dark ? 'Modo claro' : 'Modo oscuro'}
          className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Portfolio selector */}
      <div className="pt-3 border-b border-white/10 pb-3">
        <p className="px-6 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">Portafolio activo</p>
        <PortfolioSelector />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-blue-100 hover:bg-white/10'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-blue-200 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <NavLink
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg transition-colors flex-1 justify-center ${
                isActive ? 'bg-brand-600 text-white' : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`
            }
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex-1 justify-center"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-brand-900 text-white flex-col shadow-xl flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar drawer */}
      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 bg-brand-900 text-white flex flex-col shadow-xl z-50 transition-transform duration-200 md:hidden',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 text-blue-200 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-brand-900 text-white shadow">
          <button onClick={() => setSidebarOpen(true)} className="text-blue-200 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <TrendingUp className="w-5 h-5 text-brand-100" />
          <span className="font-bold text-sm">Investment ERP</span>
          <div className="flex-1" />
          <button onClick={toggleDark} className="text-blue-200 hover:text-white">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>

      {/* Global alert notifications */}
      <AlertToastContainer />
    </div>
  );
}
