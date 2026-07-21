import clsx from 'clsx';

export function StatCard({ title, value, sub, trend, icon: Icon, color = 'blue' }) {
  const positive = trend > 0;
  const colorMap = { blue: 'text-brand-600', green: 'text-success', red: 'text-danger', yellow: 'text-warn' };

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="stat-title">{title}</span>
        {Icon && <Icon className={clsx('w-5 h-5', colorMap[color])} />}
      </div>
      <span className="stat-value">{value}</span>
      {(sub != null || trend != null) && (
        <span className={clsx('text-xs font-medium', trend != null ? (positive ? 'text-success' : 'text-danger') : 'text-gray-500')}>
          {trend != null && (positive ? '▲' : '▼') + ' '}{sub}
        </span>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-10 h-10' }[size];
  return (
    <div className="flex justify-center items-center py-10">
      <div className={clsx(s, 'border-2 border-brand-500 border-t-transparent rounded-full animate-spin')} />
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-gray-400 text-sm font-medium">{title}</p>
      {description && <p className="text-gray-400 text-xs mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ type }) {
  const map = {
    STOCK:   'badge-blue',
    ETF:     'badge-purple',
    CRYPTO:  'badge-yellow',
    BOND:    'badge-green',
    BUY:     'badge-green',
    SELL:    'badge-red',
    DIVIDEND:'badge-yellow',
    BUY_SIG: 'badge-green',
    SELL_SIG:'badge-red',
    HOLD:    'badge-yellow',
    BULLISH: 'badge-green',
    BEARISH: 'badge-red',
    SIDEWAYS:'badge-yellow',
  };
  return <span className={map[type] ?? 'badge bg-gray-100 text-gray-700'}>{type}</span>;
}

export function PnLBadge({ value }) {
  const pos = value >= 0;
  return (
    <span className={clsx('font-semibold text-sm', pos ? 'text-success' : 'text-danger')}>
      {pos ? '+' : ''}{value?.toFixed(2)}%
    </span>
  );
}
