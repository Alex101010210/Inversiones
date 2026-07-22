// ─────────────────────────────────────────────────────────────────────────────
// Hook: useLivePrices
//
// Invalida queries de React Query a intervalos regulares para forzar un
// refetch de precios en vivo. En lugar de manejar WebSockets, usa polling
// porque Yahoo Finance no ofrece streams en tiempo real en el plan gratuito.
//
// Invalida las queries: holdings, summary, overview, risk
// (todas incluyen precios actuales calculados en el backend)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useLivePrices(intervalMs = 30_000) {
  const qc  = useQueryClient();
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      // Invalidar holdings (contienen currentPrice calculado en el backend)
      qc.invalidateQueries({ queryKey: ['holdings'] });
      // Invalidar el resumen del portafolio (totalValue, P&L, etc.)
      qc.invalidateQueries({ queryKey: ['summary'] });
      // Invalidar el overview general (todos los portafolios)
      qc.invalidateQueries({ queryKey: ['overview'] });
      // Invalidar métricas de riesgo (usan precios actuales para calcular)
      qc.invalidateQueries({ queryKey: ['risk'] });
    }, intervalMs);

    return () => clearInterval(ref.current);
  }, [qc, intervalMs]);
}
