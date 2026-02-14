/**
 * useFetch - Generic data fetching hook
 * TODO: Implement with SWR integration
 */

import useSWR, { SWRConfiguration } from 'swr';
import { http } from '@/services/api/http';

const fetcher = (url: string) => http.get(url).then(res => res.data);

export function useFetch<T = any>(url: string | null, options?: SWRConfiguration) {
  return useSWR<T>(url, fetcher, options);
}

export default useFetch;
