import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistApi, assetApi, analysisApi } from '../../api';
import { PageHeader, Spinner, EmptyState, Badge, PnLBadge } from '../../components/ui/components';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

const POPULAR = [
  'AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL', 'META', 'GOOG',
  'SPY', 'QQQ', 'VTI', 'IWM', 'GLD', 'TLT',
  'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE',
  'JPM', 'BAC', 'V', 'MA', 'WMT', 'UNH',
];

function AddToWatchlistModal({ onClose }) {
  const qc = useQueryClient();
  const [assetSearch, setSearch] = useState('');
  const [selected, setSelected]  = useState(null);
  const [note, setNote]          = useState('');
  const [showDrop, setShowDrop]  = useState(false);

  const { data: searchResults = [] } = useQuery({
    queryKey: ['assetSearch', assetSearch],
    queryFn:  () => assetApi.search(assetSearch),
    enabled:  assetSearch.length >= 1 && showDrop,
  });

  const mutation = useMutation({
    mutationFn: (d) => watchlistApi.add(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-semibold text-lg mb-4">Agregar a Watchlist</h3>

        <div className="space-y-3">
          {/* Populares */}
          <div>
            <label className="label">Acceso rápido</label>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR.map(s => (
                <button key={s} type="button"
                  onClick={() => { setSearch(s); setSelected(s); setShowDrop(false); }}
                  className={clsx('px-2.5 py-1 text-xs rounded-full border transition-colors',
                    selected === s ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 text-gray-600 hover:border-brand-400'
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <label className="label">O busca por símbolo / nombre</label>
            <input className="input" placeholder="AAPL, Bitcoin…" value={assetSearch}
              onChange={(e) => { setSearch(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)} />
            {showDrop && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-36 overflow-y-auto">
                {searchResults.map(a => (
                  <div key={a.id} className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                    onMouseDown={() => { setSelected(a.symbol); setSearch(a.symbol); setShowDrop(false); }}>
                    <span><span className="font-semibold">{a.symbol}</span> <span className="text-gray-400">{a.name}</span></span>
                    <Badge type={a.type} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Nota (opcional)</label>
            <input className="input" placeholder="¿Por qué lo sigues?" value={note}
              onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        {mutation.error && <p className="text-red-500 text-sm mt-2">{mutation.error?.error ?? 'Error'}</p>}

        <div className="flex gap-2 justify-end mt-5">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary"
            onClick={async () => {
              // getAsset auto-creates from Yahoo Finance if not in DB
              const asset = await assetApi.get(selected).catch(() => null);
              if (asset) mutation.mutate({ assetId: asset.id, note });
            }}
            disabled={mutation.isPending || !selected}>
            {mutation.isPending ? 'Agregando…' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SignalBadge({ signal }) {
  if (!signal) return null;
  const map = {
    BUY:  { label: 'COMPRAR', cls: 'badge-green', icon: TrendingUp },
    SELL: { label: 'VENDER',  cls: 'badge-red',   icon: TrendingDown },
    HOLD: { label: 'MANTENER',cls: 'badge-yellow', icon: Minus },
  };
  const { label, cls, icon: Icon } = map[signal] ?? map.HOLD;
  return (
    <span className={clsx('badge flex items-center gap-1 font-semibold', cls)}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

function WatchlistRow({ item, onRemove }) {
  const { data: analysis } = useQuery({
    queryKey: ['analysis-full', item.asset.symbol],
    queryFn:  () => analysisApi.full(item.asset.symbol),
    staleTime: 60_000,
  });

  const price = item.currentPrice ?? 0;

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4">
        <div className="font-semibold">{item.asset.symbol}</div>
        <div className="text-xs text-gray-400 max-w-[140px] truncate">{item.asset.name}</div>
      </td>
      <td className="py-3 px-4"><Badge type={item.asset.type} /></td>
      <td className="py-3 px-4 text-right font-mono font-semibold">
        ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </td>
      <td className="py-3 px-4 text-center">
        <SignalBadge signal={analysis?.signal} />
      </td>
      <td className="py-3 px-4 text-right text-sm">
        {analysis ? (
          <span className={clsx('font-semibold', analysis.currentRSI > 70 ? 'text-danger' : analysis.currentRSI < 30 ? 'text-success' : 'text-gray-700')}>
            {analysis.currentRSI}
          </span>
        ) : <span className="text-gray-300">—</span>}
      </td>
      <td className="py-3 px-4 text-right text-sm">
        {analysis?.macd ? (
          <span className={clsx('font-semibold', analysis.macd.histogram > 0 ? 'text-success' : 'text-danger')}>
            {analysis.macd.value?.toFixed(2)}
          </span>
        ) : <span className="text-gray-300">—</span>}
      </td>
      <td className="py-3 px-4 text-gray-400 text-sm max-w-[120px] truncate">{item.note}</td>
      <td className="py-3 px-4 text-right">
        <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

export default function Watchlist() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: items = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['watchlist'],
    queryFn:  watchlistApi.list,
    refetchInterval: 30_000,
  });

  const removeMut = useMutation({
    mutationFn: watchlistApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="p-8">
      <PageHeader
        title="Watchlist"
        subtitle={`${items.length} activos en seguimiento · precios actualizados cada 30s`}
        action={
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5" title="Actualizar ahora">
              <RefreshCw className={clsx('w-4 h-4', isFetching && 'animate-spin')} />
            </button>
            <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> Agregar activo
            </button>
          </div>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Watchlist vacía"
          description="Agrega activos que quieras vigilar sin necesidad de tener posición"
          action={<button className="btn-primary" onClick={() => setShowModal(true)}>Agregar activo</button>}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Activo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Tipo</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Precio actual</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Señal TA</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">RSI</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">MACD</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Nota</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <WatchlistRow key={item.id} item={item} onRemove={(id) => removeMut.mutate(id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <AddToWatchlistModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
