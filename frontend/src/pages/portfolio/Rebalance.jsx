/**
 * Rebalance page — define target allocation and see buy/sell recommendations
 * to reach it. Accessible from Portfolio detail or directly via /rebalance/:id
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portfolioApi } from '../../api';
import { PageHeader, Spinner, PnLBadge } from '../../components/ui/components';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { useParams, Link } from 'react-router-dom';

const ASSET_TYPES = ['STOCK', 'ETF', 'CRYPTO', 'BOND', 'COMMODITY'];
const COLORS = { STOCK: '#3b82f6', ETF: '#8b5cf6', CRYPTO: '#f59e0b', BOND: '#10b981', COMMODITY: '#ef4444' };

function PieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  let cumAngle = -90;
  const r = 60;
  const cx = 80, cy = 80;

  const slices = data.map(d => {
    const angle = (d.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const rad = (a) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(startAngle + angle));
    const y2 = cy + r * Math.sin(rad(startAngle + angle));
    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...d, path };
  });

  return (
    <svg width="160" height="160" className="flex-shrink-0">
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={COLORS[s.type] ?? '#94a3b8'} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.5} fill="white" />
    </svg>
  );
}

export default function Rebalance() {
  const { id } = useParams();

  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: portfolioApi.list });
  const [selectedId, setSelectedId] = useState(id ?? '');
  const activePid = selectedId || portfolios[0]?.id;

  const { data: holdings = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['holdings', activePid],
    queryFn:  () => portfolioApi.holdings(activePid),
    enabled:  !!activePid,
  });

  // Build actual allocation by type
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const actualByType = useMemo(() => {
    const map = {};
    holdings.forEach(h => {
      map[h.asset.type] = (map[h.asset.type] ?? 0) + h.currentValue;
    });
    return Object.fromEntries(
      Object.entries(map).map(([type, val]) => [type, { value: val, pct: totalValue > 0 ? (val / totalValue) * 100 : 0 }])
    );
  }, [holdings, totalValue]);

  // Target allocation state (default: mirror current)
  const [targets, setTargets] = useState({});

  const getTarget = (type) => targets[type] ?? (actualByType[type]?.pct?.toFixed(1) ?? '0');

  const targetTotal = ASSET_TYPES.reduce((s, t) => s + (+getTarget(t) || 0), 0);
  const targetOk    = Math.abs(targetTotal - 100) < 0.5;

  // Compute needed trades
  const trades = useMemo(() => {
    if (!targetOk || totalValue === 0) return [];
    return ASSET_TYPES.flatMap(type => {
      const targetVal  = (+(getTarget(type) || 0) / 100) * totalValue;
      const actualVal  = actualByType[type]?.value ?? 0;
      const diff       = targetVal - actualVal;
      if (Math.abs(diff) < 1) return [];
      return [{ type, targetVal, actualVal, diff }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, actualByType, totalValue, targetOk]);

  const pieData = ASSET_TYPES
    .filter(t => +getTarget(t) > 0)
    .map(t => ({ type: t, value: +getTarget(t) }));

  if (isLoading) return <Spinner />;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <PageHeader title="Rebalanceo de Portafolio" subtitle="Define tu asignación objetivo y ve qué necesitas comprar o vender" />
        <div className="flex items-center gap-2">
          <select className="input w-48" value={activePid} onChange={e => setSelectedId(e.target.value)}>
            {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn-secondary flex items-center gap-1.5" onClick={() => refetch()}>
            <RefreshCw className={clsx('w-4 h-4', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Target input ─────────────────────────────────────────────── */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Asignación objetivo</h3>
          <div className="space-y-3">
            {ASSET_TYPES.map(type => (
              <div key={type} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[type] ?? '#94a3b8' }} />
                <span className="text-sm font-medium text-gray-700 w-24">{type}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min(+getTarget(type) || 0, 100)}%`,
                    background: COLORS[type] ?? '#94a3b8',
                  }} />
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" max="100" step="0.5"
                    className="input w-20 text-right"
                    value={getTarget(type)}
                    onChange={e => setTargets(t => ({ ...t, [type]: e.target.value }))}
                  />
                  <span className="text-gray-500 text-sm">%</span>
                </div>
                <span className="text-xs text-gray-400 w-14 text-right">
                  actual {(actualByType[type]?.pct ?? 0).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          <div className={clsx('mt-4 text-sm font-semibold text-right', targetOk ? 'text-success' : 'text-danger')}>
            Total: {targetTotal.toFixed(1)}% {targetOk ? '✓' : `— faltan ${(100 - targetTotal).toFixed(1)}%`}
          </div>
        </div>

        {/* ── Pie chart target ─────────────────────────────────────────── */}
        <div className="card flex flex-col items-center justify-center gap-4">
          <h3 className="font-semibold text-gray-700 self-start">Distribución objetivo</h3>
          <div className="flex items-center gap-8">
            <PieChart data={pieData} />
            <div className="space-y-2">
              {pieData.map(d => (
                <div key={d.type} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[d.type] }} />
                  <span className="text-gray-600">{d.type}</span>
                  <span className="font-semibold text-gray-800">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Trade suggestions ───────────────────────────────────────────── */}
      {targetOk && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">
            Operaciones sugeridas
            <span className="ml-2 text-xs font-normal text-gray-400">basado en valor total ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </h3>
          {trades.length === 0 ? (
            <p className="text-sm text-success font-medium text-center py-6">✅ Tu portafolio ya coincide con la asignación objetivo.</p>
          ) : (
            <div className="space-y-3">
              {trades.map(t => (
                <div key={t.type} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[t.type] }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{t.type}</span>
                      {t.diff > 0
                        ? <span className="badge badge-green flex items-center gap-1"><TrendingUp className="w-3 h-3" /> COMPRAR</span>
                        : <span className="badge badge-red flex items-center gap-1"><TrendingDown className="w-3 h-3" /> VENDER</span>
                      }
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Actual: ${t.actualVal.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({(t.actualVal / totalValue * 100).toFixed(1)}%)
                      &nbsp;→&nbsp;
                      Objetivo: ${t.targetVal.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({(t.targetVal / totalValue * 100).toFixed(1)}%)
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={clsx('font-bold text-lg', t.diff > 0 ? 'text-success' : 'text-danger')}>
                      {t.diff > 0 ? '+' : ''}{t.diff.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {holdings.length === 0 && (
        <div className="card text-center py-10 text-gray-400 text-sm">
          Este portafolio no tiene holdings. <Link to="/operations" className="text-brand-600 underline">Agrega operaciones</Link> primero.
        </div>
      )}
    </div>
  );
}
