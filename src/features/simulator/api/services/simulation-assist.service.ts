/*
* Funcionalidad: Simulation assist service
* Descripción: Builds the request of POST /api/simulation/sessions/{id}/assist (openapi/openapi.json, text/event-stream:
*   `delta` {text}, `done` {aiHelpEventId, aiCallId, source}, `error` {code, message}; JSON error envelope before the
*   stream, 429 with Retry-After). The server builds the simulation snapshot itself: the body carries only what
*   SimulationAssistDTO allows, the optional question (trimmed, omitted when empty) and the answer language. The
*   stream itself runs through the shared useStreamingResponse (postEventStream). Depends on the generated OpenAPI
*   types and the AI conversation stream request type.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { StreamRequest } from "@shared/ai-conversation";
import type { components } from "@shared/api-client/generated/schema";

export type SimulationAssistDTO = components["schemas"]["SimulationAssistDTO"];

/** The console copy is Spanish. */
const ASSIST_LANGUAGE: NonNullable<SimulationAssistDTO["language"]> = "es";

export const SIMULATION_SESSION_ASSIST_PATH = "/api/simulation/sessions/{id}/assist";

export function assistBody(question: string): SimulationAssistDTO {
  const trimmed = question.trim();

  return trimmed === "" ? { language: ASSIST_LANGUAGE } : { language: ASSIST_LANGUAGE, question: trimmed };
}

export function assistStreamRequest(sessionId: string, question: string): StreamRequest {
  return {
    path: SIMULATION_SESSION_ASSIST_PATH.replace("{id}", encodeURIComponent(sessionId)),
    body: assistBody(question),
  };
}
