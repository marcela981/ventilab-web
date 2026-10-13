/*
* Funcionalidad: Token storage
* Descripción: Only module that touches the backend token keys in localStorage. The access token key is the same one the legacy HTTP interceptor reads (`ventilab_auth_token`), so legacy calls send the real backend token. Every storage access is wrapped in try/catch (private mode, SSR). Subscribers are notified on every change (realtime re-auth). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const ACCESS_TOKEN_KEY = "ventilab_auth_token";
export const REFRESH_TOKEN_KEY = "ventilab_refresh_token";

export type TokenSnapshot = {
  accessToken: string | null
  refreshToken: string | null
};

export type TokenListener = (snapshot: TokenSnapshot) => void;

const listeners = new Set<TokenListener>();

function readKey(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string | null): void {
  try {
    if (typeof window === "undefined") {
      return;
    }

    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Storage unavailable: the session only lives until reload.
  }
}

function notify(): void {
  const snapshot = getTokens();

  listeners.forEach((listener) => listener(snapshot));
}

export function getAccessToken(): string | null {
  return readKey(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return readKey(REFRESH_TOKEN_KEY);
}

export function getTokens(): TokenSnapshot {
  return { accessToken: getAccessToken(), refreshToken: getRefreshToken() };
}

export function saveTokens(accessToken: string, refreshToken: string | null): void {
  writeKey(ACCESS_TOKEN_KEY, accessToken);
  writeKey(REFRESH_TOKEN_KEY, refreshToken);
  notify();
}

export function setAccessToken(accessToken: string): void {
  writeKey(ACCESS_TOKEN_KEY, accessToken);
  notify();
}

export function clearTokens(): void {
  writeKey(ACCESS_TOKEN_KEY, null);
  writeKey(REFRESH_TOKEN_KEY, null);
  notify();
}

export function subscribeTokens(listener: TokenListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
