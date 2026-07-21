/**
 * AlertToastContainer — renders alert notifications as dismissable toasts.
 * Mount once inside <Layout /> so they appear on every page.
 */
import { Bell, X } from 'lucide-react';
import { useAlertNotifications } from '../../hooks/useAlertNotifications';
import clsx from 'clsx';

export default function AlertToastContainer() {
  const { notifications, dismiss } = useAlertNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-xs w-full">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={clsx(
            'flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in',
            n.cond === 'ABOVE'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          )}
        >
          <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{n.symbol}</p>
            <p className="text-xs font-normal">
              Precio {n.cond === 'ABOVE' ? '↑ superó' : '↓ bajó de'} ${n.thresh.toLocaleString()}
              {n.price != null && ` · actual $${n.price.toLocaleString()}`}
            </p>
          </div>
          <button
            onClick={() => dismiss(n.id)}
            className="text-current opacity-50 hover:opacity-100 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
