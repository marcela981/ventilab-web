/*
* Funcionalidad: Simulator entity tests
* Descripción: Unit tests of the pure simulator catalog/history helpers: the contract-derived time multipliers and filter options, the catalog filter flag, the case-insensitive Spanish labels with a raw fallback, the session duration and the duration and score formatting. Depends on Vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { CASE_DIFFICULTIES, CASE_PATHOLOGIES, DEFAULT_TIME_MULTIPLIER, TIME_MULTIPLIERS } from "../config/simulator.config";
import {
  difficultyLabel,
  formatScore,
  formatSessionDuration,
  hasCatalogFilters,
  NO_CATALOG_FILTERS,
  pathologyLabel,
  sessionDurationMs,
  sessionStatusLabel,
} from "./simulator.entity";

describe("simulator config", () => {
  it("derives the time multipliers and filter options from the contract enums", () => {
    expect(TIME_MULTIPLIERS).toEqual([1, 2, 4]);
    expect(DEFAULT_TIME_MULTIPLIER).toBe(1);
    expect(CASE_DIFFICULTIES).toEqual(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
    expect(CASE_PATHOLOGIES).toHaveLength(14);
    expect(CASE_PATHOLOGIES).toContain("SINDROME_DE_DISTRES_RESPIRATORIO");
  });
});

describe("simulator entity helpers", () => {
  it("knows when a catalog filter is set", () => {
    expect(hasCatalogFilters(NO_CATALOG_FILTERS)).toBe(false);
    expect(hasCatalogFilters({ pathology: null, difficulty: "ADVANCED" })).toBe(true);
  });

  it("labels free-text values case-insensitively and falls back to the raw value", () => {
    expect(pathologyLabel("neumonia")).toBe("Neumonía");
    expect(difficultyLabel("BEGINNER")).toBe("Básico");
    expect(sessionStatusLabel("ENDED")).toBe("Finalizada");
    expect(pathologyLabel("RARA")).toBe("RARA");
  });

  it("measures a finished session and rejects a missing or negative span", () => {
    expect(sessionDurationMs("2026-10-15T14:00:00.000Z", "2026-10-15T15:02:00.000Z")).toBe(3_720_000);
    expect(sessionDurationMs("2026-10-15T14:00:00.000Z", null)).toBeNull();
    expect(sessionDurationMs("2026-10-15T14:00:00.000Z", "2026-10-15T13:00:00.000Z")).toBeNull();
    expect(sessionDurationMs("bad", "2026-10-15T13:00:00.000Z")).toBeNull();
  });

  it("formats the duration and a 0–1 score", () => {
    expect(formatSessionDuration(45_000)).toBe("45 s");
    expect(formatSessionDuration(125_000)).toBe("2 min 05 s");
    expect(formatSessionDuration(3_720_000)).toBe("1 h 02 min");
    expect(formatSessionDuration(null)).toBe("—");
    expect(formatScore(0.82)).toMatch(/^82\s?%$/);
    expect(formatScore(null)).toBe("—");
  });
});
