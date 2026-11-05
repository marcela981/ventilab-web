/*
* Funcionalidad: Group builder entity
* Descripción: Pure model of "Conformar grupo" (July's GroupBuilderModal): the July texts (title, fields and placeholders, "Integrantes", actions, success and the exact partial failure message `Grupo creado, pero ${n} estudiante(s) no pudieron agregarse.`), settleWithConcurrency (Promise.allSettled semantics with at most N tasks in flight, results in input order; the members are added 4 at a time) and the Spanish reason of a member that could not be added (409 → already in an active student group, role not allowed, full group, no permission). Depends on the shared API error helpers. v1.1 (ajustes D2): copy of the "Agregar a grupo existente" dialog.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

/** Members added at the same time (DISENO_BLOQUE4 §2.3). */
export const MEMBER_CONCURRENCY = 4;

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const GROUP_BUILDER_COPY = {
  title: "Conformar Grupo",
  selectedCount: (count: number) => `${count} estudiante${count === 1 ? "" : "s"} seleccionado${count === 1 ? "" : "s"}`,
  name: "Nombre del grupo",
  namePlaceholder: "Ej: Grupo A — Turno mañana",
  semester: "Semestre (opcional)",
  semesterPlaceholder: "Ej: 2026-1",
  members: "Integrantes",
  noMembers: "No hay estudiantes seleccionados.",
  cancel: "Cancelar",
  close: "Cerrar",
  create: "Crear Grupo",
  creating: "Creando el grupo…",
  success: "¡Grupo creado correctamente!",
  partialFailure: (count: number) => `Grupo creado, pero ${count} estudiante(s) no pudieron agregarse.`,
  failureList: "Estudiantes que no se agregaron",
  failureItem: (name: string, reason: string) => `${name}: ${reason}`,
  createFailed: "No se pudo crear el grupo.",
} as const;

export const ADD_TO_GROUP_COPY = {
  title: "Agregar a grupo existente",
  group: "Grupo",
  chooseGroup: "Elige un grupo",
  noGroups: "No tienes grupos de estudiantes. Usa «Conformar Grupo» para crear uno.",
  loadingGroups: "Cargando grupos…",
  loadGroupsFailed: "No se pudieron cargar tus grupos.",
  members: "Estudiantes",
  cancel: "Cancelar",
  close: "Cerrar",
  add: "Agregar",
  adding: "Agregando…",
  success: (group: string) => `Se agregaron al grupo «${group}».`,
  partialFailure: (count: number) => `${count} estudiante(s) no pudieron agregarse.`,
  failureList: "Estudiantes que no se agregaron",
} as const;

export const MEMBER_FAILURE_REASONS = {
  "groups.student_already_in_group": "ya pertenece a otro grupo activo de estudiantes.",
  "groups.member_role_not_allowed": "no es un estudiante.",
  "groups.group_full": "el grupo alcanzó su límite de estudiantes.",
  "groups.management_forbidden": "no tienes permiso para gestionar este grupo.",
} as const satisfies Record<string, string>;

const MEMBER_FAILURE_FALLBACKS = {
  conflict: "ya pertenece a otro grupo activo de estudiantes.",
  forbidden: "no tienes permiso para agregarlo.",
  notFound: "el estudiante o el grupo ya no existen.",
  network: "no se pudo conectar con el servidor.",
  unknown: "no se pudo agregar.",
} as const;

function isKnownReason(code: string): code is keyof typeof MEMBER_FAILURE_REASONS {
  return Object.prototype.hasOwnProperty.call(MEMBER_FAILURE_REASONS, code);
}

/** Why one student could not be added, in lower case to follow the student's name. */
export function memberFailureReason(error: unknown): string {
  const apiError = toApiError(error);

  if (isKnownReason(apiError.code)) {
    return MEMBER_FAILURE_REASONS[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable || apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return MEMBER_FAILURE_FALLBACKS.network;
  }

  const byStatus: Record<number, string> = {
    403: MEMBER_FAILURE_FALLBACKS.forbidden,
    404: MEMBER_FAILURE_FALLBACKS.notFound,
    409: MEMBER_FAILURE_FALLBACKS.conflict,
  };

  return byStatus[apiError.status] ?? MEMBER_FAILURE_FALLBACKS.unknown;
}

/** Promise.allSettled over `items` with at most `limit` tasks running at once; results keep the input order. */
export async function settleWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array<PromiseSettledResult<R>>(items.length);
  let next = 0;

  const worker = async(): Promise<void> => {
    while (next < items.length) {
      const index = next;

      next += 1;

      try {
        results[index] = { status: "fulfilled", value: await task(items[index] as T) };
      } catch (reason: unknown) {
        results[index] = { status: "rejected", reason };
      }
    }
  };

  await Promise.allSettled(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));

  return results;
}
