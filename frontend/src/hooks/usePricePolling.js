// ─────────────────────────────────────────────────────────────────────────────
// Hook: useLivePrice
//
// Obtiene el precio en vivo de un símbolo específico usando React Query.
// Se refresca automáticamente cada `refetchInterval` ms (default: 30 segundos).
//
// Uso:
//   const { data } = useLivePrice('AAPL');
//   → data = { symbol: 'AAPL', price: 189.50, timestamp: '...' }
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query';
import { assetApi } from '../api';

export function useLivePrice(symbol, refetchInterval = 30_000) {
  return useQuery({
    queryKey:       ['livePrice', symbol],
    queryFn:        () => assetApi.price(symbol),
    enabled:        !!symbol,          // no ejecutar si no hay símbolo
    refetchInterval,                   // refetch automático cada N ms
    staleTime:      0,                 // siempre considerar los datos como "stale" para forzar refetch
  });
}
