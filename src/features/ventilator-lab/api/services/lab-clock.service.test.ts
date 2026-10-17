/*
* Funcionalidad: Lab server clock service tests
* Descripción: The server clock offset is measured with several requests to GET /api/reservations/current and the sample with the smallest round trip within the bound is kept (a slow exchange, such as one retried after a token refresh, is dropped); a response without a readable body timestamp, or only slow exchanges, give null; when every request fails the error is thrown. Depends on vitest, msw, the lab test helpers and the lab clock service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { apiUrl, errorResponse } from "../../application/pages/lab-test-helpers";
import { fetchServerClockOffset } from "./lab-clock.service";

const server = setupServer();
const SERVER = Date.parse("2026-10-16T15:00:00.000Z");

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

/** A scripted client clock: each call returns the next reading. */
function scriptedNow(readings: readonly number[]): () => number {
  let index = 0;

  return () => readings[Math.min(index++, readings.length - 1)] ?? 0;
}

function serveTimestamps(timestamps: ReadonlyArray<string | null>) {
  let call = 0;

  server.use(http.get(apiUrl("/api/reservations/current"), () => {
    const timestamp = timestamps[Math.min(call++, timestamps.length - 1)];

    return HttpResponse.json({ success: true, data: { reservation: null, canControl: false }, ...(timestamp ? { timestamp } : {}) });
  }));
}

describe("fetchServerClockOffset", () => {
  it("keeps the sample with the smallest round trip", async() => {
    // The server stamps 15:00:00 every time. Client readings (sent, received) per sample: the browser is 5 s behind.
    serveTimestamps(["2026-10-16T15:00:00.000Z"]);
    const now = scriptedNow([
      SERVER - 5_000 - 400, SERVER - 5_000 + 200, // round trip 600 ms, midpoint error 100 ms
      SERVER - 5_000 - 10, SERVER - 5_000 + 10, // round trip 20 ms (best): offset 5 000
      SERVER - 5_000 - 100, SERVER - 5_000 + 20, // round trip 120 ms
    ]);

    await expect(fetchServerClockOffset({ now, samples: 3 })).resolves.toBe(5_000);
  });

  it("drops samples above the round-trip bound and those without a readable time", async() => {
    serveTimestamps([null, "2026-10-16T15:00:00.000Z"]);
    const now = scriptedNow([0, 10, SERVER - 900, SERVER + 900]);

    // First: no timestamp; second: round trip 1 800 ms > 1 000 ms bound.
    await expect(fetchServerClockOffset({ now, samples: 2, maxRoundTripMs: 1_000 })).resolves.toBeNull();
  });

  it("ignores a failed request when another one succeeds, and throws when all fail", async() => {
    let call = 0;

    server.use(http.get(apiUrl("/api/reservations/current"), () => (call++ === 0
      ? errorResponse("common.internal", 500)
      : HttpResponse.json({ success: true, data: null, timestamp: "2026-10-16T15:00:00.000Z" }))));

    await expect(fetchServerClockOffset({ now: scriptedNow([0, 5, SERVER - 5, SERVER + 5]), samples: 2 })).resolves.toBe(0);

    server.use(http.get(apiUrl("/api/reservations/current"), () => errorResponse("common.internal", 500)));

    await expect(fetchServerClockOffset({ samples: 2 })).rejects.toMatchObject({ status: 500 });
  });
});
