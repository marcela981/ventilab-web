/*
* Funcionalidad: Bogota local time helpers tests
* Descripción: Verifies the conversion of datetime-local values read in America/Bogota (UTC-5, no daylight saving time) to UTC ISO instants and back, including the day, month, year and leap-day boundaries, values that cross midnight UTC, and the rejection of malformed or impossible dates. Depends on vitest and bogota-time.ts.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { bogotaLocalToUtcIso, utcToBogotaLocal } from "./bogota-time";

describe("bogotaLocalToUtcIso", () => {
  it("adds five hours to the Bogota wall clock", () => {
    expect(bogotaLocalToUtcIso("2026-10-15T08:30")).toBe("2026-10-15T13:30:00.000Z");
    expect(bogotaLocalToUtcIso("2026-10-15T00:00")).toBe("2026-10-15T05:00:00.000Z");
  });

  it("moves an evening time to the next UTC day, month and year", () => {
    expect(bogotaLocalToUtcIso("2026-10-15T19:00")).toBe("2026-10-16T00:00:00.000Z");
    expect(bogotaLocalToUtcIso("2026-10-31T23:59")).toBe("2026-11-01T04:59:00.000Z");
    expect(bogotaLocalToUtcIso("2026-12-31T20:00")).toBe("2027-01-01T01:00:00.000Z");
  });

  it("uses the same offset all year (no daylight saving time)", () => {
    expect(bogotaLocalToUtcIso("2027-01-15T12:00")).toBe("2027-01-15T17:00:00.000Z");
    expect(bogotaLocalToUtcIso("2027-07-15T12:00")).toBe("2027-07-15T17:00:00.000Z");
  });

  it("accepts a leap day and rejects impossible dates", () => {
    expect(bogotaLocalToUtcIso("2028-02-29T21:15")).toBe("2028-03-01T02:15:00.000Z");
    expect(bogotaLocalToUtcIso("2027-02-29T10:00")).toBeNull();
    expect(bogotaLocalToUtcIso("2026-04-31T10:00")).toBeNull();
    expect(bogotaLocalToUtcIso("2026-10-15T24:00")).toBeNull();
  });

  it("rejects malformed values", () => {
    expect(bogotaLocalToUtcIso("")).toBeNull();
    expect(bogotaLocalToUtcIso("2026-10-15")).toBeNull();
    expect(bogotaLocalToUtcIso("15/10/2026 08:00")).toBeNull();
  });
});

describe("utcToBogotaLocal", () => {
  it("subtracts five hours, crossing back to the previous local day", () => {
    expect(utcToBogotaLocal("2026-10-15T13:30:00.000Z")).toBe("2026-10-15T08:30");
    expect(utcToBogotaLocal("2027-01-01T01:00:00.000Z")).toBe("2026-12-31T20:00");
    expect(utcToBogotaLocal(new Date("2026-03-01T04:59:59.000Z"))).toBe("2026-02-28T23:59");
  });

  it("round-trips with bogotaLocalToUtcIso", () => {
    const local = "2026-11-02T07:45";
    const iso = bogotaLocalToUtcIso(local);

    expect(iso).not.toBeNull();
    expect(utcToBogotaLocal(iso ?? "")).toBe(local);
  });

  it("returns null for an invalid instant", () => {
    expect(utcToBogotaLocal("not a date")).toBeNull();
  });
});
