/**
 * COMPATIBILITY SHIM
 * This file re-exports from the canonical location.
 * Import from '@/services/api/httpClient' instead.
 * @deprecated Use @/services/api/httpClient
 */
export { default, httpClient, APIError, setAuthToken, removeAuthToken, forceTokenRefresh } from '@/services/api/httpClient';
