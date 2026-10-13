/*
* Funcionalidad: Backend origin resolver tests
* Descripción: Verifies the legacy-compatible precedence of resolveBackendOrigin (server BACKEND_URL, NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_API_URL without /api, localhost fallback). Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { DEFAULT_BACKEND_ORIGIN, resolveBackendOrigin } from "./env";

describe("resolveBackendOrigin", () => {
  it("prefers BACKEND_URL on the server", () => {
    expect(
      resolveBackendOrigin({ isServer: true, backendUrl: "http://api.internal/", publicBackendUrl: "https://pub" }),
    ).toBe("http://api.internal");
  });

  it("ignores BACKEND_URL in the browser", () => {
    expect(resolveBackendOrigin({ isServer: false, backendUrl: "http://api.internal", publicBackendUrl: "https://pub" })).toBe(
      "https://pub",
    );
  });

  it("strips a trailing /api from the legacy NEXT_PUBLIC_API_URL", () => {
    expect(resolveBackendOrigin({ isServer: false, legacyApiUrl: "https://legacy.example/api/" })).toBe(
      "https://legacy.example",
    );
  });

  it("falls back to localhost", () => {
    expect(resolveBackendOrigin({ isServer: false })).toBe(DEFAULT_BACKEND_ORIGIN);
  });
});
