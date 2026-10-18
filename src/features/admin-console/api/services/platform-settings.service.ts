/*
* Funcionalidad: Platform settings service
* Descripción: API paths and mutations of the platform settings (ADMIN, settings:manage): the list of every setting (`GET /api/platform-settings`, one request grouped by category on the client), the update (`PATCH /api/platform-settings/{key} {value, version}`) and the reset to the default (`POST /api/platform-settings/{key}/reset {version}`), both with optimistic concurrency (409 platform-settings.version_conflict). The system status path stays for the status page. Depends on @shared/api-client. v1.1 (closure B2): the AI providers and their models for the provider chain editor come from `GET /api/admin/ai/providers`; string values are valid bodies.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPatch, apiPost } from "@shared/api-client/api-request";
import type { components } from "@shared/api-client/generated/schema";

export const PLATFORM_SETTINGS_PATH = "/api/platform-settings";
export const PLATFORM_SETTING_PATH = "/api/platform-settings/{key}";
export const PLATFORM_SETTING_RESET_PATH = "/api/platform-settings/{key}/reset";
export const SYSTEM_STATUS_PATH = "/api/system/status";
export const AI_PROVIDERS_PATH = "/api/admin/ai/providers";

// Any JSON value of the registry (number, boolean, string, array or object); the registry validates it per key.
type SettingBodyValue = components["schemas"]["UpdatePlatformSettingDTO"]["value"];

export async function updatePlatformSetting(key: string, value: unknown, version: number): Promise<void> {
  await apiPatch(PLATFORM_SETTING_PATH, { params: { key }, body: { value: value as SettingBodyValue, version } });
}

export async function resetPlatformSetting(key: string, version: number): Promise<void> {
  await apiPost(PLATFORM_SETTING_RESET_PATH, { params: { key }, body: { version } });
}
