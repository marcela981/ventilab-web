/*
* Funcionalidad: Server clock helpers tests
* Descripción: The midpoint clock offset absorbs the request latency and corrects a skewed browser clock, an unreadable server time gives null, the server "now" adds the offset, and the time left to a deadline is measured on the server clock and never negative. v1.1 (T6 review fix): of several samples the one with the smallest round trip within the bound is kept. Depends on vitest and the server clock helpers.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { measureServerOffsetMs, pickClockSample, remainingUntilMs, serverNowMs } from "./server-clock";

const SERVER = Date.parse("2026-10-16T15:00:00.000Z");

describe("measureServerOffsetMs", () => {
  it("is zero for synchronized clocks whatever the request latency", () => {
    // Sent 200 ms before and received 200 ms after the server read its clock.
    expect(measureServerOffsetMs("2026-10-16T15:00:00.000Z", SERVER - 200, SERVER + 200)).toBe(0);
  });

  it("measures a browser clock 5 s behind and 3 s ahead", () => {
    expect(measureServerOffsetMs("2026-10-16T15:00:00.000Z", SERVER - 5_000 - 40, SERVER - 5_000 + 40)).toBe(5_000);
    expect(measureServerOffsetMs("2026-10-16T15:00:00.000Z", SERVER + 3_000 - 10, SERVER + 3_000 + 10)).toBe(-3_000);
  });

  it("returns null without a readable server time", () => {
    expect(measureServerOffsetMs(null, 0, 10)).toBeNull();
    expect(measureServerOffsetMs("", 0, 10)).toBeNull();
    expect(measureServerOffsetMs("not a date", 0, 10)).toBeNull();
  });
});

describe("serverNowMs / remainingUntilMs", () => {
  it("adds the offset to the client clock", () => {
    expect(serverNowMs(SERVER - 5_000, 5_000)).toBe(SERVER);
  });

  it("counts the time left on the server clock and never below zero", () => {
    const deadline = "2026-10-16T15:10:00.000Z";

    // The browser is 5 s behind: its 14:59:55 is the server's 15:00:00 → 10 min left.
    expect(remainingUntilMs(deadline, SERVER - 5_000, 5_000)).toBe(600_000);
    expect(remainingUntilMs(new Date(deadline), SERVER, 0)).toBe(600_000);
    expect(remainingUntilMs(deadline, SERVER + 700_000, 0)).toBe(0);
    expect(remainingUntilMs("bad", SERVER, 0)).toBeNull();
  });
});

describe("pickClockSample", () => {
  it("keeps the offset of the sample with the smallest round trip", () => {
    const samples = [
      { offsetMs: 140, roundTripMs: 300 },
      { offsetMs: 12, roundTripMs: 24 },
      { offsetMs: 60, roundTripMs: 120 },
    ];

    expect(pickClockSample(samples, 1_000)).toEqual({ offsetMs: 12, roundTripMs: 24 });
  });

  it("drops samples above the round-trip bound, unreadable ones and negative round trips", () => {
    expect(pickClockSample([{ offsetMs: 5, roundTripMs: 1_500 }, { offsetMs: null, roundTripMs: 10 }], 1_000)).toBeNull();
    expect(pickClockSample([{ offsetMs: 5, roundTripMs: -1 }], 1_000)).toBeNull();
    expect(pickClockSample([], 1_000)).toBeNull();
    expect(pickClockSample([{ offsetMs: 7, roundTripMs: 1_000 }], 1_000)).toEqual({ offsetMs: 7, roundTripMs: 1_000 });
  });
});
