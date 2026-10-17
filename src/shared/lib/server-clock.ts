/*
* Funcionalidad: Server clock helpers
* Descripción: Pure helpers to correct the browser clock with the server clock. measureServerOffsetMs computes server − client from a server timestamp read between two client readings (sent / received): the midpoint absorbs the request latency (same method as the simulator exam offset, `measureServerOffsetMs` in src/features/simulator/application/entities/sim-exam.entity.ts, and the evaluations attempt timer `computeClockOffset`), returning null when the server time cannot be read. serverNowMs and remainingUntilMs apply the offset (a wrong local clock never shortens or extends a deadline). Promoted to shared because a third feature (ventilator-lab: telemetry latency and the reservation countdown) needs it; the two older feature copies stay untouched. v1.1 (ventilator-lab T6 review fix): pickClockSample keeps, of several measurements, the one with the smallest round trip within a bound (the midpoint error is at most half the round trip, so the fastest exchange is the most accurate; a slow one, such as a request retried after a token refresh, is dropped). No dependencies.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/** Server clock minus client clock, measured at the request midpoint; null without a readable server time. */
export function measureServerOffsetMs(serverNowIso: string | null | undefined, sentAtMs: number, receivedAtMs: number): number | null {
  const serverNow = serverNowIso ? Date.parse(serverNowIso) : Number.NaN;

  return Number.isFinite(serverNow) ? Math.round(serverNow - (sentAtMs + receivedAtMs) / 2) : null;
}

/** The server "now" for a client reading and a measured offset. */
export function serverNowMs(clientNowMs: number, offsetMs: number): number {
  return clientNowMs + offsetMs;
}

/** Milliseconds left to the deadline on the server clock (never negative); null without a valid deadline. */
export function remainingUntilMs(deadline: string | Date, clientNowMs: number, offsetMs: number): number | null {
  const deadlineMs = deadline instanceof Date ? deadline.getTime() : Date.parse(deadline);

  return Number.isFinite(deadlineMs) ? Math.max(0, deadlineMs - serverNowMs(clientNowMs, offsetMs)) : null;
}

export type ClockSample = {
  /** Server − client offset of one exchange; null when that response carried no readable server time. */
  offsetMs: number | null
  /** Received − sent on the client clock. */
  roundTripMs: number
};

/**
 * The readable sample with the smallest round trip not above maxRoundTripMs (null when none qualifies). The midpoint
 * error of one exchange is bounded by half its round trip, so the fastest exchange bounds the error best.
 */
export function pickClockSample(samples: readonly ClockSample[], maxRoundTripMs: number): { offsetMs: number, roundTripMs: number } | null {
  let best: { offsetMs: number, roundTripMs: number } | null = null;

  for (const sample of samples) {
    const { offsetMs, roundTripMs } = sample;

    if (offsetMs === null || !Number.isFinite(roundTripMs) || roundTripMs < 0 || roundTripMs > maxRoundTripMs) {
      continue;
    }

    if (best === null || roundTripMs < best.roundTripMs) {
      best = { offsetMs, roundTripMs };
    }
  }

  return best;
}
