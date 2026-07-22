// ─────────────────────────────────────────────────────────────────────────────
// Hook: useAlertNotifications
//
// Hace polling cada 60 segundos a GET /alerts/check para detectar alertas de
// precio que se han disparado. Cuando aparece una alerta nueva (no vista antes)
// la agrega al estado de notificaciones para que el componente toast la muestre.
//
// Usa un Set (seenIds) para evitar mostrar la misma alerta dos veces aunque el
// polling la devuelva en múltiples respuestas.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { alertsApi } from '../api';

export function useAlertNotifications() {
  const [notifications, setNotifications] = useState([]);
  const seenIds = useRef(new Set()); // IDs de alertas ya mostradas al usuario

  useEffect(() => {
    let timer;

    async function check() {
      try {
        const result = await alertsApi.check();
        const triggered = result?.items ?? [];

        // Filtrar solo las alertas que no hemos mostrado aún
        const fresh = triggered.filter(a => !seenIds.current.has(a.id));
        if (fresh.length > 0) {
          fresh.forEach(a => seenIds.current.add(a.id));
          setNotifications(prev => [
            ...prev,
            ...fresh.map(a => ({
              id:      a.id,
              symbol:  a.asset?.symbol ?? a.assetId,
              price:   a.triggeredPrice,
              cond:    a.condition,   // 'ABOVE' o 'BELOW'
              thresh:  a.threshold,
            })),
          ]);
        }
      } catch {
        // Ignorar errores de red en el polling — no queremos interrumpir al usuario
      }
    }

    check(); // verificar inmediatamente al montar
    timer = setInterval(check, 60_000); // y luego cada minuto
    return () => clearInterval(timer);
  }, []);

  // Función para que el usuario descarte una notificación desde el toast
  const dismiss = (id) => setNotifications(n => n.filter(x => x.id !== id));

  return { notifications, dismiss };
}
