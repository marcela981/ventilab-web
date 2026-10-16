/*
* Funcionalidad: Simulator routes
* Descripción: URL builders of the simulator feature: the catalog (/simulator), the running session console (/simulator/sessions/[sessionId]) and its result and replay pages. The route patterns are declared in the session route table (routes.config). Ids are URI-encoded. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const SIMULATOR_URL = "/simulator";

export function buildSessionUrl(sessionId: string): string {
  return `${SIMULATOR_URL}/sessions/${encodeURIComponent(sessionId)}`;
}

export function buildSessionResultUrl(sessionId: string): string {
  return `${buildSessionUrl(sessionId)}/result`;
}

export function buildSessionReplayUrl(sessionId: string): string {
  return `${buildSessionUrl(sessionId)}/replay`;
}
