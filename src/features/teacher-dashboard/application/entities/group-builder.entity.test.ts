/*
* Funcionalidad: Group builder entity tests
* Descripción: Verifies July's exact partial failure text, settleWithConcurrency (allSettled results in input order, never more than the limit in flight, empty input) and the per-student failure reasons (409 already in an active group by code and by status, role not allowed, network, unknown). Depends on vitest, the shared API error and the group builder entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import { GROUP_BUILDER_COPY, MEMBER_FAILURE_REASONS, memberFailureReason, settleWithConcurrency } from "./group-builder.entity";

describe("GROUP_BUILDER_COPY", () => {
  it("keeps July's partial failure text", () => {
    expect(GROUP_BUILDER_COPY.partialFailure(2)).toBe("Grupo creado, pero 2 estudiante(s) no pudieron agregarse.");
  });
});

describe("settleWithConcurrency", () => {
  it("settles every item in input order with at most `limit` running", async() => {
    let running = 0;
    let peak = 0;
    const task = async(value: number) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, value % 3));
      running -= 1;

      if (value === 3) {
        throw new Error("boom");
      }

      return value * 10;
    };

    const results = await settleWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, task);

    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
    expect(results.map((result) => (result.status === "fulfilled" ? result.value : "x"))).toEqual([10, 20, "x", 40, 50, 60, 70, 80, 90]);
  });

  it("resolves an empty list", async() => {
    await expect(settleWithConcurrency([], 4, () => Promise.resolve(1))).resolves.toEqual([]);
  });
});

describe("memberFailureReason", () => {
  it("names the one-active-group rule", () => {
    expect(memberFailureReason(new ApiError({ code: "groups.student_already_in_group", message: "x", status: 409 })))
      .toBe(MEMBER_FAILURE_REASONS["groups.student_already_in_group"]);
    expect(memberFailureReason(new ApiError({ code: "other", message: "x", status: 409 })))
      .toBe(MEMBER_FAILURE_REASONS["groups.student_already_in_group"]);
  });

  it("covers role, network and unknown failures", () => {
    expect(memberFailureReason(new ApiError({ code: "groups.member_role_not_allowed", message: "x", status: 422 }))).toBe("no es un estudiante.");
    expect(memberFailureReason(new ApiError({ code: CLIENT_ERROR_CODES.networkUnavailable, message: "x", status: 0 }))).toMatch(/conectar/);
    expect(memberFailureReason(new Error("x"))).toBe("no se pudo agregar.");
  });
});
