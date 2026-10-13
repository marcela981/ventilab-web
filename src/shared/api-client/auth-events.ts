/*
* Funcionalidad: API client auth event bus
* Descripción: Minimal synchronous event bus for the auth lifecycle seen by the HTTP layer: `token-refreshed` after a successful refresh and `session-expired` (with a reason) when the session cannot be recovered. The api-client never imports the session module; session (T4) subscribes here to log out and redirect. SSR-safe, no dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type AuthEvent =
  | { type: "token-refreshed" }
  | { type: "session-expired", reason: string };

export type AuthEventListener = (event: AuthEvent) => void;

const listeners = new Set<AuthEventListener>();

export function onAuthEvent(listener: AuthEventListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function emitAuthEvent(event: AuthEvent): void {
  [...listeners].forEach((listener) => listener(event));
}
