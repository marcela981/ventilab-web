/*
* Funcionalidad: Platform settings mapper
* Descripción: Maps PlatformSettingDTO to the client PlatformSetting (value and default kept as unknown JSON, limits as a free-form record, plus the form metadata of the registry: Spanish label, description and unit, value type and the map key schema with its nested schemas), groups the settings by category in tab order, and maps the AI providers catalog (`GET /api/admin/ai/providers`: provider, configured, models) used by the provider chain editor. Depends on the admin console DTOs, config and entities. v1.1 (closure B2): form metadata and key schema; the providers come from the AI catalog instead of the system status (toConfiguredProviders removed); the analytics category joins the tab order (config).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { SETTING_CATEGORIES } from "../../application/config/admin-console.config";
import type { SettingCategory } from "../../application/config/admin-console.config";
import type { PlatformSetting, SettingKeySchema } from "../../application/entities/platform-setting.entity";
import type { ConfiguredProvider } from "../../application/entities/provider-chain.entity";
import type { AdminAiProviderDTO, PlatformSettingDTO, PlatformSettingKeySchemaDTO } from "../dtos/admin-console.dto";

export function toKeySchema(dto: PlatformSettingKeySchemaDTO | null | undefined): SettingKeySchema | null {
  if (!dto) {
    return null;
  }

  return {
    path: dto.path,
    keyLabel: dto.keyLabel,
    allowedKeys: dto.allowedKeys ? [...dto.allowedKeys] : null,
    valueType: dto.valueType,
    valueLimits: dto.valueLimits ?? null,
    valueKeySchema: toKeySchema(dto.valueKeySchema),
  };
}

export function toPlatformSetting(dto: PlatformSettingDTO): PlatformSetting {
  return {
    key: dto.key,
    category: dto.category,
    label: dto.label || dto.key,
    description: dto.description,
    unit: dto.unit ?? null,
    type: dto.type ?? null,
    keySchema: toKeySchema(dto.keySchema),
    value: dto.value as unknown,
    defaultValue: dto.defaultValue as unknown,
    origin: dto.origin,
    limits: dto.limits,
    version: dto.version,
    updatedAt: dto.updatedAt,
    updatedById: dto.updatedById,
  };
}

export function groupSettingsByCategory(settings: readonly PlatformSetting[]): Record<SettingCategory, PlatformSetting[]> {
  const groups = Object.fromEntries(SETTING_CATEGORIES.map((category) => [category, [] as PlatformSetting[]])) as Record<SettingCategory, PlatformSetting[]>;

  for (const setting of settings) {
    groups[setting.category].push(setting);
  }

  return groups;
}

export function toAiProviderCatalog(providers: readonly AdminAiProviderDTO[]): ConfiguredProvider[] {
  return providers.map((item) => ({ provider: item.provider, configured: item.configured, models: [...item.models] }));
}
