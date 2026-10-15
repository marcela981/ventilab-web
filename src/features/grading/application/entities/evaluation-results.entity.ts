/*
* Funcionalidad: Evaluation results entities
* Descripción: View models and pure formatting rules of the staff results page /grading/evaluations/[evaluationId]: the evaluation statistics exactly as the API computes them (counts, average, median, minimum, maximum, pass rate, passing grade, 0.5 grade histogram and per-question item analysis), the assignments of the evaluation per group with their attempt counts, and the published grade of each student of a group. Nothing here computes a statistic: it only formats API values (grades in es-CO with one decimal, rates as es-CO percentages, histogram labels such as "3,0–3,5"). Depends on @shared/lib/format. v1.1 (G3 review W1/S1): publishEstimate removed; the bulk-publish confirmation states the scope only and the count comes from the API response.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { formatGrade } from "@shared/lib/format";
import type { GradingEvaluationType } from "./grading.entity";

export type HistogramBin = {
  from: number
  to: number
  count: number
};

export type QuestionStat = {
  questionId: string
  order: number
  type: string
  points: number
  answeredCount: number
  correctCount: number
  // 0..1 as computed by the server; null without graded attempts.
  correctRate: number | null
  difficultyIndex: number | null
};

export type EvaluationStats = {
  evaluationId: string
  title: string
  type: GradingEvaluationType | null
  totalAttempts: number
  gradedCount: number
  publishedCount: number
  averageGrade: number | null
  medianGrade: number | null
  minGrade: number | null
  maxGrade: number | null
  passRate: number | null
  passingGrade: number
  histogram: HistogramBin[]
  questions: QuestionStat[]
};

export type AssignmentState = "UPCOMING" | "ACTIVE" | "CLOSED";

export type AttemptCounts = {
  inProgress: number
  submitted: number
  pendingReview: number
  graded: number
};

export type EvaluationAssignment = {
  id: string
  groupId: string
  groupName: string
  state: AssignmentState
  startsAt: string
  endsAt: string | null
  attemptCounts: AttemptCounts
};

export type StudentResult = {
  userId: string
  name: string | null
  email: string
  grade: number
  passed: boolean
  attemptNumber: number
  publishedAt: string
};

export const MISSING_STAT = "—";

const percentFormatter = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 });
const countFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export function formatStatGrade(value: number | null): string {
  return value === null ? MISSING_STAT : formatGrade(value);
}

// 0..1 from the API → "75 %".
export function formatRate(value: number | null): string {
  return value === null ? MISSING_STAT : percentFormatter.format(value);
}

export function formatCount(value: number): string {
  return countFormatter.format(value);
}

export function formatHistogramLabel(bin: Pick<HistogramBin, "from" | "to">): string {
  return `${formatGrade(bin.from)}–${formatGrade(bin.to)}`;
}

export function questionLabel(stat: Pick<QuestionStat, "order">): string {
  return `Pregunta ${stat.order}`;
}

// Groups of the evaluation for the group filter, one per group, sorted by name.
export function assignmentGroups(assignments: readonly EvaluationAssignment[]): { id: string, label: string }[] {
  const groups = new Map<string, string>();

  for (const assignment of assignments) {
    if (!groups.has(assignment.groupId)) {
      groups.set(assignment.groupId, assignment.groupName);
    }
  }

  return [...groups.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}
