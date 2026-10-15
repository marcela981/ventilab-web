/*
* Funcionalidad: Attempt response clock
* Descripción: In-memory record of the client clock read when each attempt response arrived, keyed by attempt id and serverNow. The attempt timer pairs serverNow with this arrival time instead of the time its effect runs, so a cached (stale) attempt shown before revalidation never overestimates the remaining time; a fresh response has a new serverNow and therefore a new sample. Only the latest sample per attempt is kept. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

type ResponseSample = {
  serverNow: string
  receivedAt: number
};

const samples = new Map<string, ResponseSample>();

export function recordAttemptResponse(attemptId: string, serverNow: string, receivedAt: number): void {
  samples.set(attemptId, { serverNow, receivedAt });
}

// Client time at which the response carrying this serverNow arrived, or null when it is unknown.
export function readAttemptResponseTime(attemptId: string, serverNow: string): number | null {
  const sample = samples.get(attemptId);

  return sample && sample.serverNow === serverNow ? sample.receivedAt : null;
}

export function clearAttemptResponses(): void {
  samples.clear();
}
