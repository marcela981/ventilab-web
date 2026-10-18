/*
* Funcionalidad: Admin operations mapper
* Descripción: Maps the audit rows of `GET /api/audit` and `GET /api/audit/targets/{type}/{id}` to AuditEntry (before, after and metadata read defensively as plain objects because the generated schema types them as empty records) and the AI rating stats groups to AiRatingGroup (dimension means kept optional exactly as returned). Telemetry stats and system status are read as they come. Depends on the admin console DTOs and entities. v1.1 (closure B2): the audit entry of `GET /api/audit/{id}` maps through toAuditEntry too; the audit catalog (actions, target types, export row limit) and the research export dictionary columns.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AiRatingGroup } from "../../application/entities/ai-analytics.entity";
import type { AuditCatalog, AuditEntry, AuditRecord } from "../../application/entities/audit.entity";
import type { ResearchColumn } from "../../application/entities/research-dictionary.entity";
import type { AiRatingStatsGroupDTO, AuditLogCatalogDTO, AuditLogEntryDTO, ResearchExportColumnDTO } from "../dtos/admin-console.dto";

export function toAuditCatalog(dto: AuditLogCatalogDTO): AuditCatalog {
  return { actions: [...dto.actions], targetTypes: [...dto.targetTypes], exportRowLimit: dto.exportRowLimit };
}

export function toResearchColumn(dto: ResearchExportColumnDTO): ResearchColumn {
  return { column: dto.column, type: dto.type, description: dto.description, example: dto.example };
}

function toRecord(value: unknown): AuditRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as AuditRecord) : null;
}

export function toAuditEntry(dto: AuditLogEntryDTO): AuditEntry {
  return {
    id: dto.id,
    performedAt: dto.performedAt,
    action: dto.action,
    actorId: dto.actorId,
    actorRole: dto.actorRole,
    targetType: dto.targetType,
    targetId: dto.targetId,
    targetCollection: dto.targetCollection,
    description: dto.description,
    reason: dto.reason,
    ip: dto.ip,
    requestId: dto.requestId,
    before: toRecord(dto.before),
    after: toRecord(dto.after),
    metadata: toRecord(dto.metadata),
  };
}

export function toAiRatingGroup(dto: AiRatingStatsGroupDTO): AiRatingGroup {
  const { quality, understanding, trust, expression, safety } = dto.dimensions;

  return {
    useCase: dto.useCase,
    provider: dto.provider,
    model: dto.model,
    promptVersion: dto.promptVersion,
    ratings: dto.ratings,
    helpfulCount: dto.helpfulCount,
    helpfulRate: dto.helpfulRate,
    dimensions: { quality, understanding, trust, expression, safety },
  };
}
