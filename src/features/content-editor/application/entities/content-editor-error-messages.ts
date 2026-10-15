/*
* Funcionalidad: Content editor error messages
* Descripción: Spanish message for any failure of a content editor request. Known backend codes first: curriculum.node_has_student_data (409 on delete of any node with student progress or notes: archive instead), duplicate slug/title (409), invalid reorder (400), not-found codes, lesson creation in an inactive module, invalid lesson content, module without level. Then fallbacks by status (400/422 invalid, 403, 404, 409, 413 too large, 415 unsupported type, 429 with Retry-After, 5xx), timeout, network and unknown. isStudentDataConflict tells the delete flow to offer "Archivar en su lugar". Depends on the api-client errors. v1.1 (C3): prerequisite codes (circular dependency of levels and modules, self prerequisite, missing prerequisite) and isCircularDependency, which tells the prerequisites editor to explain the cycle. v1.2 (C4): page block codes of the page editor (invalid block content, block or media not found, invalid block reorder). v1.3 (C5): media codes of POST/DELETE /api/media (media in use 409, too large 413, unsupported type 415, file required, not found, storage unavailable) and isMediaInUse.
* Versión: 1.3 (C5)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

export const STUDENT_DATA_CONFLICT_CODE = "curriculum.node_has_student_data";
export const MEDIA_IN_USE_CODE = "media.media_in_use";
export const CIRCULAR_DEPENDENCY_CODES = ["levels.level_circular_dependency", "modules.module_circular_dependency"] as const;

const CYCLE_MESSAGE = "Uno de los prerrequisitos elegidos ya depende de este contenido; guardarlo formaría un ciclo.";

const REORDER_MESSAGE = "El orden enviado ya no coincide con el contenido actual. Actualiza la página e inténtalo de nuevo.";

// TODO(i18n): move to a content-editor namespace in src/i18n.
export const CONTENT_ERROR_MESSAGES = {
  [STUDENT_DATA_CONFLICT_CODE]: "Este contenido tiene progreso o notas de estudiantes y no se puede eliminar. Archívalo en su lugar.",
  "sections.section_slug_already_exists": "Ya existe una sección con ese identificador (slug).",
  "pages.page_slug_already_exists": "Ya existe una página con ese identificador (slug).",
  "levels.level_title_already_exists": "Ya existe un nivel con ese título.",
  "modules.module_title_already_exists": "Ya existe un módulo con ese título en este nivel.",
  "sections.invalid_section_reorder": REORDER_MESSAGE,
  "levels.invalid_level_reorder": REORDER_MESSAGE,
  "modules.invalid_module_reorder": REORDER_MESSAGE,
  "lessons.invalid_lesson_reorder": REORDER_MESSAGE,
  "pages.invalid_page_reorder": REORDER_MESSAGE,
  "sections.section_not_found": "La sección ya no existe. Actualiza la página.",
  "levels.level_not_found": "El nivel ya no existe. Actualiza la página.",
  "modules.module_not_found": "El módulo ya no existe. Actualiza la página.",
  "lessons.lesson_not_found": "La lección ya no existe. Actualiza la página.",
  "pages.page_not_found": "La página ya no existe. Actualiza la página.",
  "lessons.inactive_module_lesson_creation": "No se pueden crear lecciones en un módulo inactivo.",
  "lessons.invalid_lesson_content": "El contenido inicial de la lección no es válido.",
  "modules.module_node_level_required": "El módulo debe pertenecer a un nivel.",
  "levels.level_circular_dependency": CYCLE_MESSAGE,
  "modules.module_circular_dependency": CYCLE_MESSAGE,
  "levels.level_self_prerequisite": "Un nivel no puede ser prerrequisito de sí mismo.",
  "modules.module_self_prerequisite": "Un módulo no puede ser prerrequisito de sí mismo.",
  "levels.prerequisite_level_not_found": "Uno de los niveles elegidos ya no existe. Actualiza la página.",
  "modules.prerequisite_module_not_found": "Uno de los módulos elegidos ya no existe. Actualiza la página.",
  "modules.invalid_module_prerequisites": "Uno de los módulos elegidos ya no existe. Actualiza la página.",
  "pages.invalid_page_block": "Uno de los bloques no tiene un contenido válido. Revísalo e inténtalo de nuevo.",
  "pages.page_block_not_found": "Uno de los bloques ya no existe. Actualiza la página.",
  "pages.page_media_not_found": "El archivo de uno de los bloques ya no existe. Elige otro.",
  "pages.invalid_page_block_reorder": REORDER_MESSAGE,
  [MEDIA_IN_USE_CODE]: "Este archivo ya se usa en el contenido guardado de una página y no se puede eliminar. Quítalo de esos bloques y guarda antes de eliminarlo.",
  "media.media_too_large": "El archivo es demasiado grande para su tipo (imágenes hasta 10 MB, PDF hasta 20 MB, videos hasta 100 MB).",
  "media.unsupported_media_type": "Ese tipo de archivo no está permitido. Usa PNG, JPEG, WebP o GIF; PDF; o video MP4 o WebM.",
  "media.file_required": "El archivo está vacío. Elige otro.",
  "media.media_not_found": "El archivo ya no existe. Actualiza la página.",
  "media.storage_unavailable": "El almacenamiento de archivos no está disponible en este momento. Inténtalo más tarde.",
} as const satisfies Record<string, string>;

export const CONTENT_FALLBACK_MESSAGES = {
  invalid: "Revisa los datos ingresados.",
  forbidden: "No tienes permiso para editar este contenido.",
  notFound: "El contenido ya no existe. Actualiza la página.",
  conflict: "La operación no se pudo completar por un conflicto con el estado actual del contenido.",
  tooLarge: "El archivo o el contenido es demasiado grande.",
  unsupportedType: "El tipo de archivo no está permitido.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo completar la operación. Inténtalo de nuevo.",
} as const;

const STATUS_MESSAGES: Record<number, string> = {
  400: CONTENT_FALLBACK_MESSAGES.invalid,
  403: CONTENT_FALLBACK_MESSAGES.forbidden,
  404: CONTENT_FALLBACK_MESSAGES.notFound,
  409: CONTENT_FALLBACK_MESSAGES.conflict,
  413: CONTENT_FALLBACK_MESSAGES.tooLarge,
  415: CONTENT_FALLBACK_MESSAGES.unsupportedType,
  422: CONTENT_FALLBACK_MESSAGES.invalid,
};

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function isKnownCode(code: string): code is keyof typeof CONTENT_ERROR_MESSAGES {
  return Object.prototype.hasOwnProperty.call(CONTENT_ERROR_MESSAGES, code);
}

export function isStudentDataConflict(error: unknown): boolean {
  const apiError = toApiError(error);

  return apiError.status === 409 && apiError.code === STUDENT_DATA_CONFLICT_CODE;
}

export function isMediaInUse(error: unknown): boolean {
  const apiError = toApiError(error);

  return apiError.status === 409 && apiError.code === MEDIA_IN_USE_CODE;
}

export function isCircularDependency(error: unknown): boolean {
  const apiError = toApiError(error);

  return apiError.status === 409 && (CIRCULAR_DEPENDENCY_CODES as readonly string[]).includes(apiError.code);
}

export function getContentErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (isKnownCode(apiError.code)) {
    return CONTENT_ERROR_MESSAGES[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return CONTENT_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return CONTENT_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? CONTENT_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return CONTENT_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? CONTENT_FALLBACK_MESSAGES.unknown;
}
