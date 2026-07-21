import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { riskApi, portfolioApi } from '../../api';
import { Link } from 'react-router-dom';
import { usePortfolioStore } from '../../store';
import { PageHeader, Spinner, StatCard } from '../../components/ui/components';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { ShieldAlert, TrendingDown, Activity, BarChart2 } from 'lucide-react';

export default function Risk() {
  const { activePortfolioId, setActivePortfolio } = usePortfolioStore();

  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: portfolioApi.list });
  const firstId   = portfolios[0]?.id;
  // Sync with global store: use store value if valid, else first portfolio
  const activePid = portfolios.find(p => p.id === activePortfolioId)?.id ?? firstId;

  const { data: risk, isLoading: rLoading } = useQuery({
    queryKey: ['risk', activePid],
    queryFn: () => riskApi.get(activePid),
    enabled: !!activePid,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['riskHistory', activePid],
    queryFn: () => riskApi.history(activePid, 90),
    enabled: !!activePid,
  });

  if (rLoading) return <Spinner />;

  // Radar data for relative risk metrics (normalised 0-100)
  const radarData = risk ? [
    { metric: 'Drawdown',   value: Math.min(risk.drawdown * 2, 100) },
    { metric: 'Volatility', value: Math.min(risk.volatility, 100) },
    { metric: 'Sharpe',     value: Math.min(Math.max(risk.sharpeRatio * 20, 0), 100) },
    { metric: 'VaR 95%',    value: Math.min(Math.abs(risk.var95) * 5, 100) },
  ] : [];

  const getSharpeBadge = (s) => {
    if (s >= 2)   return { label: 'Excellent', color: 'text-success' };
    if (s >= 1)   return { label: 'Good',      color: 'text-brand-600' };
    if (s >= 0)   return { label: 'Adequate',  color: 'text-warn' };
    return              { label: 'Poor',       color: 'text-danger' };
  };
  const sharpeBadge = risk ? getSharpeBadge(risk.sharpeRatio) : {};

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <PageHeader title="Análisis de Riesgo" subtitle="Drawdown · Volatilidad · Sharpe Ratio · VaR" />
        <select
          className="input w-48"
          value={activePid ?? ''}
          onChange={(e) => setActivePortfolio(e.target.value)}
        >
          {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Max Drawdown"   value={risk ? `${risk.drawdown}%`    : '—'} sub="Caída máxima pico-valle"           icon={TrendingDown} color="red" />
        <StatCard title="Volatilidad"    value={risk ? `${risk.volatility}%`  : '—'} sub="Ventana 90 días anualizada"         icon={Activity}     color="yellow" />
        <StatCard title="Sharpe Ratio"   value={risk ? risk.sharpeRatio       : '—'} sub={sharpeBadge.label ?? ''}            icon={ShieldAlert}  color="blue" />
        <StatCard title="VaR (95%)"      value={risk ? `${risk.var95}%`       : '—'} sub="Pérdida máx. esperada en 1 día"     icon={BarChart2}    color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Perfil de Riesgo</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
              <Radar name="Risk" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Drawdown history */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Historial Drawdown (90 días)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`]} />
              <ReferenceLine y={0} stroke="#e5e7eb" />
              <Line type="monotone" dataKey="drawdown"   stroke="#ef4444" strokeWidth={2} dot={false} name="Drawdown %" />
              <Line type="monotone" dataKey="volatility" stroke="#f59e0b" strokeWidth={2} dot={false} name="Volatility %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rebalanceo link */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-700 text-sm">¿Quieres rebalancear tu portafolio?</p>
          <p className="text-xs text-gray-400">Define tu asignación objetivo y ve exactamente qué comprar o vender.</p>
        </div>
        <Link to="/rebalance" className="btn-primary text-sm whitespace-nowrap ml-4">Ir a Rebalanceo →</Link>
      </div>

      {/* Interpretation guide */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">Guía de Interpretación</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Sharpe Ratio</h4>
            <ul className="text-gray-500 space-y-0.5">
              <li><span className="text-success font-medium">&gt; 2.0</span> — Excelente</li>
              <li><span className="text-brand-600 font-medium">1.0–2.0</span> — Bueno</li>
              <li><span className="text-warn font-medium">0.0–1.0</span> — Aceptable</li>
              <li><span className="text-danger font-medium">&lt; 0.0</span> — Deficiente</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Max Drawdown</h4>
            <ul className="text-gray-500 space-y-0.5">
              <li><span className="text-success font-medium">&lt; 10%</span> — Riesgo bajo</li>
              <li><span className="text-warn font-medium">10–20%</span> — Moderado</li>
              <li><span className="text-danger font-medium">&gt; 20%</span> — Riesgo alto</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">VaR 95%</h4>
            <p className="text-gray-500">Pérdida máxima esperada en un día con 95% de confianza. Menor es mejor.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
