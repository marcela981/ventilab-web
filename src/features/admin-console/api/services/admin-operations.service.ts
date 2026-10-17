/*
* Funcionalidad: Admin operations service
* Descripción: API paths and calls of the operation pages of the admin console: the audit log (`GET /api/audit`, `GET /api/audit/targets/{type}/{id}`, CSV `GET /api/audit/export` whose X-Export-Truncated header says when rows were left out), the AI telemetry and AI ratings stats with their CSV exports (`/api/admin/ai-telemetry/*`, `/api/admin/ai-ratings/*`), the anonymized research export (`GET /api/analytics/research/export.csv`, 503 without the anonymization key), the system status (`GET /api/system/status`), the ventilator telemetry metrics (`GET /api/ventilator/telemetry/metrics`, ADMIN) and the AI provider probe (`POST /api/system/probe/ai/{provider}`, ADMIN, 3 per minute). The CSV calls return the downloaded file and whether the server truncated it; the caller saves it. Depends on @shared/api-client.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGetText, isHeaderTrue } from "@shared/api-client/api-download";
import type { ApiTextFile } from "@shared/api-client/api-download";
import { apiPost } from "@shared/api-client/api-request";
import type { AiProbeDTO } from "../dtos/admin-console.dto";

export const AUDIT_PATH = "/api/audit";
export const AUDIT_EXPORT_PATH = "/api/audit/export";
export const AUDIT_TARGET_PATH = "/api/audit/targets/{type}/{id}";
export const AI_TELEMETRY_STATS_PATH = "/api/admin/ai-telemetry/stats";
export const AI_TELEMETRY_EXPORT_PATH = "/api/admin/ai-telemetry/export.csv";
export const AI_RATINGS_STATS_PATH = "/api/admin/ai-ratings/stats";
export const AI_RATINGS_EXPORT_PATH = "/api/admin/ai-ratings/export.csv";
export const RESEARCH_EXPORT_PATH = "/api/analytics/research/export.csv";
export const TELEMETRY_METRICS_PATH = "/api/ventilator/telemetry/metrics";
export const AI_PROBE_PATH = "/api/system/probe/ai/{provider}";

export const EXPORT_TRUNCATED_HEADER = "X-Export-Truncated";

export type ExportedFile = {
  file: ApiTextFile
  truncated: boolean
};

export type AuditExportQuery = {
  actorId?: string
  action?: string
  targetType?: string
  targetId?: string
  from?: string
  to?: string
};

export type AiTelemetryExportQuery = {
  from?: string
  to?: string
  useCase?: "GRADE_FEEDBACK" | "NOTES_ANALYSIS" | "PAGE_DEEPEN" | "LESSON_QA" | "FREE_CHAT" | "TOPIC_CHECK" | "SIM_ASSIST"
  provider?: string
  model?: string
};

export type AiRatingsExportQuery = AiTelemetryExportQuery & {
  promptVersion?: string
  targetType?: "GRADE_FEEDBACK" | "MESSAGE" | "NOTES_ANALYSIS" | "SIM_ASSIST"
};

function exported(file: ApiTextFile): ExportedFile {
  return { file, truncated: isHeaderTrue(file, EXPORT_TRUNCATED_HEADER) };
}

export async function exportAuditCsv(query: AuditExportQuery): Promise<ExportedFile> {
  return exported(await apiGetText(AUDIT_EXPORT_PATH, { query, timeout: "slow" }));
}

export async function exportAiTelemetryCsv(query: AiTelemetryExportQuery): Promise<ExportedFile> {
  return exported(await apiGetText(AI_TELEMETRY_EXPORT_PATH, { query, timeout: "slow" }));
}

export async function exportAiRatingsCsv(query: AiRatingsExportQuery): Promise<ExportedFile> {
  return exported(await apiGetText(AI_RATINGS_EXPORT_PATH, { query, timeout: "slow" }));
}

export async function exportResearchCsv(groupId: string | null): Promise<ExportedFile> {
  return exported(await apiGetText(RESEARCH_EXPORT_PATH, { query: groupId ? { groupId } : {}, timeout: "slow" }));
}

export async function probeAiProvider(provider: string): Promise<AiProbeDTO> {
  const result = await apiPost(AI_PROBE_PATH, { params: { provider }, timeout: "slow" });

  return result.data;
}
