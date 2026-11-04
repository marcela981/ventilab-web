/*
* Funcionalidad: API version mapper tests
* Descripción: Verifies toApiVersion: the raw `GET /api/version` body, the same body wrapped as `{ data }`, the short sha, "unknown" build values and the payloads that are not a version (null result). Depends on vitest and the API version mapper.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { toApiVersion } from "./api-version.mapper";

const body = { sha: "0123456789abcdef", builtAt: "2026-11-04T10:00:00.000Z", contract: 1 };
const mapped = { sha: "0123456789abcdef", shortSha: "0123456", builtAt: "2026-11-04T10:00:00.000Z", contract: 1 };

describe("toApiVersion", () => {
  it("maps the raw body with a short sha", () => {
    expect(toApiVersion(body)).toEqual(mapped);
  });

  it("accepts the body wrapped as { data }", () => {
    expect(toApiVersion({ success: true, data: body })).toEqual(mapped);
  });

  it("keeps unknown build values", () => {
    expect(toApiVersion({ sha: "unknown", builtAt: "unknown", contract: 2 })).toEqual({
      sha: "unknown",
      shortSha: "unknown",
      builtAt: "unknown",
      contract: 2,
    });
  });

  it("treats a missing or blank sha and builtAt as unknown", () => {
    expect(toApiVersion({ sha: " ", contract: 1 })).toEqual({ sha: "unknown", shortSha: "unknown", builtAt: "unknown", contract: 1 });
  });

  it.each([
    ["null", null],
    ["a string", "<html>Not found</html>"],
    ["an array", [body]],
    ["a health body", { status: "ok" }],
    ["a non-numeric contract", { ...body, contract: "1" }],
    ["a non-finite contract", { ...body, contract: Number.NaN }],
    ["an empty envelope", { data: null }],
  ])("returns null for %s", (_label, payload) => {
    expect(toApiVersion(payload)).toBeNull();
  });
});
