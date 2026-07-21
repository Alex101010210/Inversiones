import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { screenerApi } from '../../api';
import { PageHeader, Spinner } from '../../components/ui/components';
import { SlidersHorizontal, TrendingUp, TrendingDown, Minus, RefreshCw, Globe, Database } from 'lucide-react';
import clsx from 'clsx';

const ASSET_TYPES = ['STOCK', 'ETF', 'CRYPTO', 'BOND', 'COMMODITY'];
const SIGNALS     = ['BUY', 'SELL', 'HOLD'];
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

export default function Screener() {
  const [mode, setMode] = useState('market'); // 'market' | 'portfolio'
  const [filters, setFilters] = useState({
    type: '', sector: '', rsiMin: '', rsiMax: '',
    signal: '', priceMin: '', priceMax: '',
  });
  const [applied, setApplied] = useState({});
  const [showFilters, setShowFilters] = useState(true);

  // Load available filter options (includes catalog sectors)
  const { data: options } = useQuery({
    queryKey: ['screener-filters'],
    queryFn:  screenerApi.filters,
    staleTime: 5 * 60_000,
  });

  // Market mode: live data from Yahoo Finance
  const {
    data: marketData,
    isLoading: marketLoading,
    isFetching: marketFetching,
    refetch: refetchMarket,
  } = useQuery({
    queryKey: ['screener-market', applied],
    queryFn:  () => screenerApi.screenMarket(applied),
    staleTime: 5 * 60_000,
    enabled:  mode === 'market',
  });

  // Portfolio mode: DB-based
  const {
    data: portfolioData,
    isLoading: portfolioLoading,
    isFetching: portfolioFetching,
    refetch: refetchPortfolio,
  } = useQuery({
    queryKey: ['screener', applied],
    queryFn:  () => screenerApi.screen(applied),
    staleTime: 60_000,
    enabled:  mode === 'portfolio',
  });

  const data       = mode === 'market' ? marketData : portfolioData;
  const isLoading  = mode === 'market' ? marketLoading : portfolioLoading;
  const isFetching = mode === 'market' ? marketFetching : portfolioFetching;
  const refetch    = mode === 'market' ? refetchMarket : refetchPortfolio;
  const assets     = data?.assets ?? [];

  const applyFilters = () => {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    setApplied(clean);
  };

  const resetFilters = () => {
    setFilters({ type: '', sector: '', rsiMin: '', rsiMax: '', signal: '', priceMin: '', priceMax: '' });
    setApplied({});
  };

  const activeCount = Object.values(applied).filter(Boolean).length;
  const sectors = mode === 'market' ? SECTORS_MARKET : (options?.sectors ?? []);

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Screener de Activos"
        subtitle="Analiza activos del mercado con indicadores técnicos en tiempo real"
        action={
          <div className="flex gap-2 flex-wrap">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setMode('market')}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === 'market'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                )}>
                <Globe className="w-3.5 h-3.5" /> Mercado
              </button>
              <button
                onClick={() => setMode('portfolio')}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === 'portfolio'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                )}>
                <Database className="w-3.5 h-3.5" /> Mi portafolio
              </button>
            </div>
            <button
              className="btn-secondary flex items-center gap-1.5"
              onClick={() => setShowFilters(s => !s)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {activeCount > 0 && (
                <span className="ml-1 bg-brand-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
            <button className="btn-secondary flex items-center gap-1.5" onClick={() => refetch()}>
              <RefreshCw className={clsx('w-4 h-4', isFetching && 'animate-spin')} />
              Actualizar
            </button>
          </div>
        }
      />

      {/* Mode description */}
      {mode === 'market' && (
        <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>Modo Mercado:</strong> muestra ~40 activos populares (acciones, ETFs, cripto) con precios reales de Yahoo Finance.
            Los indicadores se calculan con datos históricos de los últimos 60 días.
          </span>
        </div>
      )}
      {mode === 'portfolio' && (
        <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
          <Database className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>Modo Portafolio:</strong> filtra solo los activos que están en tu portafolio y tienen historial de precios registrado.
          </span>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="card mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Asset type */}
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                <option value="">Todos</option>
                {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Sector */}
            <div>
              <label className="label">Sector</label>
              <select className="input" value={filters.sector} onChange={e => setFilters(f => ({ ...f, sector: e.target.value }))}>
                <option value="">Todos</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Signal */}
            <div>
              <label className="label">Señal TA</label>
              <select className="input" value={filters.signal} onChange={e => setFilters(f => ({ ...f, signal: e.target.value }))}>
                <option value="">Todas</option>
                {SIGNALS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* RSI range */}
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

            {/* Price range */}
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

            {/* Actions */}
            <div className="flex items-end gap-2 col-span-2">
              <button className="btn-primary flex-1" onClick={applyFilters}>Aplicar filtros</button>
              <button className="btn-secondary" onClick={resetFilters}>Limpiar</button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner />
          {mode === 'market' && (
            <p className="text-sm text-gray-400">Obteniendo datos en tiempo real de Yahoo Finance…</p>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {data?.count ?? 0} activos encontrados
              {isFetching && <span className="ml-2 text-xs text-brand-500">actualizando…</span>}
            </p>
          </div>

          {assets.length === 0 ? (
            <div className="card text-center py-16">
              <SlidersHorizontal className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Sin resultados</p>
              {mode === 'market' ? (
                <p className="text-gray-400 text-sm mt-1">
                  Ajusta los filtros. Los datos de mercado pueden tardar unos segundos en cargar.
                </p>
              ) : (
                <p className="text-gray-400 text-sm mt-1">
                  Agrega operaciones a tu portafolio para ver activos aquí, o cambia a modo <strong>Mercado</strong>.
                </p>
              )}
            </div>
          ) : (
            <div className="card overflow-x-auto p-0">
              <table>
                <thead>
                  <tr>
                    <th className="text-left">Símbolo</th>
                    <th className="text-left">Nombre</th>
                    <th className="text-center">Tipo</th>
                    <th className="text-left">Sector</th>
                    <th className="text-right">Precio</th>
                    <th className="text-right">RSI</th>
                    <th className="text-right">MACD</th>
                    <th className="text-right">SMA20</th>
                    <th className="text-center">Señal</th>
                    <th className="text-right">7d</th>
                    <th className="text-right">30d</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id ?? a.symbol}>
                      <td className="font-bold text-brand-600">{a.symbol}</td>
                      <td className="max-w-[160px] truncate text-gray-600">{a.name}</td>
                      <td className="text-center">
                        <span className="badge badge-blue text-xs">{a.type}</span>
                      </td>
                      <td className="text-gray-500 text-xs">{a.sector ?? '—'}</td>
                      <td className="text-right font-mono font-semibold">
                        ${a.price != null ? a.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className={clsx(
                        'text-right font-mono font-semibold',
                        a.rsi === null ? 'text-gray-400' :
                        a.rsi < 30 ? 'text-green-600' :
                        a.rsi > 70 ? 'text-red-500' : 'text-gray-700'
                      )}>
                        {a.rsi ?? '—'}
                      </td>
                      <td className={clsx(
                        'text-right font-mono text-xs',
                        a.macd === null ? 'text-gray-400' :
                        a.macd > 0 ? 'text-green-600' : 'text-red-500'
                      )}>
                        {a.macd !== null ? (a.macd > 0 ? '+' : '') + a.macd : '—'}
                      </td>
                      <td className="text-right font-mono text-xs text-gray-500">
                        {a.sma20 ? `$${a.sma20.toFixed(2)}` : '—'}
                        {a.priceAboveSMA20 !== null && (
                          <span className={clsx('ml-1', a.priceAboveSMA20 ? 'text-green-500' : 'text-red-400')}>
                            {a.priceAboveSMA20 ? '▲' : '▼'}
                          </span>
                        )}
                      </td>
                      <td className="text-center"><SignalBadge signal={a.signal} /></td>
                      <td className="text-right"><ChangePct value={a.change7d} /></td>
                      <td className="text-right"><ChangePct value={a.change30d} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
