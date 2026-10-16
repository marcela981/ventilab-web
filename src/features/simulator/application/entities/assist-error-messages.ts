/*
* Funcionalidad: Simulator AI assist error messages
* Descripción: Spanish message of a failed assist request. It reuses the shared AI conversation messages (daily quota
*   with its local reset time from Retry-After/resetAt, provider unavailable, interrupted stream, failed answer, plain
*   429, network, timeout and 5xx) and only adds the assist-specific texts of the contract errors: 403 (assistance not
*   allowed in this session, e.g. disabled in the exam), 404 (no session) and 409 (session not active). Loaded only
*   with the assist panel chunk. Depends on @shared/ai-conversation and the api-client error type.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { getAiErrorMessage, getGenericErrorMessage } from "@shared/ai-conversation";
import type { ApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const ASSIST_ERROR_COPY = {
  forbidden: "No puedes solicitar asesoría en esta sesión.",
  notActive: "La sesión ya no está activa; no se puede solicitar asesoría.",
  notFound: "La sesión de simulación no existe.",
} as const;

function assistFallback(error: ApiError): string {
  if (error.status === 403) {
    return ASSIST_ERROR_COPY.forbidden;
  }

  if (error.status === 409) {
    return ASSIST_ERROR_COPY.notActive;
  }

  return getGenericErrorMessage(error);
}

export function getAssistErrorMessage(error: unknown, now?: number): string {
  return getAiErrorMessage(error, { notFound: ASSIST_ERROR_COPY.notFound, fallback: assistFallback, now });
}
