/*
* Funcionalidad: Evaluation assignment entities
* Descripción: Domain types and pure rules of the activations of an evaluation (/evaluations/manage/[id]/assignments): EvaluationAssignment (group, window, state UPCOMING|ACTIVE|CLOSED derived by the backend, attempt counts by status), the group choices of the activation dialog, the Spanish state labels, which actions a row allows (close now for UPCOMING and ACTIVE; delete for an activation without attempts, the backend answers 409 otherwise), whether the evaluation can be activated (READY only) and the activation form: its default window (from the next full hour, one week long, in Bogota time), its validation (at least one group, valid dates, end after start) and the request body with the window converted from Bogota wall-clock time to UTC ISO. Depends on @shared/lib/bogota-time and the authoring entities. v1.1 (A4 review W3/S4): an activation can be deleted whenever it has no attempts, whatever its state (the backend rule); validation and the request body take the current instant and reject an end that is not in the future.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { bogotaLocalToUtcIso, utcToBogotaLocal } from "@shared/lib/bogota-time";
import type { EvaluationStatus } from "./evaluation-authoring.entity";

export type AssignmentState = "UPCOMING" | "ACTIVE" | "CLOSED";

export type AssignmentAttemptCounts = {
  inProgress: number
  submitted: number
  pendingReview: number
  graded: number
};

export type EvaluationAssignment = {
  id: string
  groupId: string
  groupName: string
  startsAt: string
  // null only for open-ended legacy assignments.
  endsAt: string | null
  state: AssignmentState
  attemptCounts: AssignmentAttemptCounts
};

export type GroupChoice = {
  id: string
  name: string
  membersCount: number
};

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const ASSIGNMENT_STATE_LABELS: Readonly<Record<AssignmentState, string>> = {
  UPCOMING: "Próxima",
  ACTIVE: "Activa",
  CLOSED: "Cerrada",
};

export const ACTIVATION_ERRORS = {
  groupsRequired: "Elige al menos un grupo.",
  startInvalid: "Indica una fecha y hora de inicio válida.",
  endInvalid: "Indica una fecha y hora de cierre válida.",
  endBeforeStart: "El cierre debe ser posterior al inicio.",
  endNotFuture: "El cierre debe ser una fecha futura.",
} as const;

export function totalAttempts(counts: AssignmentAttemptCounts): number {
  return counts.inProgress + counts.submitted + counts.pendingReview + counts.graded;
}

export function canCloseAssignment(assignment: EvaluationAssignment): boolean {
  return assignment.state !== "CLOSED";
}

// The backend deletes any activation without attempts (409 assignment_has_attempts otherwise).
export function canDeleteAssignment(assignment: EvaluationAssignment): boolean {
  return totalAttempts(assignment.attemptCounts) === 0;
}

// The backend activates READY evaluations only (409 evaluation.not_activatable otherwise).
export function canActivate(status: EvaluationStatus): boolean {
  return status === "READY";
}

export type ActivationForm = {
  groupIds: string[]
  // datetime-local values ("YYYY-MM-DDTHH:mm") read in America/Bogota.
  startsAt: string
  endsAt: string
};

export type ActivationErrors = Partial<Record<"groupIds" | "startsAt" | "endsAt", string>>;

export type ActivationBody = {
  groupIds: string[]
  startsAt: string
  endsAt: string
};

const HOUR_MS = 60 * 60_000;
const DEFAULT_WINDOW_MS = 7 * 24 * HOUR_MS;

// Starts at the next full hour and stays open one week.
export function defaultActivationForm(now: Date): ActivationForm {
  const start = new Date(Math.ceil(now.getTime() / HOUR_MS) * HOUR_MS);
  const end = new Date(start.getTime() + DEFAULT_WINDOW_MS);

  return { groupIds: [], startsAt: utcToBogotaLocal(start) ?? "", endsAt: utcToBogotaLocal(end) ?? "" };
}

// `now` is injected so the "end in the future" rule is testable.
export function validateActivation(form: ActivationForm, now: Date): ActivationErrors {
  const errors: ActivationErrors = {};
  const start = bogotaLocalToUtcIso(form.startsAt);
  const end = bogotaLocalToUtcIso(form.endsAt);

  if (form.groupIds.length === 0) {
    errors.groupIds = ACTIVATION_ERRORS.groupsRequired;
  }

  if (start === null) {
    errors.startsAt = ACTIVATION_ERRORS.startInvalid;
  }

  if (end === null) {
    errors.endsAt = ACTIVATION_ERRORS.endInvalid;
  } else if (start !== null && Date.parse(end) <= Date.parse(start)) {
    errors.endsAt = ACTIVATION_ERRORS.endBeforeStart;
  } else if (Date.parse(end) <= now.getTime()) {
    errors.endsAt = ACTIVATION_ERRORS.endNotFuture;
  }

  return errors;
}

// null while the form is invalid.
export function toActivationBody(form: ActivationForm, now: Date): ActivationBody | null {
  const startsAt = bogotaLocalToUtcIso(form.startsAt);
  const endsAt = bogotaLocalToUtcIso(form.endsAt);

  if (Object.keys(validateActivation(form, now)).length > 0 || startsAt === null || endsAt === null) {
    return null;
  }

  return { groupIds: [...form.groupIds], startsAt, endsAt };
}
