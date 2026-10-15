/*
* Funcionalidad: Evaluation labels
* Descripción: Spanish display labels of the student evaluations feature: evaluation type (Examen, Quiz, Taller), state tabs (Activas, Próximas, Cerradas) and attempt status (En curso, Enviado, Pendiente de calificación, Calificado), plus the attempts summary text ("1 de 3 intentos"). Depends on the evaluation entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AttemptStatus, EvaluationState, EvaluationType } from "./evaluation.entity";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const EVALUATION_TYPE_LABELS: Record<EvaluationType, string> = {
  EXAM: "Examen",
  QUIZ: "Quiz",
  WORKSHOP: "Taller",
};

export const EVALUATION_STATE_LABELS: Record<EvaluationState, string> = {
  ACTIVE: "Activas",
  UPCOMING: "Próximas",
  CLOSED: "Cerradas",
};

export const ATTEMPT_STATUS_LABELS: Record<AttemptStatus, string> = {
  IN_PROGRESS: "En curso",
  SUBMITTED: "Enviado",
  PENDING_REVIEW: "Pendiente de calificación",
  GRADED: "Calificado",
};

export function formatAttemptsUsed(used: number, max: number): string {
  return `${used} de ${max} ${max === 1 ? "intento" : "intentos"}`;
}
