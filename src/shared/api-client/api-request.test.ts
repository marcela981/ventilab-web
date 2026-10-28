/*
* Funcionalidad: Request helper and error utility tests
* Descripción: Unit tests for path substitution, envelope unwrapping, Retry-After parsing, timeout resolution and the compile-time contract of the typed helpers (required path params). Depends on vitest and the api-client modules. v1.1 (W3, Bloque 2): the learning tree and progress summary are slow routes.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, expectTypeOf, it } from "vitest";
import { isApiError, parseRetryAfter, toApiError } from "./api-error";
import { apiGet, buildPath, unwrapResponse } from "./api-request";
import type { RequestArgs, ResponseData } from "./api-types";
import { resolveTimeout, TIMEOUTS } from "./timeouts";

describe("buildPath", () => {
  it("substitutes and encodes path params", () => {
    expect(buildPath("/api/groups/{id}/members/{userId}", { id: "g 1", userId: "u/2" })).toBe(
      "/api/groups/g%201/members/u%2F2",
    );
  });

  it("throws an ApiError when a path param is missing", () => {
    expect(() => buildPath("/api/groups/{id}", {})).toThrowError(/Missing path parameter "id"/);
  });
});

describe("unwrapResponse", () => {
  it("unwraps the envelope and joins array messages", () => {
    const pagination = { total: 1, pages: 1, page: 1, limit: 10, next: null, previous: null };

    expect(unwrapResponse({ success: true, data: [1], message: ["a", "b"], pagination, traceId: "t" })).toEqual({
      data: [1],
      pagination,
      message: "a b",
      traceId: "t",
    });
  });
});

describe("error utilities", () => {
  it("parses Retry-After seconds and HTTP dates", () => {
    expect(parseRetryAfter("12")).toBe(12);
    expect(parseRetryAfter("Tue, 13 Oct 2026 00:01:00 GMT", Date.parse("2026-10-13T00:00:00Z"))).toBe(60);
    expect(parseRetryAfter(undefined)).toBeUndefined();
  });

  it("maps unknown values to common.unknown", () => {
    const error = toApiError(new Error("boom"));

    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ code: "common.unknown", message: "boom", status: 0 });
  });
});

describe("resolveTimeout", () => {
  it("applies the slow registry, the fast default and explicit categories", () => {
    expect(resolveTimeout("/api/auth/google")).toBe(TIMEOUTS.slow);
    expect(resolveTimeout("/api/users/me?x=1")).toBe(TIMEOUTS.slow);
    expect(resolveTimeout("/health/ready")).toBe(TIMEOUTS.slow);
    expect(resolveTimeout("http://api.test/api/curriculum/tree")).toBe(TIMEOUTS.slow);
    expect(resolveTimeout("/api/progress/summary")).toBe(TIMEOUTS.slow);
    expect(resolveTimeout("/api/progress/modules/m1")).toBe(TIMEOUTS.fast);
    expect(resolveTimeout("/api/users/me/stats")).toBe(TIMEOUTS.fast);
    expect(resolveTimeout("/api/auth/me", "fast")).toBe(TIMEOUTS.fast);
  });
});

describe("typed helpers contract", () => {
  it("requires path params only for templated paths", () => {
    expectTypeOf<RequestArgs<"/api/groups/{id}", "get">>().toEqualTypeOf<
      [options: RequestArgs<"/api/groups/{id}", "get">[0]]
    >();
    expectTypeOf<RequestArgs<"/api/groups", "get">[0]>().toBeNullable();
    expectTypeOf<ResponseData<"/api/auth/refresh", "post">>().toHaveProperty("accessToken");

    const typeOnly = (): void => {
      // @ts-expect-error path params are required for templated paths
      void apiGet("/api/groups/{id}");
      // @ts-expect-error paths outside the OpenAPI contract are rejected
      void apiGet("/api/not-a-route");
    };

    expect(typeof typeOnly).toBe("function");
  });
});
