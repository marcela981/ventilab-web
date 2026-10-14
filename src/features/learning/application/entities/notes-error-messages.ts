/*
* Funcionalidad: Notes error messages
* Descripción: Spanish message for a failed AI analysis of the lesson notes: no notes in the scope (422), AI service unavailable (503), AI service failure or invalid analysis (502); anything else (429 with the Retry-After wait, timeouts, network, 4xx/5xx) falls back to the learning error messages. Depends on the api-client errors and learning-error-messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import { getLearningErrorMessage } from "./learning-error-messages";

// TODO(i18n): move to a learning namespace in src/i18n.
export const NOTES_ANALYSIS_MESSAGES = {
  noNotes: "Todavía no tienes notas en esta lección para analizar.",
  unavailable: "El servicio de IA no está disponible en este momento. Inténtalo más tarde.",
  failed: "El servicio de IA no pudo generar el análisis. Inténtalo de nuevo.",
} as const;

const STATUS_MESSAGES: Record<number, string> = {
  422: NOTES_ANALYSIS_MESSAGES.noNotes,
  502: NOTES_ANALYSIS_MESSAGES.failed,
  503: NOTES_ANALYSIS_MESSAGES.unavailable,
};

export function getNotesAnalysisErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  return STATUS_MESSAGES[apiError.status] ?? getLearningErrorMessage(apiError);
}
