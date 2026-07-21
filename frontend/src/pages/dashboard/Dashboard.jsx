import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, riskApi } from '../../api';
import { usePortfolioStore } from '../../store';
import {
  ComposedChart, Area, Line, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign,
  ShieldAlert, BarChart2, Sparkles, Trophy, Layers,
} from 'lucide-react';
import { StatCard, PageHeader, Spinner } from '../../components/ui/components';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
const BENCHMARKS = ['SPY', 'QQQ', 'BTC', 'VTI'];
const PERIODS    = [
  { label: '1M',  days: 30  },
  { label: '3M',  days: 90  },
  { label: '6M',  days: 180 },
  { label: '1Y',  days: 365 },
];

function BenchmarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">
        {new Date(label).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' })}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span style={{ color: p.color }}>●</span>
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>
            {p.dataKey === 'portfolioReturn' || p.dataKey === 'benchmarkReturn'
              ? `${(p.value ?? 0) >= 0 ? '+' : ''}${(p.value ?? 0).toFixed(2)}%`
              : `$${(p.value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            }
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  // ─────────────────────────────────────────────────────────────────────────────
  // ALL hooks must be at the top — NO hooks after any conditional return
  // ─────────────────────────────────────────────────────────────────────────────
  const { activePortfolioId, setActivePortfolio } = usePortfolioStore();
  const [benchmark,  setBenchmark] = useState('SPY');
  const [showBench,  setShowBench] = useState(false);
  const [period,     setPeriod]    = useState(90);
  const [chartMode,  setChartMode] = useState('value');

  // 1. Overview (all portfolios)
  const { data: overview, isLoading: ovLoading, error: ovError } = useQuery({
    queryKey:  ['overview'],
    queryFn:   dashboardApi.overview,
    retry:     1,
    staleTime: 15_000,
  });

  const availablePortfolios = overview?.portfolios ?? [];
  const validPid = availablePortfolios.find(p => p.id === activePortfolioId)?.id
    ?? availablePortfolios[0]?.id
    ?? null;

  // Sync active portfolio id — must be in useEffect, never in render body
  useEffect(() => {
    if (validPid && validPid !== activePortfolioId) {
      setActivePortfolio(validPid);
    }
  }, [validPid, activePortfolioId, setActivePortfolio]);

  // 2. Summary
  const { data: summary, isLoading: sumLoading, error: sumError } = useQuery({
    queryKey:        ['summary', validPid],
    queryFn:         () => dashboardApi.summary(validPid),
    enabled:         !!validPid,
    retry:           1,
    staleTime:       15_000,
    refetchInterval: 60_000,
  });

  // 3. Allocation
  const { data: allocation } = useQuery({
    queryKey: ['allocation', validPid],
    queryFn:  () => dashboardApi.allocation(validPid),
    enabled:  !!validPid,
    staleTime: 30_000,
  });

  // 4. Risk
  const { data: risk } = useQuery({
    queryKey: ['risk', validPid],
    queryFn:  () => riskApi.get(validPid),
    enabled:  !!validPid,
    staleTime: 30_000,
  });

  // 5. Performance snapshots
  const { data: perf } = useQuery({
    queryKey: ['performance', validPid, period],
    queryFn:  () => dashboardApi.performance(validPid, period),
    enabled:  !!validPid,
    staleTime: 60_000,
  });

  // 6. Benchmark (only when user enables it)
  const { data: benchData } = useQuery({
    queryKey: ['benchmark', benchmark, period],
    queryFn:  () => dashboardApi.benchmark(benchmark, period),
    enabled:  showBench && !!validPid,
    staleTime: 5 * 60_000,
    retry:     0,
  });

  // 7. Chart data memo — must be here, before any returns
  const chartData = useMemo(() => {
    try {
      const snapshots   = perf?.snapshots   ?? [];
      const benchSeries = benchData?.series ?? [];
      if (snapshots.length === 0) return [];

      const benchMap = {};
      benchSeries.forEach(b => {
        benchMap[new Date(b.date).toISOString().split('T')[0]] = b.returnPct ?? 0;
      });

      const firstVal = snapshots[0]?.totalValue ?? 1;
      return snapshots.map(s => {
        const dateKey = new Date(s.date).toISOString().split('T')[0];
        const portfolioReturn = firstVal > 0
          ? +((s.totalValue - firstVal) / firstVal * 100).toFixed(2)
          : 0;
        return {
          date:            s.date,
          totalValue:      +(s.totalValue ?? 0).toFixed(2),
          portfolioReturn,
          benchmarkReturn: benchMap[dateKey] ?? null,
        };
      });
    } catch {
      return [];
    }
  }, [perf, benchData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Conditional renders — AFTER all hooks
  // ─────────────────────────────────────────────────────────────────────────────

  if (ovLoading) return <Spinner />;

  if (ovError) {
    return (
      <div className="p-8">
        <div className="card border-l-4 border-red-400 bg-red-50 max-w-lg">
          <h3 className="font-semibold text-red-700 mb-1">⚠️ No se puede conectar al servidor</h3>
          <p className="text-sm text-red-600 mb-2">
            Asegúrate de que el backend esté corriendo:
          </p>
          <code className="block bg-red-100 rounded px-3 py-2 text-xs text-red-700 mb-2">
            cd backend &amp;&amp; npm run dev
          </code>
          <p className="text-xs text-red-400">{ovError?.error ?? ovError?.message ?? String(ovError)}</p>
        </div>
      </div>
    );
  }

  if (!validPid) {
    return (
      <div className="p-8">
        <PageHeader title="Dashboard" subtitle="Bienvenido a Investment ERP" />
        <div className="card border-l-4 border-brand-500 bg-blue-50 max-w-lg">
          <h3 className="font-semibold text-brand-700 mb-1">🚀 Crea tu primer portafolio</h3>
          <p className="text-sm text-brand-600 mb-3">
            Ve a <strong>Portafolio</strong> y crea uno para empezar a registrar operaciones.
          </p>
          <Link to="/portfolio" className="btn-primary text-sm inline-flex">Ir a Portafolios →</Link>
        </div>
      </div>
    );
  }

  if (sumLoading || summary === undefined) return <Spinner />;

  if (sumError) {
    return (
      <div className="p-8">
        <PageHeader title="Dashboard" subtitle="Error al cargar datos" />
        <div className="card border-l-4 border-red-400 bg-red-50 max-w-lg">
          <p className="text-sm text-red-700">{sumError?.error ?? 'Error al cargar el portafolio.'}</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Safe data with fallbacks
  // ─────────────────────────────────────────────────────────────────────────────
  const totalValue  = summary?.totalValue  ?? 0;
  const totalCost   = summary?.totalCost   ?? 0;
  const totalPnL    = summary?.totalPnL    ?? 0;
  const totalPnLPct = summary?.totalPnLPct ?? 0;
  const pos         = totalPnL >= 0;

  // Grand total across ALL portfolios — provided directly by the overview endpoint
  const grandTotal = overview?.grandTotal ?? null;

  const portfolioReturn = chartData.length > 1
    ? (chartData[chartData.length - 1]?.portfolioReturn ?? 0)
    : 0;
  const benchmarkReturn = benchData?.totalReturn ?? 0;
  const alpha           = +((portfolioReturn) - (benchmarkReturn)).toFixed(2);
  const beatingMarket   = alpha >= 0;

  const fmt = (v) => (v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hasMultiple = availablePortfolios.length > 1;
  const isEmpty = totalValue === 0 && totalCost === 0;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={summary?.name ?? 'Mi Portafolio'}
        action={hasMultiple ? (
          <select
            className="input w-auto text-sm"
            value={validPid ?? ''}
            onChange={e => setActivePortfolio(e.target.value)}
          >
            {availablePortfolios.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : null}
      />

      {/* Empty state banner */}
      {isEmpty && (
        <div className="card border-l-4 border-brand-400 bg-blue-50">
          <h3 className="font-semibold text-brand-700 mb-1">📊 Portafolio vacío</h3>
          <p className="text-sm text-brand-600 mb-3">
            Aún no tienes operaciones registradas. Registra tu primera compra para ver el dashboard completo.
          </p>
          <Link to="/operations" className="btn-primary text-sm inline-flex">
            Registrar primera operación →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Valor Total"
          value={`$${fmt(totalValue)}`}
          sub={`Costo: $${fmt(totalCost)}`}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="P&L Total"
          value={`${pos ? '+' : ''}$${fmt(totalPnL)}`}
          sub={`${pos ? '+' : ''}${totalPnLPct.toFixed(2)}%`}
          trend={totalPnL}
          icon={pos ? TrendingUp : TrendingDown}
          color={pos ? 'green' : 'red'}
        />
        <StatCard
          title="Sharpe Ratio"
          value={risk?.sharpeRatio != null ? risk.sharpeRatio : '—'}
          sub="Retorno ajustado al riesgo"
          icon={ShieldAlert}
          color="yellow"
        />
        <StatCard
          title="Max Drawdown"
          value={risk?.drawdown != null ? `${risk.drawdown}%` : '—'}
          sub={`Volatilidad: ${risk?.volatility != null ? risk.volatility + '%' : '—'}`}
          icon={BarChart2}
          color="red"
        />
      </div>

      {/* Grand total across all portfolios — only when user has >1 portfolio */}
      {grandTotal != null && availablePortfolios.length > 1 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4 flex flex-wrap items-center gap-4">
          <Layers className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Total global — todos los portafolios</p>
            <p className="text-2xl font-bold text-indigo-700">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-3">
            {overview.portfolios.map(p => (
              <div key={p.id} className="text-center">
                <p className="text-xs text-indigo-400">{p.name}</p>
                <p className="font-semibold text-indigo-700">${(p.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benchmark banner */}
      {showBench && benchData && chartData.length > 0 && (
        <div className={clsx(
          'rounded-xl border px-5 py-4 flex flex-wrap gap-4 items-center',
          beatingMarket ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        )}>
          <Trophy className={clsx('w-5 h-5 flex-shrink-0', beatingMarket ? 'text-green-600' : 'text-red-500')} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Portafolio vs {benchmark}
            </p>
            <p className="font-bold text-gray-900">
              {beatingMarket ? '✅ Le estás ganando al mercado' : '⚠️ El mercado te está ganando'}
            </p>
          </div>
          <div className="flex gap-6 ml-auto flex-wrap">
            <div className="text-center">
              <p className="text-xs text-gray-500">Mi portafolio</p>
              <p className={clsx('text-xl font-bold', portfolioReturn >= 0 ? 'text-green-600' : 'text-red-500')}>
                {portfolioReturn >= 0 ? '+' : ''}{portfolioReturn.toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">{benchmark}</p>
              <p className={clsx('text-xl font-bold', benchmarkReturn >= 0 ? 'text-green-600' : 'text-red-500')}>
                {benchmarkReturn >= 0 ? '+' : ''}{benchmarkReturn.toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Alpha</p>
              <p className={clsx('text-xl font-bold', beatingMarket ? 'text-green-600' : 'text-red-500')}>
                {beatingMarket ? '+' : ''}{alpha}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top holdings by weight (from allocation) */}
      {allocation?.byAsset?.length > 0 && (() => {
        const sorted   = [...allocation.byAsset].sort((a, b) => b.pct - a.pct);
        const topItems = sorted.slice(0, 5);
        return (
          <div className="card">
            <p className="text-sm font-semibold text-gray-700 mb-3">📊 Mayores posiciones por peso</p>
            <div className="space-y-2">
              {topItems.map((h, i) => (
                <div key={h.symbol} className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}>
                    {i + 1}
                  </span>
                  <Link to={`/analysis?symbol=${h.symbol}`}
                    className="font-semibold text-gray-800 hover:text-brand-600 transition-colors w-16 flex-shrink-0">
                    {h.symbol}
                  </Link>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${h.pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                  <span className="font-semibold text-gray-700 w-10 text-right">{h.pct}%</span>
                  <span className="text-gray-400 w-20 text-right">${(h.value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Performance chart */}
        <div className="card col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="font-semibold text-gray-700">
              Rendimiento {period === 30 ? '1 mes' : period === 90 ? '3 meses' : period === 180 ? '6 meses' : '1 año'}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1">
                {PERIODS.map(p => (
                  <button key={p.days} onClick={() => setPeriod(p.days)}
                    className={clsx('px-2.5 py-1 text-xs rounded-full border transition-colors',
                      period === p.days
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'border-gray-300 text-gray-600 hover:border-brand-400'
                    )}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {['value', 'return'].map(m => (
                  <button key={m} onClick={() => setChartMode(m)}
                    className={clsx('px-2.5 py-1 text-xs rounded-full border transition-colors',
                      chartMode === m
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'border-gray-300 text-gray-600'
                    )}>
                    {m === 'value' ? '$ Valor' : '% Retorno'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowBench(v => !v)}
                  className={clsx('px-2.5 py-1 text-xs rounded-full border transition-colors',
                    showBench
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'border-gray-300 text-gray-600'
                  )}>
                  {showBench ? 'Benchmark ✓' : 'Benchmark'}
                </button>
                {showBench && (
                  <select
                    value={benchmark}
                    onChange={e => setBenchmark(e.target.value)}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {BENCHMARKS.map(b => <option key={b}>{b}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-gray-400 text-sm gap-1">
              <span>Sin datos de rendimiento todavía</span>
              <span className="text-xs text-gray-300">Agrega operaciones para ver la evolución de tu portafolio</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={d => new Date(d).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={chartMode === 'value'
                    ? v => `$${(v / 1000).toFixed(0)}k`
                    : v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`
                  }
                />
                {chartMode === 'return' && <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />}
                <Tooltip content={<BenchmarkTooltip />} />
                <Legend
                  formatter={value => {
                    const map = { portfolioReturn: 'Mi portafolio', totalValue: 'Valor ($)', benchmarkReturn: benchmark };
                    return map[value] ?? value;
                  }}
                />
                {chartMode === 'value' ? (
                  <Area type="monotone" dataKey="totalValue" stroke="#3b82f6" strokeWidth={2}
                    fill="url(#gradPortfolio)" name="totalValue" dot={false} />
                ) : (
                  <Line type="monotone" dataKey="portfolioReturn" stroke="#3b82f6" strokeWidth={2.5}
                    name="portfolioReturn" dot={false} activeDot={{ r: 4 }} />
                )}
                {showBench && chartMode === 'return' && (
                  <Line type="monotone" dataKey="benchmarkReturn" stroke="#f59e0b" strokeWidth={2}
                    strokeDasharray="6 3" name="benchmarkReturn" dot={false} connectNulls />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Allocation pie */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">Distribución de activos</h3>
          {allocation?.byType?.length ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={allocation.byType} dataKey="pct" nameKey="type"
                    cx="50%" cy="50%" outerRadius={72} innerRadius={32}>
                    {allocation.byType.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => [`${v}%`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {allocation.byType.map((t, i) => (
                  <div key={t.type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600">{t.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">${(t.value ?? 0).toLocaleString()}</span>
                      <span className="font-semibold text-gray-700">{t.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Sin holdings todavía</p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/portfolio',  icon: TrendingUp, label: 'Ver Portafolio',   color: 'text-brand-600' },
          { to: '/operations', icon: DollarSign, label: 'Nueva Operación',  color: 'text-green-600' },
          { to: '/analysis',   icon: BarChart2,  label: 'Análisis Técnico', color: 'text-yellow-600' },
          { to: '/ai',         icon: Sparkles,   label: 'IA Insights',      color: 'text-purple-600' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}
            className="card flex items-center gap-3 hover:border-brand-300 transition-colors group">
            <Icon className={`w-5 h-5 ${color} group-hover:scale-110 transition-transform`} />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
