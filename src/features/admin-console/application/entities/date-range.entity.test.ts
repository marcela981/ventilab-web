/*
* Funcionalidad: Admin console date ranges tests
* Descripción: toIsoRange turns Bogota calendar days into the ISO range of the API (`to` exclusive), rejects invalid, reversed and too long closed ranges, and, with a maximum and only "desde" set, validates the open range against an injected now: a first day in the future is "future", one more than the maximum ago is "tooLong", and an open range without a maximum is never limited. Depends on vitest and the date range entity. v1.1 (B4): the too long message states the maximum the range was checked against (singular/plural), never a hardcoded 366.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { AI_ANALYTICS_MAX_RANGE_DAYS, DATE_RANGE_ERRORS, dateRangeErrorMessage, toIsoRange } from "./date-range.entity";

const NOW = new Date("2026-10-17T15:00:00.000Z");

describe("toIsoRange", () => {
  it("converts Bogota days into an ISO range with an exclusive end", () => {
    expect(toIsoRange("2026-10-01", "2026-10-01", 366, NOW)).toEqual({
      from: "2026-10-01T05:00:00.000Z",
      to: "2026-10-02T05:00:00.000Z",
    });
    expect(toIsoRange("", "", 366, NOW)).toEqual({});
  });

  it("rejects invalid, reversed and too long closed ranges", () => {
    expect(toIsoRange("2026-13-99x", "", 366, NOW)).toBe("invalid");
    expect(toIsoRange("2026-10-05", "2026-10-01", 366, NOW)).toBe("order");
    expect(toIsoRange("2025-01-01", "2026-10-01", 366, NOW)).toBe("tooLong");
  });

  it("validates an open \"desde\"-only range against now when a maximum is set", () => {
    expect(toIsoRange("2026-10-10", "", 366, NOW)).toEqual({ from: "2026-10-10T05:00:00.000Z" });
    expect(toIsoRange("2026-10-17", "", 366, NOW)).toEqual({ from: "2026-10-17T05:00:00.000Z" });
    expect(toIsoRange("2025-10-01", "", 366, NOW)).toBe("tooLong");
    expect(toIsoRange("2026-10-18", "", 366, NOW)).toBe("future");
    expect(DATE_RANGE_ERRORS.future).toBeTruthy();
  });

  it("never limits an open range when there is no maximum", () => {
    expect(toIsoRange("2020-01-01", "", undefined, NOW)).toEqual({ from: "2020-01-01T05:00:00.000Z" });
  });

  it("states the real maximum in the too long message", () => {
    expect(dateRangeErrorMessage("tooLong", 31)).toBe("El rango puede cubrir como máximo 31 días.");
    expect(dateRangeErrorMessage("tooLong", 1)).toBe("El rango puede cubrir como máximo 1 día.");
    expect(dateRangeErrorMessage("tooLong", AI_ANALYTICS_MAX_RANGE_DAYS)).toBe(`El rango puede cubrir como máximo ${AI_ANALYTICS_MAX_RANGE_DAYS} días.`);
    expect(dateRangeErrorMessage("order", 31)).toBe(DATE_RANGE_ERRORS.order);
  });
});
