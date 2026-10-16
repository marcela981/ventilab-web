/*
* Funcionalidad: Lab settings entity
* Descripción: Pure resolution of the lab settings (reservation slot, maximum duration, booking window, upcoming limits, telemetry staleness, command rate and acknowledgement timeout, command safety limits). With the platform settings list (readable only with settings:manage) each key takes its effective numeric server value; a key missing there, or not numeric, keeps the vendored backend default. Without the list every key is the vendored default (backend gap: no non-admin read). The backend stays the authority in both cases. Depends on the vendored defaults and the lab DTOs (types).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { PlatformSettingDTO } from "../../api/dtos/lab.dto";
import { VENDORED_LAB_SETTING_DEFAULTS } from "../config/vendored/lab-settings.defaults";
import type { LabSettingKey } from "../config/vendored/lab-settings.defaults";

export type { LabSettingKey };

export type LabSettings = Readonly<Record<LabSettingKey, number>>;

export type LabSettingsSource = "server" | "defaults";

export type ResolvedLabSettings = {
  settings: LabSettings
  source: LabSettingsSource
};

export const LAB_SETTING_DEFAULTS: LabSettings = VENDORED_LAB_SETTING_DEFAULTS;

const LAB_SETTING_KEYS = Object.keys(VENDORED_LAB_SETTING_DEFAULTS) as LabSettingKey[];

export function resolveLabSettings(serverSettings: readonly PlatformSettingDTO[] | null): ResolvedLabSettings {
  if (!serverSettings) {
    return { settings: LAB_SETTING_DEFAULTS, source: "defaults" };
  }

  const byKey = new Map(serverSettings.map((setting) => [setting.key, setting.value]));
  const settings = Object.fromEntries(LAB_SETTING_KEYS.map((key) => {
    const value = byKey.get(key);

    return [key, typeof value === "number" && Number.isFinite(value) ? value : LAB_SETTING_DEFAULTS[key]];
  })) as Record<LabSettingKey, number>;

  return { settings, source: "server" };
}
