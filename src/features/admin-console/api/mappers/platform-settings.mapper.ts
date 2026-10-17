/*
* Funcionalidad: Platform settings mapper
* Descripción: Maps PlatformSettingDTO to the client PlatformSetting (value and default kept as unknown JSON, limits as a free-form record), groups the settings by category in tab order and keeps only the AI providers of the system status that have credentials (`configured: true`) as the providers a chain may add. Depends on the admin console DTOs, config and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { SETTING_CATEGORIES } from "../../application/config/admin-console.config";
import type { SettingCategory } from "../../application/config/admin-console.config";
import type { PlatformSetting } from "../../application/entities/platform-setting.entity";
import type { ConfiguredProvider } from "../../application/entities/provider-chain.entity";
import type { PlatformSettingDTO, SystemStatusDTO } from "../dtos/admin-console.dto";

export function toPlatformSetting(dto: PlatformSettingDTO): PlatformSetting {
  return {
    key: dto.key,
    category: dto.category,
    description: dto.description,
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

export function toConfiguredProviders(status: SystemStatusDTO): ConfiguredProvider[] {
  return status.components.aiProviders.providers
    .filter((provider) => provider.configured)
    .map((provider) => ({ provider: provider.provider, available: provider.available }));
}
