/*
* Funcionalidad: Display formatters tests
* Descripción: Verifies the es-CO grade format with one decimal, dates and date windows in the America/Bogota time zone (UTC-5, so a late UTC instant falls on the previous local day), durations in hours and minutes, the relative age of an instant and the em dash for invalid dates. Depends on vitest and format.ts.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { formatDate, formatDateRange, formatDateTime, formatDuration, formatGrade, formatRelativeAge } from "./format";

describe("formatGrade", () => {
  it("uses a decimal comma and exactly one decimal", () => {
    expect(formatGrade(3.5)).toBe("3,5");
    expect(formatGrade(4)).toBe("4,0");
    expect(formatGrade(2.96)).toBe("3,0");
    expect(formatGrade(0)).toBe("0,0");
  });
});

describe("dates in America/Bogota", () => {
  it("formats the local day of the instant", () => {
    expect(formatDate("2026-10-14T15:05:00.000Z")).toBe("14 de oct de 2026");
    // 02:00 UTC is 21:00 of the previous day in Bogotá.
    expect(formatDate("2026-10-15T02:00:00.000Z")).toBe("14 de oct de 2026");
  });

  it("formats date and local time", () => {
    expect(formatDateTime("2026-10-14T15:05:00.000Z")).toBe("14 de oct de 2026, 10:05 a. m.");
  });

  it("formats a window and an open window", () => {
    expect(formatDateRange("2026-10-14T15:05:00.000Z", "2026-10-15T15:05:00.000Z"))
      .toBe("14 de oct de 2026, 10:05 a. m. – 15 de oct de 2026, 10:05 a. m.");
    expect(formatDateRange("2026-10-14T15:05:00.000Z", null)).toBe("Desde 14 de oct de 2026, 10:05 a. m.");
  });

  it("renders an em dash for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });
});

describe("formatDuration", () => {
  it("uses minutes, hours or both", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(0)).toBe("0 min");
  });
});

describe("formatRelativeAge", () => {
  const now = new Date("2026-10-14T12:00:00.000Z");

  it("uses the largest whole unit", () => {
    expect(formatRelativeAge("2026-10-11T11:00:00.000Z", now)).toBe("hace 3 días");
    expect(formatRelativeAge("2026-10-14T10:30:00.000Z", now)).toBe("hace 1 hora");
    expect(formatRelativeAge("2026-10-14T11:55:00.000Z", now)).toBe("hace 5 minutos");
  });

  it("reads under a minute and future instants as just now", () => {
    expect(formatRelativeAge("2026-10-14T11:59:30.000Z", now)).toBe("hace un momento");
    expect(formatRelativeAge("2026-10-14T12:30:00.000Z", now)).toBe("hace un momento");
  });

  it("renders an em dash for an invalid date", () => {
    expect(formatRelativeAge("x", now)).toBe("—");
  });
});
