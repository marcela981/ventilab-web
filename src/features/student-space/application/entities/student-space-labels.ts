/*
* Funcionalidad: Student space labels
* Descripción: Spanish display labels of the student space: evaluation type (Examen, Quiz, Taller), simulation session mode and status, AI conversation scope and the passed/failed state of a published grade (always shown as text next to its semantic colour). Unknown API values are shown as they come. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

// TODO(i18n): move to a student-space namespace in src/i18n.
export const EVALUATION_TYPE_LABELS: Readonly<Record<string, string>> = {
  EXAM: "Examen",
  QUIZ: "Quiz",
  WORKSHOP: "Taller",
};

export const SIMULATION_MODE_LABELS: Readonly<Record<string, string>> = {
  FREE: "Práctica libre",
  EXAM: "Examen",
};

export const SIMULATION_STATUS_LABELS: Readonly<Record<string, string>> = {
  ACTIVE: "En curso",
  ENDED: "Finalizada",
};

export const CONVERSATION_SCOPE_LABELS: Readonly<Record<string, string>> = {
  FREE: "Libre",
  LESSON: "Lección",
  MODULE: "Módulo",
  PAGE: "Página",
};

export const GRADE_STATE_LABELS = {
  passed: "Aprobada",
  failed: "No aprobada",
} as const;

export function labelOf(labels: Readonly<Record<string, string>>, value: string): string {
  return Object.prototype.hasOwnProperty.call(labels, value) ? labels[value] ?? value : value;
}
