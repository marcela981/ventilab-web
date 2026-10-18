/*
* Funcionalidad: Error report scrubbing
* Descripción: Removes personal data and secrets from an error report before it leaves the browser: scrubText replaces e-mail addresses, JWTs, Bearer credentials and the values of sensitive query parameters (token, access_token, refresh_token, refreshToken, code, password, email) with placeholders; scrubValue applies it to every string of a JSON-like value (bounded depth); scrubEvent drops the user (except its opaque id) and the request cookies, headers and body and scrubs the rest of the event, breadcrumbs included. Pure; no dependencies (works on the plain event objects of @sentry/browser).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const SENSITIVE_PARAM = /([?&#](?:token|access_token|refresh_token|refreshToken|code|password|email)=)[^&#\s"']*/gi;
const MAX_DEPTH = 8;
// Request fields that may carry credentials or personal data; never sent.
const DROPPED_REQUEST_KEYS = new Set(["cookies", "headers", "data"]);

export const REDACTED = "[redactado]";

export function scrubText(text: string): string {
  return text
    .replace(SENSITIVE_PARAM, `$1${REDACTED}`)
    .replace(BEARER, `Bearer ${REDACTED}`)
    .replace(JWT, REDACTED)
    .replace(EMAIL, REDACTED);
}

export function scrubValue<T>(value: T, depth = 0): T {
  if (typeof value === "string") {
    return scrubText(value) as T;
  }

  if (depth >= MAX_DEPTH || value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item: unknown) => scrubValue(item, depth + 1)) as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = scrubValue(item, depth + 1);
  }

  return result as T;
}

export function scrubEvent<T extends object>(event: T): T {
  const { user, request, ...rest } = event as { user?: unknown, request?: unknown } & Record<string, unknown>;
  const scrubbed: Record<string, unknown> = scrubValue(rest);
  const userId = typeof user === "object" && user !== null ? (user as { id?: unknown }).id : undefined;

  if (typeof userId === "string" || typeof userId === "number") {
    scrubbed.user = { id: userId };
  }

  if (typeof request === "object" && request !== null) {
    const safeRequest = Object.fromEntries(Object.entries(request).filter(([key]) => !DROPPED_REQUEST_KEYS.has(key)));

    scrubbed.request = scrubValue(safeRequest);
  }

  return scrubbed as T;
}
