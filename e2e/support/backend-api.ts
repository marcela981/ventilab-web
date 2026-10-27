/*
* Funcionalidad: E2E backend API helper
* Descripción: Direct calls to the ventylab-server REST API for test setup and cleanup that the scenario does not exercise through the UI (a teacher reserving the ventilator for a group, creating and assigning an exam). It reuses a saved browser session of e2e/.auth: the refresh token in its localStorage buys a fresh access token through POST /api/auth/refresh, so no extra sign-in counts against the backend limit; `savedUserOf` reads the user snapshot (id, name) saved with the same session. The backend URL comes from E2E_API_URL (default http://localhost:4000). Depends on @playwright/test.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readFileSync } from "node:fs";
import type { APIRequestContext } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000";

const REFRESH_TOKEN_KEY = "ventilab_refresh_token";
const SESSION_USER_KEY = "ventilab_session_user";

type Envelope<T> = { success: boolean, message: string, data: T, code: string | null };

type StorageState = { origins: { origin: string, localStorage: { name: string, value: string }[] }[] };

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type BackendApi = {
  call: <T = unknown>(method: HttpMethod, path: string, body?: unknown) => Promise<T>
};

export type SavedUser = { id: string, email: string, name: string, role: string };

function savedEntry(storageStatePath: string, key: string): string {
  const state = JSON.parse(readFileSync(storageStatePath, "utf8")) as StorageState;
  const value = state.origins.flatMap((origin) => origin.localStorage).find((entry) => entry.name === key)?.value;

  if (!value) {
    throw new Error(`No ${key} in ${storageStatePath}: run the setup project first`);
  }

  return value;
}

/** User snapshot the app saved with the session (id and display name of the account). */
export function savedUserOf(storageStatePath: string): SavedUser {
  return JSON.parse(savedEntry(storageStatePath, SESSION_USER_KEY)) as SavedUser;
}

function refreshTokenOf(storageStatePath: string): string {
  return savedEntry(storageStatePath, REFRESH_TOKEN_KEY);
}

/** API client authenticated as the account saved in the given storage state. */
export async function backendApiAs(request: APIRequestContext, storageStatePath: string): Promise<BackendApi> {
  const refreshed = await request.post(`${API_URL}/api/auth/refresh`, { data: { refreshToken: refreshTokenOf(storageStatePath) } });

  if (!refreshed.ok()) {
    throw new Error(`Token refresh failed (${refreshed.status()}) for ${storageStatePath}`);
  }

  const { accessToken } = ((await refreshed.json()) as Envelope<{ accessToken: string }>).data;

  return {
    async call<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
      const response = await request.fetch(`${API_URL}${path}`, {
        method,
        headers: { authorization: `Bearer ${accessToken}` },
        data: body,
      });
      const payload = (await response.json().catch(() => null)) as Envelope<T> | null;

      if (!response.ok()) {
        throw new Error(`${method} ${path} → ${response.status()} ${payload?.code ?? ""} ${payload?.message ?? ""}`);
      }

      return payload?.data as T;
    },
  };
}
