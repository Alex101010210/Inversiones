import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { screenerApi, analysisApi, assetApi } from '../../api';
import { PageHeader, Spinner } from '../../components/ui/components';
import {
  SlidersHorizontal, TrendingUp, TrendingDown, Minus,
  RefreshCw, Globe, Database, X, ChevronUp, ChevronDown,
  BarChart2, ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router-dom';

const ASSET_TYPES    = ['STOCK', 'ETF', 'CRYPTO', 'BOND', 'COMMODITY'];
const SIGNALS        = ['BUY', 'SELL', 'HOLD'];
const SECTORS_MARKET = [
  'Technology', 'Finance', 'Healthcare', 'Consumer Discretionary',
  'Consumer Staples', 'Energy', 'Communication Services', 'Broad Market',
  'Crypto', 'Commodity', 'Fixed Income', 'Real Estate', 'Emerging Markets',
];

function SignalBadge({ signal }) {
  if (signal === 'BUY')  return <span className="badge badge-green flex items-center gap-1"><TrendingUp className="w-3 h-3" /> BUY</span>;
  if (signal === 'SELL') return <span className="badge badge-red flex items-center gap-1"><TrendingDown className="w-3 h-3" /> SELL</span>;
  if (signal === 'HOLD') return <span className="badge badge-yellow flex items-center gap-1"><Minus className="w-3 h-3" /> HOLD</span>;
  return <span className="badge badge-blue">{signal ?? 'N/A'}</span>;
}

function ChangePct({ value }) {
  if (value === null || value === undefined) return <span className="text-gray-400">—</span>;
  const positive = value >= 0;
  return (
    <span className={clsx('font-mono font-medium', positive ? 'text-green-600' : 'text-red-500')}>
      {positive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────────────
function SortTh({ label, field, sortBy, setSortBy, sortDir, setSortDir, className = 'text-right' }) {
  const active = sortBy === field;
  const toggle = () => {
    if (active) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };
  return (
    <th className={clsx('py-3 px-3 font-medium text-gray-500 cursor-pointer select-none hover:text-brand-600 whitespace-nowrap', className)}
      onClick={toggle}>
      {label}
      {active
        ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1 text-brand-600" /> : <ChevronDown className="w-3 h-3 inline ml-1 text-brand-600" />)
        : <ChevronUp className="w-3 h-3 inline ml-1 text-gray-300" />
      }
    </th>
  );
}

// ── Detail side panel ─────────────────────────────────────────────────────────
function AssetDetailPanel({ asset, onClose }) {
  const navigate = useNavigate();
  const { data: full, isLoading } = useQuery({
    queryKey: ['analysis-full', asset.symbol],
    queryFn:  () => analysisApi.full(asset.symbol),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-bold text-xl text-gray-900 dark:text-white">{asset.symbol}</h2>
            <p className="text-xs text-gray-400 truncate max-w-[200px]">{asset.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Price + signal */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Precio</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${asset.price != null ? asset.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-1">Señal TA</p>
            <SignalBadge signal={asset.signal} />
          </div>
        </div>

        {/* Change % */}
        <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">7 días</p>
            <ChangePct value={asset.change7d} />
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">30 días</p>
            <ChangePct value={asset.change30d} />
          </div>
        </div>

        {/* Technical indicators */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Indicadores técnicos</p>
          {isLoading ? (
            <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'RSI (14)',  value: asset.rsi, colorFn: v => v < 30 ? 'text-green-600' : v > 70 ? 'text-red-500' : 'text-gray-700' },
                { label: 'MACD',     value: asset.macd, colorFn: v => v > 0 ? 'text-green-600' : 'text-red-500', fmt: v => (v > 0 ? '+' : '') + v },
                { label: 'SMA 20',   value: asset.sma20 ? `$${asset.sma20.toFixed(2)}` : null },
                { label: 'SMA 50',   value: asset.sma50 ? `$${asset.sma50.toFixed(2)}` : null },
                { label: 'EMA 12',   value: full?.ema12 ? `$${full.ema12}` : null },
                { label: 'EMA 26',   value: full?.ema26 ? `$${full.ema26}` : null },
              ].map(({ label, value, colorFn, fmt }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className={clsx('font-semibold', colorFn ? colorFn(value) : 'text-gray-700 dark:text-gray-200')}>
                    {value != null ? (fmt ? fmt(value) : value) : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sector / type */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex gap-4 text-sm">
          <div><p className="text-xs text-gray-400">Tipo</p><p className="font-medium text-gray-700 dark:text-gray-200">{asset.type}</p></div>
          {asset.sector && <div><p className="text-xs text-gray-400">Sector</p><p className="font-medium text-gray-700 dark:text-gray-200">{asset.sector}</p></div>}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 space-y-2 mt-auto">
          <Link
            to={`/analysis?symbol=${asset.symbol}`}
            className="flex items-center justify-center gap-2 w-full btn-secondary text-sm"
            onClick={onClose}
          >
            <BarChart2 className="w-4 h-4" /> Ver análisis técnico completo
          </Link>
          <button
            onClick={() => { onClose(); navigate('/operations', { state: { prefill: { assetSymbol: asset.symbol } } }); }}
            className="flex items-center justify-center gap-2 w-full btn-primary text-sm"
          >
            <ExternalLink className="w-4 h-4" /> Registrar operación
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Screener() {
  const [mode,        setMode]        = useState('market');
  const [filters,     setFilters]     = useState({ type: '', sector: '', rsiMin: '', rsiMax: '', signal: '', priceMin: '', priceMax: '' });
  const [search,      setSearch]      = useState('');
  const [applied,     setApplied]     = useState({});
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy,      setSortBy]      = useState('symbol');
  const [sortDir,     setSortDir]     = useState('asc');
  const [selected,    setSelected]    = useState(null);

  const { data: options } = useQuery({ queryKey: ['screener-filters'], queryFn: screenerApi.filters, staleTime: 5 * 60_000 });

  const { data: marketData, isLoading: marketLoading, isFetching: marketFetching, refetch: refetchMarket } = useQuery({
    queryKey: ['screener-market', applied],
    queryFn:  () => screenerApi.screenMarket({ ...applied, sortBy, sortDir }),
    staleTime: 5 * 60_000,
    enabled:  mode === 'market',
  });

  const { data: portfolioData, isLoading: portfolioLoading, isFetching: portfolioFetching, refetch: refetchPortfolio } = useQuery({
    queryKey: ['screener', applied],
    queryFn:  () => screenerApi.screen({ ...applied, sortBy, sortDir }),
    staleTime: 60_000,
    enabled:  mode === 'portfolio',
  });

  const data       = mode === 'market' ? marketData : portfolioData;
  const isLoading  = mode === 'market' ? marketLoading  : portfolioLoading;
  const isFetching = mode === 'market' ? marketFetching : portfolioFetching;
  const refetch    = mode === 'market' ? refetchMarket  : refetchPortfolio;

  // Client-side sort + search
  const assets = (() => {
    let list = data?.assets ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a => a.symbol.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q));
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = a[sortBy] ?? (typeof a[sortBy] === 'string' ? '' : -Infinity);
      const vb = b[sortBy] ?? (typeof b[sortBy] === 'string' ? '' : -Infinity);
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });
  })();

  const applyFilters = () => {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    setApplied(clean);
  };
  const resetFilters = () => {
    setFilters({ type: '', sector: '', rsiMin: '', rsiMax: '', signal: '', priceMin: '', priceMax: '' });
    setApplied({});
  };

  const activeCount = Object.values(applied).filter(Boolean).length;
  const sectors     = mode === 'market' ? SECTORS_MARKET : (options?.sectors ?? []);

  const sortProps = { sortBy, setSortBy, sortDir, setSortDir };

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Screener de Activos"
        subtitle="Analiza activos del mercado con indicadores técnicos en tiempo real"
        action={
          <div className="flex gap-2 flex-wrap">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => setMode('market')}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === 'market' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
                <Globe className="w-3.5 h-3.5" /> Mercado
              </button>
              <button onClick={() => setMode('portfolio')}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === 'portfolio' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
                <Database className="w-3.5 h-3.5" /> Mi portafolio
              </button>
            </div>
            <button className="btn-secondary flex items-center gap-1.5" onClick={() => setShowFilters(s => !s)}>
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {activeCount > 0 && (
                <span className="ml-1 bg-brand-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>
              )}
            </button>
            <button className="btn-secondary flex items-center gap-1.5" onClick={() => refetch()}>
              <RefreshCw className={clsx('w-4 h-4', isFetching && 'animate-spin')} />
              Actualizar
            </button>
          </div>
        }
      />

      {/* Mode hint */}
      {mode === 'market' ? (
        <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
          <span><strong>Modo Mercado:</strong> ~40 activos populares con precios reales de Yahoo Finance. Haz click en una fila para ver el análisis completo.</span>
        </div>
      ) : (
        <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
          <Database className="w-3.5 h-3.5 flex-shrink-0" />
          <span><strong>Modo Portafolio:</strong> activos de tu portafolio con historial de precios registrado.</span>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                <option value="">Todos</option>
                {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sector</label>
              <select className="input" value={filters.sector} onChange={e => setFilters(f => ({ ...f, sector: e.target.value }))}>
                <option value="">Todos</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Señal TA</label>
              <select className="input" value={filters.signal} onChange={e => setFilters(f => ({ ...f, signal: e.target.value }))}>
                <option value="">Todas</option>
                {SIGNALS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">RSI entre</label>
              <div className="flex gap-2 items-center">
                <input className="input" type="number" placeholder="Min" min="0" max="100"
                  value={filters.rsiMin} onChange={e => setFilters(f => ({ ...f, rsiMin: e.target.value }))} />
                <span className="text-gray-400 text-sm">–</span>
                <input className="input" type="number" placeholder="Max" min="0" max="100"
                  value={filters.rsiMax} onChange={e => setFilters(f => ({ ...f, rsiMax: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Precio mínimo ($)</label>
              <input className="input" type="number" placeholder="0"
                value={filters.priceMin} onChange={e => setFilters(f => ({ ...f, priceMin: e.target.value }))} />
            </div>
            <div>
              <label className="label">Precio máximo ($)</label>
              <input className="input" type="number" placeholder="∞"
                value={filters.priceMax} onChange={e => setFilters(f => ({ ...f, priceMax: e.target.value }))} />
            </div>
            <div className="flex items-end gap-2 col-span-2">
              <button className="btn-primary flex-1" onClick={applyFilters}>Aplicar filtros</button>
              <button className="btn-secondary" onClick={resetFilters}>Limpiar</button>
            </div>
          </div>
        </div>
      )}

      {/* Live search */}
      <div className="flex items-center gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Buscar símbolo o nombre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <p className="text-sm text-gray-500">
          {assets.length} activos
          {isFetching && <span className="ml-2 text-xs text-brand-500">actualizando…</span>}
        </p>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner />
          {mode === 'market' && <p className="text-sm text-gray-400">Obteniendo datos en tiempo real de Yahoo Finance…</p>}
        </div>
      ) : assets.length === 0 ? (
        <div className="card text-center py-16">
          <SlidersHorizontal className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Sin resultados</p>
          {mode === 'market'
            ? <p className="text-gray-400 text-sm mt-1">Ajusta los filtros o la búsqueda.</p>
            : <p className="text-gray-400 text-sm mt-1">Agrega operaciones o cambia a modo <strong>Mercado</strong>.</p>
          }
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table>
            <thead>
              <tr>
                <SortTh label="Símbolo"  field="symbol"   {...sortProps} className="text-left" />
                <th className="text-left py-3 px-3 font-medium text-gray-500">Nombre</th>
                <th className="text-center py-3 px-3 font-medium text-gray-500">Tipo</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Sector</th>
                <SortTh label="Precio"   field="price"    {...sortProps} />
                <SortTh label="RSI"      field="rsi"      {...sortProps} />
                <SortTh label="MACD"     field="macd"     {...sortProps} />
                <th className="text-right py-3 px-3 font-medium text-gray-500">SMA20</th>
                <SortTh label="Señal"    field="signal"   {...sortProps} className="text-center" />
                <SortTh label="7d"       field="change7d"  {...sortProps} />
                <SortTh label="30d"      field="change30d" {...sortProps} />
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr
                  key={a.id ?? a.symbol}
                  className="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  onClick={() => setSelected(a)}
                >
                  <td className="font-bold text-brand-600 py-3 px-3">{a.symbol}</td>
                  <td className="max-w-[160px] truncate text-gray-600 py-3 px-3">{a.name}</td>
                  <td className="text-center py-3 px-3"><span className="badge badge-blue text-xs">{a.type}</span></td>
                  <td className="text-gray-500 text-xs py-3 px-3">{a.sector ?? '—'}</td>
                  <td className="text-right font-mono font-semibold py-3 px-3">
                    ${a.price != null ? a.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className={clsx('text-right font-mono font-semibold py-3 px-3',
                    a.rsi === null ? 'text-gray-400' : a.rsi < 30 ? 'text-green-600' : a.rsi > 70 ? 'text-red-500' : 'text-gray-700')}>
                    {a.rsi ?? '—'}
                  </td>
                  <td className={clsx('text-right font-mono text-xs py-3 px-3',
                    a.macd === null ? 'text-gray-400' : a.macd > 0 ? 'text-green-600' : 'text-red-500')}>
                    {a.macd !== null ? (a.macd > 0 ? '+' : '') + a.macd : '—'}
                  </td>
                  <td className="text-right font-mono text-xs text-gray-500 py-3 px-3">
                    {a.sma20 ? `$${a.sma20.toFixed(2)}` : '—'}
                    {a.priceAboveSMA20 !== null && (
                      <span className={clsx('ml-1', a.priceAboveSMA20 ? 'text-green-500' : 'text-red-400')}>
                        {a.priceAboveSMA20 ? '▲' : '▼'}
                      </span>
                    )}
                  </td>
                  <td className="text-center py-3 px-3"><SignalBadge signal={a.signal} /></td>
                  <td className="text-right py-3 px-3"><ChangePct value={a.change7d} /></td>
                  <td className="text-right py-3 px-3"><ChangePct value={a.change30d} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <AssetDetailPanel asset={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
