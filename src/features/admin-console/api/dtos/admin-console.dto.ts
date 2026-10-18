/*
* Funcionalidad: Admin console DTOs
* Descripción: Response types of the endpoints read by the admin console, taken from the generated OpenAPI schema: users (`GET /api/users`), groups for the user filter (`GET /api/groups`), platform settings (`GET /api/platform-settings`, PlatformSettingDTO with free-form limits) and the AI providers of the system status (`GET /api/system/status`, components.aiProviders.providers[].configured). v1.1 (O4b): audit entries (`GET /api/audit`; before/after are typed as empty records by the generator and are read as unknown), AI telemetry stats (totals and days), AI rating stats groups and target types, the AI probe result and the ventilator telemetry metrics with their latency summaries. Types only. v1.2 (closure B2): UserDTO now carries `studentCode` and `isSuperadmin`; PlatformSettingDTO its form metadata (`type`, `label`, `unit`, Spanish `description`, `keySchema`); the per-field error (`FieldError`), the AI providers catalog (`GET /api/admin/ai/providers`), the audit catalog (`GET /api/audit/catalog`) and the research export data dictionary columns. v1.3 (B3.10): unused aliases removed (PlatformSettingCategoryDTO, PlatformSettingTypeDTO, FieldErrorDTO, AiRatingStatsDTO, AiRatingTargetTypeDTO, LatencySummaryDTO).
* Versión: 1.3
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
export type PlatformSettingKeySchemaDTO = Schemas["PlatformSettingKeySchemaDTO"];
export type AdminAiProviderDTO = Schemas["AdminAiProviderDTO"];
export type AuditLogCatalogDTO = Schemas["AuditLogCatalogDTO"];
export type ResearchExportColumnDTO = Schemas["ResearchExportColumnDTO"];
export type SystemStatusDTO = Schemas["SystemStatusDTO"];
export type AiProviderStatusDTO = Schemas["AiProviderStatusDTO"];
export type AuditLogEntryDTO = Schemas["AuditLogEntryDTO"];
export type AiTelemetryStatsDTO = Schemas["AiTelemetryStatsDTO"];
export type AiTelemetryMetricsDTO = Schemas["AiTelemetryMetricsDTO"];
export type AiTelemetryDayMetricsDTO = Schemas["AiTelemetryDayMetricsDTO"];
export type AiRatingStatsGroupDTO = Schemas["AiRatingStatsGroupDTO"];
export type AiProbeDTO = Schemas["AiProbeDTO"];
export type TelemetryMetricsDTO = Schemas["TelemetryMetricsDTO"];
