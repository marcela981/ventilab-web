/*
* Funcionalidad: My grades mapper
* Descripción: Maps `GET /api/my-evaluations/grades` (MyEvaluationGradeDTO[]) to MyGrade entities, copying grade, points and `passed` as the API returns them. Depends on the student space DTOs and entities. v1.1 (B2 closure): copies moduleId and moduleTitle.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { MyGrade } from "../../application/entities/my-grade.entity";
import type { MyEvaluationGradeDTO } from "../dtos/student-space.dto";

export function toMyGrade(dto: MyEvaluationGradeDTO): MyGrade {
  return {
    attemptId: dto.attemptId,
    attemptNumber: dto.attemptNumber,
    evaluationId: dto.evaluationId,
    evaluationTitle: dto.evaluationTitle,
    evaluationType: dto.evaluationType,
    moduleId: dto.moduleId,
    moduleTitle: dto.moduleTitle,
    grade: dto.grade,
    passed: dto.passed,
    publishedAt: dto.publishedAt,
    score: dto.score,
    maxScore: dto.maxScore,
  };
}

export function toMyGrades(dtos: readonly MyEvaluationGradeDTO[]): MyGrade[] {
  return dtos.map(toMyGrade);
}
