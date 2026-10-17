/*
* Funcionalidad: Admin console DTOs
* Descripción: Response types of the endpoints read by the admin console, taken from the generated OpenAPI schema: users (`GET /api/users`, UserDTO without any superadmin flag), groups for the user filter (`GET /api/groups`), platform settings (`GET /api/platform-settings`, PlatformSettingDTO with free-form limits and no field types) and the AI providers of the system status (`GET /api/system/status`, components.aiProviders.providers[].configured). v1.1 (O4b): audit entries (`GET /api/audit`; before/after are typed as empty records by the generator and are read as unknown), AI telemetry stats (totals and days), AI rating stats groups and target types, the AI probe result and the ventilator telemetry metrics with their latency summaries. Types only.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type UserDTO = Schemas["UserDTO"];
export type UserRoleDTO = UserDTO["role"];
export type GroupDTO = Schemas["GroupDTO"];
export type PlatformSettingDTO = Schemas["PlatformSettingDTO"];
export type PlatformSettingCategoryDTO = PlatformSettingDTO["category"];
export type SystemStatusDTO = Schemas["SystemStatusDTO"];
export type AiProviderStatusDTO = Schemas["AiProviderStatusDTO"];
export type AuditLogEntryDTO = Schemas["AuditLogEntryDTO"];
export type AiTelemetryStatsDTO = Schemas["AiTelemetryStatsDTO"];
export type AiTelemetryMetricsDTO = Schemas["AiTelemetryMetricsDTO"];
export type AiTelemetryDayMetricsDTO = Schemas["AiTelemetryDayMetricsDTO"];
export type AiRatingStatsDTO = Schemas["AiRatingStatsDTO"];
export type AiRatingStatsGroupDTO = Schemas["AiRatingStatsGroupDTO"];
export type AiRatingTargetTypeDTO = Schemas["AiRatingDTO"]["targetType"];
export type AiProbeDTO = Schemas["AiProbeDTO"];
export type TelemetryMetricsDTO = Schemas["TelemetryMetricsDTO"];
export type LatencySummaryDTO = Schemas["LatencySummaryDTO"];
