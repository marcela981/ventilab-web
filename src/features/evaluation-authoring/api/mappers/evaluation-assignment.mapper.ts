/*
* Funcionalidad: Evaluation assignment mapper
* Descripción: Maps the EvaluationAssignmentDTO of `GET /api/evaluations/{id}/assignments` to EvaluationAssignment (group, window, the state derived by the backend and the attempt counts), sorted by start (most recent first), and the GroupDTO of `GET /api/groups` to the group choices of the activation dialog: active STUDENT groups only, sorted by name. Depends on the authoring DTOs and the assignment entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { EvaluationAssignment, GroupChoice } from "../../application/entities/evaluation-assignment.entity";
import type { EvaluationAssignmentDTO, GroupDTO } from "../dtos/evaluation-authoring.dto";

export function toEvaluationAssignment(dto: EvaluationAssignmentDTO): EvaluationAssignment {
  return {
    id: dto.id,
    groupId: dto.groupId,
    groupName: dto.groupName,
    startsAt: dto.startsAt,
    endsAt: dto.endsAt,
    state: dto.state,
    attemptCounts: {
      inProgress: dto.attemptCounts.inProgress,
      submitted: dto.attemptCounts.submitted,
      pendingReview: dto.attemptCounts.pendingReview,
      graded: dto.attemptCounts.graded,
    },
  };
}

export function toEvaluationAssignments(dtos: readonly EvaluationAssignmentDTO[]): EvaluationAssignment[] {
  return dtos.map(toEvaluationAssignment).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

// Evaluations are activated for active STUDENT groups only (422 otherwise).
export function toGroupChoices(dtos: readonly GroupDTO[]): GroupChoice[] {
  return dtos
    .filter((dto) => dto.type === "STUDENT" && dto.isActive)
    .map((dto) => ({ id: dto.id, name: dto.name, membersCount: dto.membersCount }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
