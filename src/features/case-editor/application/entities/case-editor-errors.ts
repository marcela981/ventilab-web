/*
* Funcionalidad: Case editor error messages and server field errors
* Descripción: Spanish messages of the case editor failures and the mapping of a save error to a draft field. The
*   backend answers a value outside its physiological range with 422 `clinical-cases.physiological_range_violation`
*   and an inconsistent definition with 400 `clinical-cases.invalid_definition`; neither carries the field as data
*   (BACKEND GAP), only inside the translated message, which always starts with the field path ("{field} = {value}
*   …") or ends with it ("… at/en {field}"), so the path is read from there. The DTO paths with an index
*   (`events[2].simTimeMs`, `mechanics.recruitmentCurve[0].peepCmH2O`) are mapped back to the row keys of the draft
*   in DTO order; the initial ventilator settings and the rubric errors land on their whole section. Other known codes
*   (403, 404, 409 with sessions, network) get their own message. Depends on the api-client error type and the case editor config.
*   v1.1 (T12): the messages of a case in use (delete 409) and of a case the engine cannot simulate (test run).
*   v1.2 (review of 50ed812): `isRenderedFieldId` knows the field ids the editor renders with an error slot; a server
*   path mapped to any other id (or to a row that no longer exists) falls back to the page message with the detail.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import {
  EVENT_PARAMETER_FIELDS,
  EVENT_TIME_FIELD,
  INITIAL_STATE_FIELDS,
  MECHANICS_FIELDS,
  PATIENT_FIELDS,
  RECRUITMENT_FIELDS,
  TARGET_MAX_FIELDS,
  TARGET_RANGE_FIELDS,
} from "../config/case-editor.config";

export const RANGE_VIOLATION_CODE = "clinical-cases.physiological_range_violation";
export const INVALID_DEFINITION_CODE = "clinical-cases.invalid_definition";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const CASE_ERROR_COPY = {
  rangeViolation: "El servidor rechazó un valor fuera del rango fisiológicamente plausible.",
  invalidDefinition: "El servidor encontró una inconsistencia en la definición del caso.",
  hasSessions: "El caso ya tiene sesiones de simulación: duplícalo para cambiar su definición.",
  forbidden: "No tienes permiso para gestionar casos clínicos.",
  notFound: "El caso clínico no existe o fue eliminado.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  generic: "No se pudo completar la acción. Inténtalo de nuevo.",
  notSimulationReady: "El caso no está listo para simular: completa la mecánica, los ajustes iniciales del ventilador y el estado inicial.",
  validation: "Revisa los datos del caso: el servidor no los aceptó.",
  engineNotReady: "El motor no puede simular el caso guardado: revisa la mecánica, los ajustes iniciales y el estado inicial, y guarda.",
  inUse: "El caso está en uso (sesiones, intentos o preguntas de evaluación) y no se puede eliminar.",
} as const;

const CODE_MESSAGES: Readonly<Record<string, string>> = {
  [RANGE_VIOLATION_CODE]: CASE_ERROR_COPY.rangeViolation,
  [INVALID_DEFINITION_CODE]: CASE_ERROR_COPY.invalidDefinition,
  "clinical-cases.clinical_case_has_simulation_sessions": CASE_ERROR_COPY.hasSessions,
  "clinical-cases.clinical_case_not_found": CASE_ERROR_COPY.notFound,
  "clinical-cases.clinical_case_not_simulation_ready": CASE_ERROR_COPY.notSimulationReady,
  "clinical-cases.clinical_case_in_use": CASE_ERROR_COPY.inUse,
  "simulation.case_not_ready": CASE_ERROR_COPY.engineNotReady,
  [CLIENT_ERROR_CODES.networkUnavailable]: CASE_ERROR_COPY.network,
  [CLIENT_ERROR_CODES.networkTimeout]: CASE_ERROR_COPY.network,
};

export function getCaseEditorErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  const byCode = CODE_MESSAGES[apiError.code];

  if (byCode) {
    return byCode;
  }

  if (apiError.status === 403) {
    return CASE_ERROR_COPY.forbidden;
  }

  if (apiError.status === 404) {
    return CASE_ERROR_COPY.notFound;
  }

  return apiError.status === 400 || apiError.status === 422 ? CASE_ERROR_COPY.validation : CASE_ERROR_COPY.generic;
}

/** Path of the offending field inside the translated message of a range or definition error; null when absent. */
export function serverErrorPath(code: string, message: string): string | null {
  if (code === RANGE_VIOLATION_CODE) {
    return /^(\S+) = /.exec(message.trim())?.[1] ?? null;
  }

  if (code === INVALID_DEFINITION_CODE) {
    return /(\S+)$/.exec(message.trim())?.[1] ?? null;
  }

  return null;
}

