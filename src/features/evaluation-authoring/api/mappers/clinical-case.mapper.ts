/*
* Funcionalidad: Clinical case mapper
* Descripción: Maps the items of `GET /api/clinical-cases` (ClinicalCaseListItemDTO, the case summary plus the attempts of the caller) and the envelope pagination to the clinical case choices of the SIMULATION question editor. Depends on the api-client types, the authoring DTOs and the clinical case entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ApiPagination } from "@shared/api-client/api-types";
import type { ClinicalCaseChoice, ClinicalCasePage } from "../../application/entities/clinical-case-choice.entity";
import type { ClinicalCaseListItemDTO } from "../dtos/evaluation-authoring.dto";

export function toClinicalCaseChoice(dto: ClinicalCaseListItemDTO): ClinicalCaseChoice {
  return {
    id: dto.clinicalCase.id,
    title: dto.clinicalCase.title,
    pathology: dto.clinicalCase.pathology,
    difficulty: dto.clinicalCase.difficulty,
  };
}

export function toClinicalCasePage(items: readonly ClinicalCaseListItemDTO[], pagination: ApiPagination | null): ClinicalCasePage {
  return {
    items: items.map(toClinicalCaseChoice),
    page: pagination?.page ?? 1,
    pages: Math.max(1, pagination?.pages ?? 1),
    total: pagination?.total ?? items.length,
  };
}
