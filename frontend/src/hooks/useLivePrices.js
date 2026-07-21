import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook que invalida queries de precios y holdings cada `intervalMs` ms.
 * Esto fuerza a React Query a refetchar precios en vivo desde el backend.
 */
export function useLivePrices(intervalMs = 30_000) {
  const qc  = useQueryClient();
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      // Invalidar holdings (tienen currentPrice incluido)
      qc.invalidateQueries({ queryKey: ['holdings'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['risk'] });
    }, intervalMs);

    return () => clearInterval(ref.current);
  }, [qc, intervalMs]);
}
