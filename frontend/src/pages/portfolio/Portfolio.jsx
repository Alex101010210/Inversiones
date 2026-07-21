import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioApi } from '../../api';
import { usePortfolioStore } from '../../store';
import { Plus, Trash2, ChevronRight, AlertTriangle } from 'lucide-react';
import { PageHeader, Spinner, EmptyState } from '../../components/ui/components';
import { Link } from 'react-router-dom';

function CreatePortfolioModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', currency: 'USD' });
  const mutation = useMutation({
    mutationFn: portfolioApi.create,
    onSuccess: () => { qc.invalidateQueries(['portfolios']); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-semibold text-lg mb-4">Nuevo Portafolio</h3>
        <div className="space-y-3">
          <div><label className="label">Nombre</label><input className="input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Descripción</label><input className="input" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div>
            <label className="label">Moneda</label>
            <select className="input" value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}>
              {['USD', 'EUR', 'GBP', 'MXN', 'JPY'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {mutation.error && <p className="text-red-500 text-sm mt-2">{mutation.error?.error}</p>}
        <div className="flex gap-2 justify-end mt-5">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.name}>
            {mutation.isPending ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ portfolio, onClose, onConfirm, isPending }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <h3 className="font-semibold text-lg text-red-700">Eliminar portafolio</h3>
        </div>
        <p className="text-sm text-gray-700 mb-2">
          ¿Estás seguro de que quieres eliminar <strong>{portfolio.name}</strong>?
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 mb-5 space-y-1">
          <p>• <strong>{portfolio._count?.operations ?? 0}</strong> operaciones serán eliminadas</p>
          <p>• <strong>{portfolio._count?.holdings ?? 0}</strong> holdings serán eliminados</p>
          <p className="font-semibold mt-1">Esta acción no se puede deshacer.</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose} disabled={isPending}>Cancelar</button>
          <button
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const qc = useQueryClient();
  const { setActivePortfolio } = usePortfolioStore();
  const [showModal,  setShowModal]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: portfolioApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: portfolioApi.delete,
    onSuccess: () => { qc.invalidateQueries(['portfolios']); setDeleteTarget(null); },
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="p-8">
      <PageHeader
        title="Portafolios"
        subtitle="Gestiona tus portafolios de inversión"
        action={
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nuevo Portafolio
          </button>
        }
      />

      {portfolios.length === 0 ? (
        <EmptyState title="Sin portafolios" description="Crea tu primer portafolio para empezar" action={<button className="btn-primary" onClick={() => setShowModal(true)}>Crear Portafolio</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {portfolios.map((p) => (
            <div key={p.id} className="card hover:border-brand-300 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                </div>
                <button onClick={() => setDeleteTarget(p)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>{p._count?.holdings ?? 0} holdings</span>
                <span>{p._count?.operations ?? 0} operaciones</span>
                <span className="font-medium text-gray-700">{p.currency}</span>
              </div>
              <Link
                to={`/portfolio/${p.id}`}
                onClick={() => setActivePortfolio(p.id)}
                className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-sm font-medium"
              >
                Abrir portafolio <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {showModal && <CreatePortfolioModal onClose={() => setShowModal(false)} />}
      {deleteTarget && (
        <DeleteConfirmModal
          portfolio={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
