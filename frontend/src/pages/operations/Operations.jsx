import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operationApi, portfolioApi, assetApi, exportApi, importApi } from '../../api';
import { PageHeader, Spinner, EmptyState, Badge } from '../../components/ui/components';
import { Plus, Trash2, Pencil, Download, Upload, CheckCircle, AlertCircle, X, ChevronUp, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { format } from 'date-fns';

const OP_TYPES = ['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT'];

/* ─── Import CSV Modal ────────────────────────────────────────────────────── */
function ImportModal({ onClose }) {
  const qc = useQueryClient();
  const fileRef = { current: null };
  const [portfolioId, setPortfolioId] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: portfolioApi.list });

  const mutation = useMutation({
    mutationFn: () => importApi.operations(portfolioId, file),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['holdings'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });

  const canImport = portfolioId && file && !mutation.isPending;

  return (
    <div className="modal-overlay">
      <div className="modal-box p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">📂 Importar CSV de Operaciones</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="mb-5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">Formato del CSV esperado:</p>
          <code className="block font-mono">symbol, type, quantity, price, fees, date, notes</code>
          <p className="mt-1">Tipos válidos: BUY · SELL · DIVIDEND · SPLIT · TRANSFER_IN · TRANSFER_OUT</p>
          <p className="mt-1">Fecha formato: YYYY-MM-DD o MM/DD/YYYY</p>
        </div>
        <div className="mb-5">
          <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={() => {
            const csv = 'symbol,type,quantity,price,fees,date,notes\nAAPL,BUY,10,150.00,1.50,2024-01-15,Compra inicial\nMSFT,BUY,5,380.00,1.00,2024-01-20,\n';
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = 'operaciones_template.csv'; a.click();
          }}>
            <Download className="w-3.5 h-3.5" /> Descargar plantilla CSV
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Portafolio destino</label>
            <select className="input" value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)}>
              <option value="">Seleccionar portafolio…</option>
              {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Archivo CSV</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-brand-500 transition-colors"
              onClick={() => fileRef.current?.click()}>
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div><Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Haz click o arrastra tu archivo CSV</p>
                </div>
              )}
            </div>
            <input ref={(r) => { fileRef.current = r; }} type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        {result && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-300 font-semibold mb-2">
              <CheckCircle className="w-4 h-4" /> Importación completada
            </div>
            <p className="text-sm text-green-700 dark:text-green-400">
              ✅ {result.imported} operaciones importadas
              {result.skipped > 0 && <span className="ml-2 text-yellow-700 dark:text-yellow-400">⚠️ {result.skipped} omitidas</span>}
            </p>
            {result.errors?.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        {mutation.error && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg px-3 py-2">
            {mutation.error?.error ?? 'Error al importar'}
          </p>
        )}
        <div className="flex gap-2 justify-end mt-5">
          <button className="btn-secondary" onClick={onClose}>{result ? 'Cerrar' : 'Cancelar'}</button>
          {!result && (
            <button className="btn-primary flex items-center gap-1.5" onClick={() => mutation.mutate()} disabled={!canImport}>
              <Upload className="w-4 h-4" />
              {mutation.isPending ? 'Importando…' : 'Importar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Operation Create/Edit Modal ────────────────────────────────────────── */
function OperationModal({ onClose, initialData = null }) {
  const qc = useQueryClient();
  const isEditing = !!initialData;

  const [form, setForm] = useState(() => initialData
    ? {
        portfolioId:  initialData.portfolioId,
        assetSymbol:  initialData.asset?.symbol ?? '',
        assetId:      initialData.assetId,
        type:         initialData.type,
        quantity:     String(initialData.quantity),
        price:        String(initialData.price),
        fees:         String(initialData.fees),
        date:         new Date(initialData.date).toISOString().split('T')[0],
        notes:        initialData.notes ?? '',
      }
    : {
        portfolioId: '', assetSymbol: '', assetId: '', type: 'BUY',
        quantity: '', price: '', fees: '0',
        date: new Date().toISOString().split('T')[0], notes: '',
      }
  );
  const [assetSearch, setAssetSearch] = useState(initialData?.asset?.symbol ?? '');
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: portfolioApi.list });
  const { data: searchResults = [] } = useQuery({
    queryKey: ['assetSearch', assetSearch],
    queryFn: () => assetApi.search(assetSearch),
    enabled: assetSearch.length >= 1 && showDropdown,
  });

  const mutation = useMutation({
    mutationFn: async (d) => {
      if (isEditing) {
        return operationApi.update(initialData.id, {
          type: d.type, quantity: +d.quantity, price: +d.price,
          fees: +d.fees, date: d.date, notes: d.notes,
        });
      }
      const asset = await assetApi.get(d.assetSymbol).catch(async () =>
        assetApi.create({ symbol: d.assetSymbol, name: d.assetSymbol })
      );
      return operationApi.create({ ...d, assetId: asset.id, quantity: +d.quantity, price: +d.price, fees: +d.fees });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['holdings'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      onClose();
    },
  });

  const selectAsset = (a) => {
    setAssetSearch(a.symbol);
    setForm(f => ({ ...f, assetSymbol: a.symbol, assetId: a.id ?? '' }));
    setShowDropdown(false);
  };

  const canSave = form.portfolioId && form.assetSymbol && form.quantity && form.price;

  return (
    <div className="modal-overlay">
      <div className="modal-box p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
            {isEditing ? '✏️ Editar Operación' : '➕ Nueva Operación'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Portafolio</label>
            <select className="input" value={form.portfolioId}
              onChange={(e) => setForm(f => ({ ...f, portfolioId: e.target.value }))} disabled={isEditing}>
              <option value="">Seleccionar portafolio…</option>
              {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 relative">
            <label className="label">Activo (símbolo)</label>
            <input className="input" placeholder="AAPL, BTC, SPY…" value={assetSearch} disabled={isEditing}
              onChange={(e) => { setAssetSearch(e.target.value); setForm(f => ({ ...f, assetSymbol: e.target.value.toUpperCase() })); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)} />
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                {searchResults.map(a => (
                  <div key={a.id} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm flex items-center justify-between"
                    onMouseDown={() => selectAsset(a)}>
                    <span><span className="font-semibold">{a.symbol}</span> <span className="text-gray-500 dark:text-gray-400">{a.name}</span></span>
                    <span className="text-xs text-gray-400">{a.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
              {OP_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input className="input" type="number" step="0.000001" placeholder="0"
              value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} />
          </div>
          <div>
            <label className="label">Precio por unidad</label>
            <input className="input" type="number" step="0.01" placeholder="0.00"
              value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div>
            <label className="label">Comisiones / Fees</label>
            <input className="input" type="number" step="0.01" placeholder="0.00"
              value={form.fees} onChange={(e) => setForm(f => ({ ...f, fees: e.target.value }))} />
          </div>
          <div>
            <label className="label">Total estimado</label>
            <div className="input bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold">
              ${((+form.quantity || 0) * (+form.price || 0) + (+form.fees || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="col-span-2">
            <label className="label">Notas (opcional)</label>
            <input className="input" placeholder="…" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        {mutation.error && (
          <p className="text-red-500 text-sm mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {mutation.error?.error ?? 'Error al guardar'}
          </p>
        )}
        <div className="flex gap-2 justify-end mt-5">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !canSave}>
            {mutation.isPending ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear operación'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sort Icon helper ────────────────────────────────────────────────────── */
function SortIcon({ field, sortBy, sortDir }) {
  if (sortBy !== field) return <ChevronUp className="w-3 h-3 text-gray-300 inline ml-1" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-brand-600 inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-brand-600 inline ml-1" />;
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function Operations() {
  const qc = useQueryClient();
  const [showModal, setShowModal]   = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // ── Filters & pagination state ───────────────────────────────────────────
  const [filters, setFilters] = useState({
    portfolioId: '', type: '', symbol: '', dateFrom: '', dateTo: '',
  });
  const [applied, setApplied] = useState({});
  const [page,    setPage]    = useState(1);
  const [sortBy,  setSortBy]  = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: portfolioApi.list });

  const { data: result = { ops: [], total: 0, totalPages: 1 }, isLoading } = useQuery({
    queryKey: ['operations', applied, page, sortBy, sortDir],
    queryFn: () => operationApi.list({ ...applied, page, limit: 50, sortBy, sortDir }),
    refetchInterval: 60_000,
  });

  const ops        = result.ops ?? [];
  const total      = result.total ?? 0;
  const totalPages = result.totalPages ?? 1;

  // ── Keyboard shortcut N → new operation ──────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      setShowModal(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const deleteMutation = useMutation({
    mutationFn: operationApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['holdings'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });

  const applyFilters = () => {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    setApplied(clean);
    setPage(1);
  };
  const resetFilters = () => { setFilters({ portfolioId: '', type: '', symbol: '', dateFrom: '', dateTo: '' }); setApplied({}); setPage(1); };

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
    setPage(1);
  };

  const SortTh = ({ label, field, className = '' }) => (
    <th className={`py-3 px-4 font-medium text-gray-500 cursor-pointer select-none hover:text-brand-600 whitespace-nowrap ${className}`}
      onClick={() => toggleSort(field)}>
      {label}<SortIcon field={field} sortBy={sortBy} sortDir={sortDir} />
    </th>
  );

  if (isLoading && !ops.length) return <Spinner />;

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Operaciones"
        subtitle={`${total} transacciones registradas · presiona N para nueva`}
        action={
          <div className="flex gap-2 flex-wrap">
            <button className="btn-secondary flex items-center gap-1.5" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4" /> Importar CSV
            </button>
            <button className="btn-secondary flex items-center gap-1.5" onClick={() => exportApi.operations()}>
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
            <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> Nueva operación
            </button>
          </div>
        }
      />

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="card mb-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="label">Portafolio</label>
            <select className="input" value={filters.portfolioId} onChange={e => setFilters(f => ({ ...f, portfolioId: e.target.value }))}>
              <option value="">Todos</option>
              {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
              <option value="">Todos</option>
              {OP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Símbolo</label>
            <input className="input" placeholder="AAPL, BTC…" value={filters.symbol}
              onChange={e => setFilters(f => ({ ...f, symbol: e.target.value }))} />
          </div>
          <div>
            <label className="label">Desde</label>
            <input className="input" type="date" value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input className="input" type="date" value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-3">
          <button className="btn-secondary text-sm" onClick={resetFilters}>Limpiar</button>
          <button className="btn-primary text-sm" onClick={applyFilters}>Aplicar filtros</button>
        </div>
      </div>

      {ops.length === 0 && !isLoading ? (
        <EmptyState
          title="Sin operaciones"
          description="Registra tu primera compra, venta o dividendo"
          action={<button className="btn-primary" onClick={() => setShowModal(true)}>Agregar operación</button>}
        />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <SortTh label="Fecha"      field="date"     className="text-left" />
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Activo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Portafolio</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Tipo</th>
                  <SortTh label="Cantidad"  field="quantity" className="text-right" />
                  <SortTh label="Precio"    field="price"    className="text-right" />
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Total</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Fees</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((op) => (
                  <tr key={op.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{format(new Date(op.date), 'dd MMM yyyy')}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{op.asset?.symbol}</div>
                      <div className="text-xs text-gray-400 max-w-[120px] truncate">{op.asset?.name}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 max-w-[100px] truncate">{op.portfolio?.name}</td>
                    <td className="py-3 px-4 text-center"><Badge type={op.type} /></td>
                    <td className="py-3 px-4 text-right font-mono">{op.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono">${op.price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-semibold">
                      ${(op.quantity * op.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500">${op.fees.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditTarget(op)} className="text-gray-400 hover:text-brand-600 transition-colors" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm('¿Eliminar esta operación?')) deleteMutation.mutate(op.id); }}
                          className="text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Paginación ─────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>{total} operaciones · página {page} de {totalPages}</span>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg border border-gray-200 hover:border-brand-400 disabled:opacity-30 transition-colors" onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg border border-gray-200 hover:border-brand-400 disabled:opacity-30 transition-colors" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded-lg border text-sm transition-colors ${p === page ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 hover:border-brand-400'}`}>
                      {p}
                    </button>
                  );
                })}
                <button className="p-1.5 rounded-lg border border-gray-200 hover:border-brand-400 disabled:opacity-30 transition-colors" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg border border-gray-200 hover:border-brand-400 disabled:opacity-30 transition-colors" onClick={() => setPage(totalPages)} disabled={page === totalPages}><ChevronsRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      {showModal  && <OperationModal onClose={() => setShowModal(false)} />}
      {editTarget && <OperationModal initialData={editTarget} onClose={() => setEditTarget(null)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
