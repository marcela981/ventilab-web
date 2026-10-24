/*
* Funcionalidad: Keepalive request authentication
* Descripción: Fresh Bearer token for the `fetch(..., { keepalive: true })` requests sent while the page goes away
*   (ventilator control release, simulator page-hide event flush). A page-hide handler cannot wait for a network
*   refresh, so the token is kept fresh BEFORE that moment: `keepAccessTokenFresh()` (reference counted, retained by
*   the pages that may send a keepalive request) schedules `refreshAccessToken()` (the shared single-flight refresh of
*   token-refresh.ts) KEEPALIVE_REFRESH_LEAD_MS before the access token expires, re-schedules on every token change and
*   re-checks when the tab becomes hidden (timers of hidden tabs are throttled). `sendWithFreshToken()` sends at once
*   with the stored token when it is valid for more than KEEPALIVE_TOKEN_SKEW_MS; otherwise it refreshes through the
*   same shared refresh first (useful while the page is still alive, e.g. an in-app unmount) and sends with the old
*   token if the refresh fails (best effort). Nothing is refreshed without a refresh token (the shared refresh would
*   end the session). The expiry is read from the JWT `exp` claim without verifying it (the backend is the authority).
*   Depends on token storage and token refresh.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { refreshAccessToken } from "./token-refresh";
import { getAccessToken, getRefreshToken, subscribeTokens } from "./token-storage";

/** A token that expires within this window is refreshed before a keepalive send. */
export const KEEPALIVE_TOKEN_SKEW_MS = 30_000;
/** The proactive refresh runs this long before the expiry (room for the throttled timers of hidden tabs). */
export const KEEPALIVE_REFRESH_LEAD_MS = 120_000;

export type RequestHeaders = Record<string, string>;

type TokenClaims = { exp: number, iat: number | null };

function readClaims(token: string): TokenClaims | null {
  const payload = token.split(".")[1];

  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));

    if (typeof claims !== "object" || claims === null) {
      return null;
    }

    const { exp, iat } = claims as { exp?: unknown, iat?: unknown };

    return typeof exp === "number" ? { exp, iat: typeof iat === "number" ? iat : null } : null;
  } catch {
    return null;
  }
}

/** Expiry of a JWT in epoch milliseconds; null when the token has no readable `exp` claim. */
export function readTokenExpiryMs(token: string): number | null {
  const claims = readClaims(token);

  return claims ? claims.exp * 1000 : null;
}

/** True when the token expires within `skewMs` (an unreadable expiry is left to the backend). */
export function isTokenNearExpiry(token: string, now = Date.now(), skewMs = KEEPALIVE_TOKEN_SKEW_MS): boolean {
  const expiresAt = readTokenExpiryMs(token);

  return expiresAt !== null && expiresAt - now <= skewMs;
}

export function withAuthorization(headers: RequestHeaders, token: string | null): RequestHeaders {
  return token ? { ...headers, Authorization: `Bearer ${token}` } : { ...headers };
}

/** Refreshes through the shared single flight only when there is a refresh token; never rejects. */
function refreshQuietly(): Promise<string | null> {
  if (!getRefreshToken()) {
    return Promise.resolve(null);
  }

  return refreshAccessToken().catch(() => null);
}

/**
 * Calls `send` with the headers plus the Bearer token: synchronously when the stored token is valid beyond the skew,
 * after the shared refresh when it is about to expire (falling back to the old token if the refresh fails).
 */
export function sendWithFreshToken(headers: RequestHeaders, send: (headers: RequestHeaders) => void): void {
  const token = getAccessToken();

  if (!token || !isTokenNearExpiry(token) || !getRefreshToken()) {
    send(withAuthorization(headers, token));

    return;
  }

  void refreshQuietly().then((fresh) => send(withAuthorization(headers, fresh ?? getAccessToken() ?? token)));
}

let retainers = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let stopWatching: (() => void) | null = null;

function refreshLeadMs(claims: TokenClaims): number {
  // A short-lived token must not be refreshed over and over: at most half of its lifetime ahead.
  const lifetimeMs = claims.iat === null ? Infinity : (claims.exp - claims.iat) * 1000;

  return Math.min(KEEPALIVE_REFRESH_LEAD_MS, lifetimeMs / 2);
}

function clearTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

function schedule(): void {
  clearTimer();

  const token = getAccessToken();
  const claims = token ? readClaims(token) : null;

  if (!claims || !getRefreshToken()) {
    return;
  }

  const delayMs = Math.max(claims.exp * 1000 - refreshLeadMs(claims) - Date.now(), 0);

  // A successful refresh stores a new token, whose change notification schedules the next refresh.
  timer = setTimeout(() => {
    timer = null;
    void refreshQuietly();
  }, delayMs);
}

function onVisibilityChange(): void {
  const token = getAccessToken();

  if (document.visibilityState === "hidden" && token && isTokenNearExpiry(token, Date.now(), KEEPALIVE_REFRESH_LEAD_MS)) {
    void refreshQuietly();
  }
}

/**
 * Keeps the access token fresh while retained, so a keepalive request sent on page hide carries a valid token.
 * Returns the release function; the last release stops the timer and the listeners.
 */
export function keepAccessTokenFresh(): () => void {
  retainers += 1;

  if (retainers === 1) {
    const unsubscribe = subscribeTokens(schedule);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    stopWatching = () => {
      unsubscribe();

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
    schedule();
  }

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    retainers -= 1;

    if (retainers === 0) {
      clearTimer();
      stopWatching?.();
      stopWatching = null;
    }
  };
}
