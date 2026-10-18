/*
* Funcionalidad: Teacher dashboard labels and formatters
* Descripción: Spanish labels of the API enums shown by the teacher dashboard (AI use cases, timeline entry kinds, simulation session, evaluation attempt and reservation statuses) with the raw value as fallback, and the es-CO formatters of API values that @shared/lib/format does not cover: percentage of progress or helpfulness, simulation score, seconds to stabilize, ventilator hours and counts. Display only: values are formatted, never derived. Depends only on Intl. v1.1 (closure B2): labels of the API risk reasons, of the caller's group relation and of the simulation session modes.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { TimelineKind } from "./student-timeline.entity";
import type { GroupRelation, RiskReason } from "./teacher-dashboard.entity";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const AI_USE_CASE_LABELS: Record<string, string> = {
  FREE_CHAT: "Chat libre",
  LESSON_QA: "Preguntas de lección",
  PAGE_DEEPEN: "Profundizar página",
  TOPIC_CHECK: "Comprobación de tema",
  NOTES_ANALYSIS: "Análisis de notas",
  GRADE_FEEDBACK: "Retroalimentación de calificación",
};

export const TIMELINE_KIND_LABELS: Record<TimelineKind, string> = {
  LESSON_COMPLETED: "Lección completada",
  EVALUATION_STARTED: "Evaluación iniciada",
  EVALUATION_SUBMITTED: "Evaluación enviada",
  SIMULATION_SESSION: "Sesión de simulación",
  RESERVATION: "Reserva del ventilador",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "En curso",
  ENDED: "Finalizada",
  ABANDONED: "Abandonada",
  IN_PROGRESS: "En curso",
  SUBMITTED: "Enviada",
  PENDING_REVIEW: "Pendiente de calificación",
  GRADED: "Calificada",
  EXPIRED: "Vencida",
  SCHEDULED: "Programada",
  CANCELLED: "Cancelada",
  PREEMPTED: "Desplazada",
  COMPLETED: "Completada",
};

export const RISK_REASON_LABELS: Record<RiskReason, string> = {
  FAILED_EVALUATIONS: "Reprobó evaluaciones",
  LOW_PROGRESS: "Avance bajo",
  INACTIVE: "Inactivo",
};

export const GROUP_RELATION_LABELS: Record<GroupRelation, string> = {
  MANAGED: "A cargo",
  SUPERVISED: "Supervisado",
};

export const SIMULATION_MODE_LABELS: Record<string, string> = {
  FREE: "Práctica libre",
  EXAM: "Examen",
};

export function labelOf(labels: Readonly<Record<string, string>>, value: string): string {
  return Object.prototype.hasOwnProperty.call(labels, value) ? (labels[value] ?? value) : value;
}

const MISSING = "—";
const percentFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const decimalFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const countFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** A 0–100 API percentage ("66,7 %"). */
export function formatPercent(value: number | null): string {
  return value === null ? MISSING : `${percentFormatter.format(value)} %`;
}

export function formatScore(value: number | null): string {
  return value === null ? MISSING : decimalFormatter.format(value);
}

export function formatSeconds(value: number | null): string {
  return value === null ? MISSING : `${decimalFormatter.format(value)} s`;
}

export function formatHours(value: number): string {
  return `${decimalFormatter.format(value)} h`;
}

export function formatCount(value: number): string {
  return countFormatter.format(value);
}

export { MISSING };
