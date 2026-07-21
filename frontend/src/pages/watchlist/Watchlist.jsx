import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistApi, assetApi, analysisApi } from '../../api';
import { PageHeader, Spinner, EmptyState, Badge, PnLBadge } from '../../components/ui/components';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, RefreshCw, Pencil, Check, X, BarChart2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router-dom';

const POPULAR = [
  'AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL', 'META',
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
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Agregar a Watchlist</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
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

          <div className="relative">
            <label className="label">O busca por símbolo / nombre</label>
            <input className="input" placeholder="AAPL, Bitcoin…" value={assetSearch}
              onChange={(e) => { setSearch(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)} />
            {showDrop && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-36 overflow-y-auto">
                {searchResults.map(a => (
                  <div key={a.id} className="px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between"
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
            <input className="input" placeholder="¿Por qué lo sigues?" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        {mutation.error && <p className="text-red-500 text-sm mt-2">{mutation.error?.error ?? 'Error'}</p>}

        <div className="flex gap-2 justify-end mt-5">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary"
            onClick={async () => {
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

function WatchlistRow({ item, onRemove, onNoteUpdate }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal,     setNoteVal]     = useState(item.note ?? '');
  const [confirmDel,  setConfirmDel]  = useState(false);

  const { data: analysis } = useQuery({
    queryKey: ['analysis-full', item.asset.symbol],
    queryFn:  () => analysisApi.full(item.asset.symbol),
    staleTime: 5 * 60_000,
  });

  const noteMut = useMutation({
    mutationFn: () => watchlistApi.add({ assetId: item.assetId, note: noteVal }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); setEditingNote(false); },
  });

  const price        = item.currentPrice ?? 0;
  const prevPrice    = analysis?.currentPrice ?? price; // fallback
  // Use 30d change from screener cache if available — else show price only
  const change1d     = null; // would need daily OHLC to compute — shown as —

  return (
    <tr className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Asset */}
      <td className="py-3 px-4">
        <div className="font-semibold text-gray-900 dark:text-white">{item.asset.symbol}</div>
        <div className="text-xs text-gray-400 max-w-[140px] truncate">{item.asset.name}</div>
      </td>

      {/* Type */}
      <td className="py-3 px-4"><Badge type={item.asset.type} /></td>

      {/* Price */}
      <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white">
        ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </td>

      {/* TA Signal */}
      <td className="py-3 px-4 text-center">
        <SignalBadge signal={analysis?.signal} />
      </td>

      {/* RSI */}
      <td className="py-3 px-4 text-right text-sm">
        {analysis ? (
          <span className={clsx('font-semibold',
            analysis.currentRSI > 70 ? 'text-danger' : analysis.currentRSI < 30 ? 'text-success' : 'text-gray-700 dark:text-gray-200')}>
            {analysis.currentRSI}
          </span>
        ) : <span className="text-gray-300">—</span>}
      </td>

      {/* MACD */}
      <td className="py-3 px-4 text-right text-sm">
        {analysis?.macd ? (
          <span className={clsx('font-semibold', analysis.macd.histogram > 0 ? 'text-success' : 'text-danger')}>
            {analysis.macd.value?.toFixed(2)}
          </span>
        ) : <span className="text-gray-300">—</span>}
      </td>

      {/* Note (inline edit) */}
      <td className="py-3 px-4 text-sm max-w-[140px]">
        {editingNote ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              className="input text-xs py-1 px-2 h-7"
              value={noteVal}
              onChange={e => setNoteVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') noteMut.mutate(); if (e.key === 'Escape') setEditingNote(false); }}
            />
            <button onClick={() => noteMut.mutate()} className="text-green-600 hover:text-green-700" title="Guardar">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditingNote(false)} className="text-gray-400 hover:text-gray-600" title="Cancelar">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1 text-gray-400 hover:text-brand-600 transition-colors group w-full text-left"
            onClick={() => setEditingNote(true)}
            title="Editar nota"
          >
            <span className="truncate max-w-[110px] text-gray-500">{item.note || <span className="italic text-gray-300">sin nota</span>}</span>
            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
          </button>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/analysis?symbol=${item.asset.symbol}`}
            className="p-1.5 text-gray-400 hover:text-brand-600 transition-colors rounded-lg hover:bg-brand-50"
            title="Ver análisis técnico"
          >
            <BarChart2 className="w-4 h-4" />
          </Link>
          <button
            onClick={() => navigate('/operations', { state: { prefill: { assetSymbol: item.asset.symbol } } })}
            className="p-1.5 text-gray-400 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50"
            title="Nueva operación"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          {confirmDel ? (
            <div className="flex items-center gap-1 ml-1">
              <span className="text-xs text-red-600 font-medium">¿Eliminar?</span>
              <button onClick={() => onRemove(item.id)} className="text-red-600 hover:text-red-700 text-xs font-bold">Sí</button>
              <button onClick={() => setConfirmDel(false)} className="text-gray-400 hover:text-gray-600 text-xs">No</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
              title="Eliminar de watchlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
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
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Activo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Tipo</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Precio actual</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Señal TA</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">RSI</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">MACD</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Nota</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <WatchlistRow
                  key={item.id}
                  item={item}
                  onRemove={(id) => removeMut.mutate(id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <AddToWatchlistModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
