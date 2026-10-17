/*
* Funcionalidad: Platform settings service
* Descripción: API paths and mutations of the platform settings (ADMIN, settings:manage): the list of every setting (`GET /api/platform-settings`, one request grouped by category on the client), the update (`PATCH /api/platform-settings/{key} {value, version}`) and the reset to the default (`POST /api/platform-settings/{key}/reset {version}`), both with optimistic concurrency (409 platform-settings.version_conflict). The configured AI providers come from the system status (`GET /api/system/status`). Depends on @shared/api-client.
* Versión: 1.0
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

// The generated body type omits strings; every registered setting value is a number, boolean, array or object.
type SettingBodyValue = components["schemas"]["UpdatePlatformSettingDTO"]["value"];

export async function updatePlatformSetting(key: string, value: unknown, version: number): Promise<void> {
  await apiPatch(PLATFORM_SETTING_PATH, { params: { key }, body: { value: value as SettingBodyValue, version } });
}

export async function resetPlatformSetting(key: string, version: number): Promise<void> {
  await apiPost(PLATFORM_SETTING_RESET_PATH, { params: { key }, body: { version } });
}
