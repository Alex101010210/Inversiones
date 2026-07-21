import { useQuery } from '@tanstack/react-query';
import { assetApi } from '../api';

/**
 * Precio en vivo de un símbolo concreto con refresco automático.
 * @param {string} symbol
 * @param {number} refetchInterval  ms entre actualizaciones (default 30s)
 */
export function useLivePrice(symbol, refetchInterval = 30_000) {
  return useQuery({
    queryKey:       ['livePrice', symbol],
    queryFn:        () => assetApi.price(symbol),
    enabled:        !!symbol,
    refetchInterval,
    staleTime:      0,
  });
}
