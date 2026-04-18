/**
 * =============================================================================
 * Auth Events — Minimal event bus for authentication lifecycle
 * =============================================================================
 * Emits:
 *   - 'auth:logout'          → Token irrecuperable, sesión terminada
 *   - 'auth:token-refreshed' → Token renovado exitosamente
 *
 * Consumers (hooks/componentes) se suscriben con `authEvents.on()` y reciben
 * una función de unsubscribe para limpiar en `useEffect` teardown.
 *
 * Implementación: EventTarget nativo del browser (sin dependencias).
 * =============================================================================
 */

type AuthEventType = 'auth:logout' | 'auth:token-refreshed';

const target = typeof window !== 'undefined'
  ? new EventTarget()
  : null; // SSR-safe: no-op en servidor

/**
 * Subscribe to an auth event.
 * @returns Unsubscribe function (call in useEffect cleanup).
 *
 * @example
 * useEffect(() => {
 *   const unsub = authEvents.on('auth:logout', () => router.push('/login'));
 *   return unsub;
 * }, []);
 */
function on(event: AuthEventType, callback: (detail?: unknown) => void): () => void {
  if (!target) return () => {};

  const handler = (e: Event) => {
    callback((e as CustomEvent).detail);
  };

  target.addEventListener(event, handler);
  return () => target.removeEventListener(event, handler);
}

/**
 * Emit an auth event.
 * @param event  Event name
 * @param detail Optional payload (e.g. reason for logout)
 */
function emit(event: AuthEventType, detail?: unknown): void {
  if (!target) return;
  target.dispatchEvent(new CustomEvent(event, { detail }));
}

export const authEvents = { on, emit } as const;
export default authEvents;
