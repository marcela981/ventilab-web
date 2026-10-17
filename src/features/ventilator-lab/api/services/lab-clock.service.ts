/*
* Funcionalidad: Lab server clock service
* Descripción: Measures the server clock offset for the live console (telemetry latency and reservation countdown). It reads GET /api/reservations/current (an endpoint the lab already calls; openapi `getCurrentReservation`) through the axios httpClient, because the generic api helpers drop the envelope `timestamp` ("Server time of the response", set by the backend ApiResponseBuilder on every envelope). The time is read from the response BODY, which is readable cross-origin; the HTTP `Date` header is not in the backend CORS exposed headers (see odd/tasks/simulation.md). The offset is server − client at the request midpoint (shared server-clock). v1.1 (T6 review fix W1): CLOCK_SAMPLES sequential requests, keeping the one with the smallest round trip not above CLOCK_MAX_ROUND_TRIP_MS (shared pickClockSample); a failed request only drops its sample (all failed → the last error is thrown); null when no sample qualifies. Residual bias: the backend stamps `timestamp` when it builds the envelope, after guards and the database read, so the stamp lies after the true midpoint by up to the server processing time and the offset (hence the latency) reads at most about half of that processing time high; taking the fastest exchange keeps that bias and the network asymmetry small, and a socket ping carrying the server time (which would remove it) does not exist (gap recorded). Depends on the api-client httpClient and error helper, the shared server-clock helpers and the reservations service path.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import { httpClient } from "@shared/api-client/http-client";
import { measureServerOffsetMs, pickClockSample } from "@shared/lib/server-clock";
import type { ClockSample } from "@shared/lib/server-clock";
import { CURRENT_RESERVATION_PATH } from "./reservations.service";

type EnvelopeTime = { timestamp?: unknown } | null | undefined;

/** Requests per measurement; the fastest one is kept. */
export const CLOCK_SAMPLES = 4;
/** A slower exchange (for example one retried after a token refresh) is not trusted. */
export const CLOCK_MAX_ROUND_TRIP_MS = 1000;

export type ServerClockOptions = {
  now?: () => number
  samples?: number
  maxRoundTripMs?: number
};

/** Server − client clock offset in ms; null when no sample is readable and fast enough. Throws an ApiError when every request fails. */
export async function fetchServerClockOffset({
  now = Date.now,
  samples = CLOCK_SAMPLES,
  maxRoundTripMs = CLOCK_MAX_ROUND_TRIP_MS,
}: ServerClockOptions = {}): Promise<number | null> {
  const measured: ClockSample[] = [];
  let lastError: unknown = null;

  // Sequential on purpose: parallel requests would queue behind each other and inflate their round trips.
  for (let index = 0; index < Math.max(1, samples); index += 1) {
    const sentAt = now();
    let timestamp: unknown;
    let failed = false;

    try {
      const response = await httpClient.request({ method: "get", url: CURRENT_RESERVATION_PATH });
      timestamp = (response.data as EnvelopeTime)?.timestamp;
    } catch (error) {
      failed = true;
      lastError = error;
    }

    const receivedAt = now();

    if (!failed) {
      measured.push({
        offsetMs: measureServerOffsetMs(typeof timestamp === "string" ? timestamp : null, sentAt, receivedAt),
        roundTripMs: receivedAt - sentAt,
      });
    }
  }

  if (measured.length === 0) {
    throw toApiError(lastError);
  }

  return pickClockSample(measured, maxRoundTripMs)?.offsetMs ?? null;
}