export type RowKeys = { eventKeys: readonly string[], curveKeys: readonly string[] };

/** Draft field id of a server DTO path (indices → row keys; ventilator settings and rubric → their section). */
export function toDraftFieldId(path: string, keys: RowKeys): string | null {
  const event = /^events\[(\d+)\](.*)$/.exec(path);

  if (event) {
    const key = keys.eventKeys[Number(event[1])];

    return key ? `events.${key}${event[2] ?? ""}` : null;
  }

  const point = /^mechanics\.recruitmentCurve\[(\d+)\](.*)$/.exec(path);

  if (point) {
    const key = keys.curveKeys[Number(point[1])];

    return key ? `mechanics.recruitmentCurve.${key}${point[2] ?? ""}` : null;
  }

  if (path.startsWith("initialVentilatorSettings")) {
    return "initialVentilatorSettings";
  }

  if (path.startsWith("defaultRubric")) {
    return "defaultRubric";
  }

  if (path === "history" || path.startsWith("history.")) {
    return "history.presentIllness";
  }

  return path;
}

/** Field ids that do not depend on a row: the fields every editor renders with an error slot. */
const STATIC_FIELD_IDS: ReadonlySet<string> = new Set([
  "title",
  "summary",
  "description",
  "mainDiagnosis",
  "educationalGoal",
  "history.presentIllness",
  "patientSex",
  ...Object.values(PATIENT_FIELDS).map((field) => field.path),
  ...MECHANICS_FIELDS.map((field) => field.path),
  ...INITIAL_STATE_FIELDS.map((field) => field.path),
  ...Object.values(TARGET_RANGE_FIELDS).flatMap((field) => [`${field.path}.min`, `${field.path}.max`]),
  ...Object.values(TARGET_MAX_FIELDS).map((field) => field.path),
  "initialVentilatorSettings",
  "defaultRubric",
]);

const EVENT_FIELD_SUFFIXES: ReadonlySet<string> = new Set(["", `.${EVENT_TIME_FIELD.path}`, ".type", ...Object.keys(EVENT_PARAMETER_FIELDS).map((key) => `.${key}`)]);
const CURVE_FIELD_SUFFIXES: ReadonlySet<string> = new Set(Object.values(RECRUITMENT_FIELDS).map((field) => `.${field.path}`));

function rowSuffix(fieldId: string, prefix: string, keys: readonly string[]): string | null {
  const key = keys.find((candidate) => fieldId === `${prefix}${candidate}` || fieldId.startsWith(`${prefix}${candidate}.`));

  return key === undefined ? null : fieldId.slice(`${prefix}${key}`.length);
}

/** Whether the editor renders an error slot for this draft field id (rows only for the current row keys). */
export function isRenderedFieldId(fieldId: string, keys: RowKeys): boolean {
  if (STATIC_FIELD_IDS.has(fieldId)) {
    return true;
  }

  const eventSuffix = rowSuffix(fieldId, "events.", keys.eventKeys);

  if (eventSuffix !== null) {
    return EVENT_FIELD_SUFFIXES.has(eventSuffix);
  }

  const curveSuffix = rowSuffix(fieldId, "mechanics.recruitmentCurve.", keys.curveKeys);

  return curveSuffix !== null && CURVE_FIELD_SUFFIXES.has(curveSuffix);
}

export type ServerFieldError = { field: string | null, message: string };

/**
 * The save error as a field error (null field: a page-level message). A path the editor does not render (a block it
 * does not edit, a row that is gone) falls back to the page message with the server detail, so it is never lost.
 */
export function mapSaveError(error: unknown, keys: RowKeys): ServerFieldError {
  const apiError = toApiError(error);
  const path = serverErrorPath(apiError.code, apiError.message);
  const message = getCaseEditorErrorMessage(apiError);

  if (path === null) {
    return { field: null, message };
  }

  const field = toDraftFieldId(path, keys);
  const detailed = `${message} ${apiError.message}`;

  return { field: field !== null && isRenderedFieldId(field, keys) ? field : null, message: detailed };
}
