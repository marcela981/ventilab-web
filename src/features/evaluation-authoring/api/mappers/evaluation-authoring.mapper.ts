/*
* Funcionalidad: Evaluation authoring mapper
* Descripción: Maps the authoring DTOs to the feature entities: an evaluation summary of `GET /api/evaluations` to an EvaluationListItem, and the list result (items plus the envelope pagination) to an EvaluationListPage; a missing pagination falls back to a single page holding the items. Depends on the authoring DTOs and entities and the api-client types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ApiPagination } from "@shared/api-client/api-types";
import type { EvaluationListItem, EvaluationListPage } from "../../application/entities/evaluation-authoring.entity";
import type { EvaluationSummaryDTO } from "../dtos/evaluation-authoring.dto";

export function toEvaluationListItem(dto: EvaluationSummaryDTO): EvaluationListItem {
  return {
    id: dto.id,
    title: dto.title,
    type: dto.type,
    status: dto.status,
    moduleId: dto.moduleId,
    levelId: dto.levelId,
    questionCount: dto.questionCount,
    scenarioCount: dto.scenarioCount,
    assignmentCount: dto.assignmentCount,
    canManage: dto.canManage,
    createdByName: dto.createdByName,
    updatedAt: dto.updatedAt,
  };
}

export function toEvaluationListPage(items: readonly EvaluationSummaryDTO[], pagination: ApiPagination | null): EvaluationListPage {
  return {
    items: items.map(toEvaluationListItem),
    total: pagination?.total ?? items.length,
    page: pagination?.page ?? 1,
    pages: pagination?.pages ?? 1,
  };
}
