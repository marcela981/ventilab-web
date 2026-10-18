/*
* Funcionalidad: Admin operations entity tests
* Descripción: Pure rules of the operation pages: the audit diff keeps only the changed fields (flattened dotted keys, deep comparison, added and removed keys), the audit filters round trip through the URL and become the API query with the Bogota range, the Bogota day range (exclusive end, reversed and too long ranges), the AI filters drop unknown enums and split telemetry and ratings queries, applyStatusChange writes the pushed states into the cached status, the display formatters return "—" for missing values, and the probe error message names the Retry-After wait of a 429. Depends on vitest, the api-client errors and the admin console entities. v1.1 (B4): the AI range 422 message names the client maximum (AI_ANALYTICS_MAX_RANGE_DAYS).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import type { SystemStatusDTO } from "../../api/dtos/admin-console.dto";
import { getAdminConsoleErrorMessage, getProbeErrorMessage } from "./admin-console-error-messages";
import { formatMs, formatRate, formatUsd, MISSING_VALUE } from "./admin-format";
import { readAiFilters, toAiRatingsQuery, toAiTelemetryQuery } from "./ai-analytics.entity";
import { diffAuditChanges, formatAuditValue, NO_AUDIT_FILTERS, readAuditFilters, toAuditApiQuery, toAuditFiltersQuery } from "./audit.entity";
import { AI_ANALYTICS_MAX_RANGE_DAYS, toIsoRange } from "./date-range.entity";
import { applyStatusChange, componentStateTone, globalStateTone } from "./system-status.entity";

describe("diffAuditChanges", () => {
  it("keeps only the fields whose values changed, as dotted keys", () => {
    const before = { role: "STUDENT", isActive: true, profile: { name: "Ana", tags: ["a", "b"] }, removed: 1 };
    const after = { role: "TEACHER", isActive: true, profile: { name: "Ana", tags: ["a", "c"] }, added: "x" };

    expect(diffAuditChanges(before, after)).toEqual([
      { path: "added", before: undefined, after: "x" },
      { path: "profile.tags", before: ["a", "b"], after: ["a", "c"] },
      { path: "removed", before: 1, after: undefined },
      { path: "role", before: "STUDENT", after: "TEACHER" },
    ]);
  });

  it("handles a missing side and identical objects", () => {
    expect(diffAuditChanges(null, { status: "ACTIVE" })).toEqual([{ path: "status", before: undefined, after: "ACTIVE" }]);
    expect(diffAuditChanges({ a: { b: 1 } }, { a: { b: 1 } })).toEqual([]);
    expect(diffAuditChanges(null, null)).toEqual([]);
  });

  it("renders one side of a change", () => {
    expect(formatAuditValue(undefined)).toBe("(sin valor)");
    expect(formatAuditValue("")).toBe("(vacío)");
    expect(formatAuditValue(null)).toBe("null");
    expect(formatAuditValue({ sha256: "ab", length: 3 })).toBe("{\"sha256\":\"ab\",\"length\":3}");
  });
});

describe("audit filters", () => {
  it("round trips through the URL and builds the API query with the Bogota range", () => {
    const filters = readAuditFilters({ action: " user_role_changed ", from: "2026-10-01", to: "2026-10-02", page: "3", sortOrder: "asc", junk: "x" });

    expect(filters).toEqual({ ...NO_AUDIT_FILTERS, action: "user_role_changed", fromDay: "2026-10-01", toDay: "2026-10-02", page: 3, sortOrder: "asc" });
    expect(toAuditFiltersQuery(filters)).toEqual({ action: "user_role_changed", from: "2026-10-01", to: "2026-10-02", page: "3", sortOrder: "asc" });

    const range = toIsoRange(filters.fromDay, filters.toDay);

    expect(range).toEqual({ from: "2026-10-01T05:00:00.000Z", to: "2026-10-03T05:00:00.000Z" });
    expect(toAuditApiQuery(filters, range as { from: string, to: string })).toEqual({
      action: "user_role_changed",
      from: "2026-10-01T05:00:00.000Z",
      to: "2026-10-03T05:00:00.000Z",
      page: 3,
      limit: 20,
      sortOrder: "asc",
    });
    expect(readAuditFilters({ page: "-2", from: "ayer" })).toEqual(NO_AUDIT_FILTERS);
  });

  it("rejects reversed and too long ranges and keeps open ranges", () => {
    expect(toIsoRange("2026-10-05", "2026-10-01")).toBe("order");
    expect(toIsoRange("2025-01-01", "2026-10-01", 366)).toBe("tooLong");
    expect(toIsoRange("2026-02-31", "")).toBe("invalid");
    expect(toIsoRange("", "")).toEqual({});
    expect(toIsoRange("", "2026-10-01")).toEqual({ to: "2026-10-02T05:00:00.000Z" });
  });
});

describe("AI filters", () => {
  it("drops unknown enum values and splits the telemetry and ratings queries", () => {
    const filters = readAiFilters({ useCase: "FREE_CHAT", targetType: "NOPE", provider: "gemini", promptVersion: "1.0.0" });

    expect(filters.targetType).toBe("");
    expect(toAiTelemetryQuery(filters, {})).toEqual({ useCase: "FREE_CHAT", provider: "gemini" });
    expect(toAiRatingsQuery(filters, { from: "f" })).toEqual({ from: "f", useCase: "FREE_CHAT", provider: "gemini", promptVersion: "1.0.0" });
  });
});

describe("system status", () => {
  const status = {
    state: "OK",
    checkedAt: "2026-10-16T12:00:00.000Z",
    components: {
      database: { state: "up", reachable: true, latencyMs: 4 },
      mqttBroker: { state: "up", enabled: true, connected: true, messagesPerSecond: 25, lastMessageAt: null },
    },
  } as unknown as SystemStatusDTO;

  it("writes the pushed global and component states into the cached status", () => {
    const next = applyStatusChange(status, {
      state: "DEGRADED",
      previousState: "OK",
      checkedAt: "2026-10-16T12:05:00.000Z",
      changedComponents: [{ component: "mqttBroker", state: "degraded", previousState: "up" }],
    });

    expect(next.state).toBe("DEGRADED");
    expect(next.checkedAt).toBe("2026-10-16T12:05:00.000Z");
    expect(next.components.mqttBroker).toMatchObject({ state: "degraded", messagesPerSecond: 25 });
    expect(next.components.database.state).toBe("up");
    expect(status.components.mqttBroker.state).toBe("up");
  });

  it("maps states to the health tones", () => {
    expect(globalStateTone("DOWN")).toBe("down");
    expect(componentStateTone("up")).toBe("ok");
    expect(componentStateTone("not_configured")).toBe("idle");
  });
});

describe("formatting and messages", () => {
  it("formats API values and shows a dash when they are missing", () => {
    expect(formatRate(0.018)).toBe("1,8 %");
    expect(formatMs(undefined)).toBe(MISSING_VALUE);
    expect(formatMs(950)).toBe("950 ms");
    expect(formatUsd(null)).toBe(MISSING_VALUE);
  });

  it("names the wait of the probe rate limit", () => {
    expect(getProbeErrorMessage(new ApiError({ code: "x", message: "x", status: 429, retryAfter: 42 })))
      .toBe("Se alcanzó el límite de 3 pruebas por minuto. Inténtalo de nuevo en 42 segundos.");
    expect(getProbeErrorMessage(new ApiError({ code: "ai.provider_not_registered", message: "x", status: 422 })))
      .toBe("El proveedor de IA no tiene configuración (credenciales).");
  });
});

describe("range error messages", () => {
  it("names the real maximum of the AI ranges", () => {
    for (const code of ["ai-telemetry.invalid_range", "ai-ratings.invalid_range"]) {
      const message = getAdminConsoleErrorMessage(new ApiError({ status: 422, code, message: "x" }));

      expect(message).toBe(`El rango debe empezar antes de terminar y cubrir como máximo ${AI_ANALYTICS_MAX_RANGE_DAYS} días.`);
    }
  });
});
