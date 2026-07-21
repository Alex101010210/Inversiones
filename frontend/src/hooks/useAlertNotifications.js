/**
 * useAlertNotifications — polls GET /alerts/check every 60s
 * and shows a toast when new alerts are triggered.
 */
import { useEffect, useRef, useState } from 'react';
import { alertsApi } from '../api';

export function useAlertNotifications() {
  const [notifications, setNotifications] = useState([]);
  const seenIds = useRef(new Set());

  useEffect(() => {
    let timer;

    async function check() {
      try {
        const result = await alertsApi.check();
        const triggered = result?.items ?? [];
        const fresh = triggered.filter(a => !seenIds.current.has(a.id));
        if (fresh.length > 0) {
          fresh.forEach(a => seenIds.current.add(a.id));
          setNotifications(prev => [
            ...prev,
            ...fresh.map(a => ({
              id:      a.id,
              symbol:  a.asset?.symbol ?? a.assetId,
              price:   a.triggeredPrice,
              cond:    a.condition,
              thresh:  a.threshold,
            })),
          ]);
        }
      } catch {
        // silently ignore polling errors
      }
    }

    check();
    timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, []);

  const dismiss = (id) => setNotifications(n => n.filter(x => x.id !== id));

  return { notifications, dismiss };
}
