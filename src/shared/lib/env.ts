/*
* Funcionalidad: Backend origin resolver
* Descripción: Resolves the backend ORIGIN (no `/api` suffix) with the same precedence as the legacy config: server BACKEND_URL, then NEXT_PUBLIC_BACKEND_URL, then NEXT_PUBLIC_API_URL without its trailing `/api`, then http://localhost:4000. Pure; no dependencies. v1.1 (B5): readPublicEnv reads the optional public Sentry DSN (NEXT_PUBLIC_SENTRY_DSN, trimmed, empty when unset) for the browser error reporting; process.env is read only in this module. v1.2 (B6): readGoogleClientId (NEXT_PUBLIC_GOOGLE_CLIENT_ID, trimmed, empty when unset) and isProductionEnv (NODE_ENV === "production") so features never read process.env directly.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const DEFAULT_BACKEND_ORIGIN = "http://localhost:4000";

export type BackendEnv = {
  isServer: boolean
  backendUrl?: string | undefined
  publicBackendUrl?: string | undefined
  legacyApiUrl?: string | undefined
};

export function resolveBackendOrigin(source: BackendEnv): string {
  const serverUrl = source.isServer ? source.backendUrl : undefined;
  const legacyOrigin = source.legacyApiUrl ? source.legacyApiUrl.replace(/\/api\/?$/, "") : undefined;
  const raw = serverUrl || source.publicBackendUrl || legacyOrigin || DEFAULT_BACKEND_ORIGIN;

  return raw.replace(/\/+$/, "");
}

export function readBackendEnv(): BackendEnv {
  // Each NEXT_PUBLIC_* variable is referenced literally so Next can inline it in the client bundle.
  return {
    isServer: typeof window === "undefined",
    backendUrl: process.env.BACKEND_URL,
    publicBackendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
    legacyApiUrl: process.env.NEXT_PUBLIC_API_URL,
  };
}

export const BACKEND_ORIGIN = resolveBackendOrigin(readBackendEnv());

export type PublicEnv = {
  sentryDsn: string
  environment: string
};

export function readPublicEnv(): PublicEnv {
  // Referenced literally so Next inlines it in the client bundle (empty string when unset).
  return {
    sentryDsn: (process.env.NEXT_PUBLIC_SENTRY_DSN ?? "").trim(),
    environment: process.env.NODE_ENV ?? "development",
  };
}

export function readGoogleClientId(): string {
  // Referenced literally so Next can inline it in the client bundle (empty string when unset).
  return (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}
