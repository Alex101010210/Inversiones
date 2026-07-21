import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, alertsApi, assetApi } from '../../api';
import { useAuthStore } from '../../store';
import { PageHeader, Spinner } from '../../components/ui/components';
import { User, Lock, Bell, Plus, Trash2, ToggleLeft, ToggleRight, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

// ─── Toast simple ─────────────────────────────────────────────────────────────
function Toast({ msg, ok }) {
  return (
    <div className={clsx(
      'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
      ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
    )}>
      {ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

// ─── Profile section ──────────────────────────────────────────────────────────
function ProfileSection({ user, updateUser }) {
  const [form,  setForm]  = useState({ name: user?.name ?? '', email: user?.email ?? '' });
  const [toast, setToast] = useState(null);

  const mutation = useMutation({
    mutationFn: settingsApi.updateProfile,
    onSuccess: (data) => {
      updateUser(data);
      setToast({ msg: 'Perfil actualizado', ok: true });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (e) => {
      setToast({ msg: e?.error ?? 'Error al guardar', ok: false });
      setTimeout(() => setToast(null), 3000);
    },
  });

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <User className="w-5 h-5 text-brand-600" />
        <h3 className="font-semibold text-gray-800">Perfil</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        {user?.createdAt && (
          <div className="col-span-full">
            <label className="label">Miembro desde</label>
            <p className="input bg-gray-50 text-gray-500 cursor-default">
              {new Date(user.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Guardar perfil'}
        </button>
      </div>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  );
}

// ─── Password section ─────────────────────────────────────────────────────────
function PasswordSection() {
  const [form,  setForm]  = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [toast, setToast] = useState(null);

  const mutation = useMutation({
    mutationFn: settingsApi.changePassword,
    onSuccess: () => {
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setToast({ msg: 'Contraseña cambiada correctamente', ok: true });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (e) => {
      setToast({ msg: e?.error ?? 'Error al cambiar contraseña', ok: false });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const mismatch = form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword;

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-5 h-5 text-brand-600" />
        <h3 className="font-semibold text-gray-800">Cambiar contraseña</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label">Contraseña actual</label>
          <input className="input" type="password" value={form.currentPassword}
            onChange={(e) => setForm(f => ({ ...f, currentPassword: e.target.value }))} />
        </div>
        <div>
          <label className="label">Nueva contraseña</label>
          <input className="input" type="password" placeholder="Mín. 8 caracteres" value={form.newPassword}
            onChange={(e) => setForm(f => ({ ...f, newPassword: e.target.value }))} />
        </div>
        <div>
          <label className="label">Confirmar contraseña</label>
          <input className={clsx('input', mismatch && 'border-red-400')} type="password" value={form.confirmPassword}
            onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))} />
          {mismatch && <p className="text-red-500 text-xs mt-1">Las contraseñas no coinciden</p>}
        </div>
      </div>
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending || !form.currentPassword || !form.newPassword || mismatch || form.newPassword.length < 8}>
          {mutation.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
        </button>
      </div>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  );
}

// ─── Alerts section ──────────────────────────────────────────────────────────
function AlertsSection() {
  const qc = useQueryClient();
  const [form, setForm]         = useState({ assetSymbol: '', condition: 'ABOVE', threshold: '', note: '' });
  const [assetSearch, setSearch] = useState('');
  const [showDrop, setShowDrop]  = useState(false);
  const [toast, setToast]        = useState(null);

  const { data: alerts = [], isLoading } = useQuery({ queryKey: ['alerts'], queryFn: alertsApi.list });
  const { data: searchResults = [] } = useQuery({
    queryKey: ['assetSearch', assetSearch],
    queryFn:  () => assetApi.search(assetSearch),
    enabled:  assetSearch.length >= 1 && showDrop,
  });

  const createMut = useMutation({
    mutationFn: alertsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      setForm({ assetSymbol: '', condition: 'ABOVE', threshold: '', note: '' });
      setSearch('');
      setToast({ msg: 'Alerta creada', ok: true });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (e) => { setToast({ msg: e?.error ?? 'Error', ok: false }); setTimeout(() => setToast(null), 3000); },
  });

  const deleteMut = useMutation({
    mutationFn: alertsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const toggleMut = useMutation({
    mutationFn: alertsApi.toggle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const selectAsset = (a) => {
    setSearch(a.symbol);
    setForm(f => ({ ...f, assetSymbol: a.symbol, assetId: a.id }));
    setShowDrop(false);
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-5 h-5 text-brand-600" />
        <h3 className="font-semibold text-gray-800">Alertas de precio</h3>
      </div>

      {/* Crear alerta */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Nueva alerta</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1 relative">
            <label className="label">Activo</label>
            <input className="input" placeholder="AAPL, BTC…" value={assetSearch}
              onChange={(e) => { setSearch(e.target.value); setForm(f => ({ ...f, assetSymbol: e.target.value.toUpperCase() })); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)} />
            {showDrop && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                {searchResults.map(a => (
                  <div key={a.id} className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer" onMouseDown={() => selectAsset(a)}>
                    <span className="font-semibold">{a.symbol}</span> <span className="text-gray-400">{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label">Condición</label>
            <select className="input" value={form.condition} onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))}>
              <option value="ABOVE">Por encima de</option>
              <option value="BELOW">Por debajo de</option>
            </select>
          </div>
          <div>
            <label className="label">Precio ($)</label>
            <input className="input" type="number" step="0.01" placeholder="0.00"
              value={form.threshold} onChange={(e) => setForm(f => ({ ...f, threshold: e.target.value }))} />
          </div>
          <div>
            <label className="label">Nota (opcional)</label>
            <input className="input" placeholder="ej. tomar ganancias"
              value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button className="btn-primary flex items-center gap-1.5"
            onClick={() => createMut.mutate({ ...form, assetId: form.assetId, threshold: +form.threshold })}
            disabled={createMut.isPending || !form.assetSymbol || !form.threshold}>
            <Plus className="w-4 h-4" /> {createMut.isPending ? 'Creando…' : 'Crear alerta'}
          </button>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? <Spinner size="sm" /> : alerts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Sin alertas creadas</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {alerts.map(a => (
            <div key={a.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', a.active ? 'bg-green-500' : 'bg-gray-300')} />
                <div>
                  <p className="font-semibold text-sm">{a.asset?.symbol}</p>
                  <p className="text-xs text-gray-500">
                    {a.condition === 'ABOVE' ? '↑ Por encima de' : '↓ Por debajo de'} ${a.threshold.toLocaleString()}
                    {a.note && <span className="ml-1 text-gray-400">· {a.note}</span>}
                  </p>
                  {!a.active && a.triggeredAt && (
                    <p className="text-xs text-orange-500">Disparada el {new Date(a.triggeredAt).toLocaleDateString()} a ${a.triggeredPrice}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleMut.mutate(a.id)} className="text-gray-400 hover:text-brand-600 transition-colors" title={a.active ? 'Desactivar' : 'Activar'}>
                  {a.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => deleteMut.mutate(a.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  );
}

// ─── Danger Zone section ──────────────────────────────────────────────────────
function DangerZoneSection() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState('');
  const [toast, setToast]     = useState(null);

  const mutation = useMutation({
    mutationFn: settingsApi.resetData,
    onSuccess: () => {
      qc.invalidateQueries();   // reset all cached queries
      setConfirm('');
      setToast({ msg: 'Todos los datos han sido eliminados. Portafolios conservados (vacíos).', ok: true });
      setTimeout(() => setToast(null), 5000);
    },
    onError: (e) => {
      setToast({ msg: e?.error ?? 'Error al eliminar datos', ok: false });
      setTimeout(() => setToast(null), 4000);
    },
  });

  return (
    <div className="card border border-red-200 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="w-5 h-5 text-red-500" />
        <h3 className="font-semibold text-red-700">Zona de peligro</h3>
      </div>

      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <p className="text-sm font-semibold text-red-700 mb-1">Eliminar todos mis datos</p>
        <p className="text-xs text-red-600 mb-4">
          Esto borrará <strong>todas tus operaciones, holdings, alertas y watchlist</strong>.
          Tus portafolios y cuenta permanecerán, pero quedarán vacíos. Esta acción no se puede deshacer.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="input flex-1"
            placeholder='Escribe "ELIMINAR" para confirmar'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => mutation.mutate()}
            disabled={confirm !== 'ELIMINAR' || mutation.isPending}
          >
            {mutation.isPending ? 'Eliminando…' : 'Eliminar todos mis datos'}
          </button>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { user, updateUser } = useAuthStore();
  const [tab, setTab] = useState('profile');

  const TABS = [
    { id: 'profile',  label: 'Perfil',     icon: User },
    { id: 'password', label: 'Contraseña', icon: Lock },
    { id: 'alerts',   label: 'Alertas',    icon: Bell },
    { id: 'danger',   label: 'Peligro',    icon: ShieldAlert },
  ];

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="Settings" subtitle="Perfil, seguridad y alertas de precio" />

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === id
                ? (id === 'danger' ? 'bg-red-600 text-white' : 'bg-brand-600 text-white')
                : (id === 'danger' ? 'bg-white border border-red-300 text-red-600 hover:border-red-500' : 'bg-white border border-gray-300 text-gray-600 hover:border-brand-400')
            )}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'profile'  && <ProfileSection user={user} updateUser={updateUser} />}
      {tab === 'password' && <PasswordSection />}
      {tab === 'alerts'   && <AlertsSection />}
      {tab === 'danger'   && <DangerZoneSection />}
    </div>
  );
}
