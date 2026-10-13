/*
* Funcionalidad: Backend origin resolver
* Descripción: Resolves the backend ORIGIN (no `/api` suffix) with the same precedence as the legacy config: server BACKEND_URL, then NEXT_PUBLIC_BACKEND_URL, then NEXT_PUBLIC_API_URL without its trailing `/api`, then http://localhost:4000. Pure; no dependencies.
* Versión: 1.0
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
