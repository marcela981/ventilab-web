/*
* Funcionalidad: SystemStatusPage tests
* Descripción: /admin/status with msw and a fake socket: shows the global state, one card per component and the versions; a `system:status-changed` event turns a card DEGRADED at once; teachers get no probe buttons and no telemetry metrics request; an admin probe shows its result and a 429 explains the Retry-After wait. Depends on Testing Library, msw, vitest and the admin console page and test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SystemStatusDTO } from "../../api/dtos/admin-console.dto";
import { STATUS_COMPONENTS_COPY } from "../components/status-components";
import { apiUrl, createFakeSocket, envelope, renderAdminConsole } from "./admin-console-test-helpers";
import { SystemStatusPage } from "./system-status.page";

vi.setConfig({ testTimeout: 20_000 });

function fullStatus(): SystemStatusDTO {
  return {
    state: "OK",
    checkedAt: "2026-10-16T12:00:00.000Z",
    components: {
      database: { state: "up", reachable: true, latencyMs: 4 },
      mqttBroker: { state: "up", enabled: true, connected: true, messagesPerSecond: 25, lastMessageAt: "2026-10-16T11:59:59.000Z" },
      ventilator: { state: "idle", online: false, activeReservation: false },
      storage: { state: "up" },
      process: {
        state: "up",
        appVersion: "1.4.2",
        appCommit: "439d429",
        engineVersion: "2.0.1",
        eventLoopLagMs: 10.4,
        heapUsedBytes: 83886080,
        rssBytes: 157286400,
        uptimeSeconds: 90061,
      },
      aiProviders: {
        state: "up",
        windowMinutes: 15,
        providers: [{
          provider: "gemini",
          configured: true,
          available: true,
          breaker: "closed",
          calls: 42,
          errorRate: 0.02,
          latencyP95Ms: 1800,
          lastSuccessAt: "2026-10-16T11:58:00.000Z",
          lastErrorAt: null,
          lastErrorCode: null,
        }],
      },
    },
  };
}

const server = setupServer();
let metricsRequests: number;
let probeStatus: number;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  metricsRequests = 0;
  probeStatus = 200;
  server.use(
    http.get(apiUrl("/api/system/status"), () => HttpResponse.json(envelope(fullStatus()))),
    http.get(apiUrl("/api/ventilator/telemetry/metrics"), () => {
      metricsRequests += 1;

      return HttpResponse.json(envelope({
        batchesPerSecond: 30,
        bufferDrops: 0,
        deviceLatencyMs: { count: 10, max: 9, p50: 3.5, p95: 7.25, p99: 8 },
        duplicateMessages: 0,
        flushMs: { count: 10, max: 1, p50: 0.1, p95: 0.2, p99: 0.3 },
        invalidMessages: 0,
        lostMessages: 1,
        messagesPerSecond: 60,
        processingMs: { count: 10, max: 1, p50: 0.1, p95: 0.2, p99: 0.3 },
        reorderedMessages: 0,
        since: "2026-10-16T10:00:00.000Z",
        totalMessages: 3600,
        totalMs: { count: 10, max: 40, p50: 12, p95: 30, p99: 35 },
        volatileEmits: 3600,
        windowSize: 10000,
      }));
    }),
    http.post(apiUrl("/api/system/probe/ai/:provider"), ({ params }) => {
      if (probeStatus === 429) {
        return HttpResponse.json(
          { success: false, message: "Too many", data: null, code: "throttler.too_many_requests", timestamp: "", traceId: "t", pagination: null },
          { status: 429, headers: { "Retry-After": "42" } },
        );
      }

      return HttpResponse.json(envelope({ aiCallId: "call-1", provider: String(params.provider), ok: true, model: "gemini-2.0-flash", latencyMs: 640, errorCode: null }));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function componentCard(title: string): HTMLElement {
  return screen.getByRole("region", { name: title });
}

describe("SystemStatusPage", () => {
  it("shows the global state, the component cards and the versions", async() => {
    renderAdminConsole(<SystemStatusPage />);

    const overall = await screen.findByRole("region", { name: "Estado general" });

    expect(within(overall).getByText("Operativo")).toBeInTheDocument();
    expect(within(componentCard("Ventilador físico")).getByText("En reposo")).toBeInTheDocument();
    const process = componentCard("Proceso del servidor");

    expect(within(process).getByText("1.4.2")).toBeInTheDocument();
    expect(within(process).getByText("439d429")).toBeInTheDocument();
    expect(within(process).getByText("2.0.1")).toBeInTheDocument();
    expect(within(process).getByText("1 d 1 h 1 min")).toBeInTheDocument();
    expect(await screen.findByText(STATUS_COMPONENTS_COPY.telemetryTitle)).toBeInTheDocument();
    expect(screen.getByText("3,5 ms")).toBeInTheDocument();
  });

  it("turns a card DEGRADED when system:status-changed arrives", async() => {
    const socket = createFakeSocket();

    renderAdminConsole(<SystemStatusPage />, { socket });
    await screen.findByRole("region", { name: "Estado general" });
    expect(within(componentCard("Broker MQTT")).getByText("Operativo")).toBeInTheDocument();

    server.use(http.get(apiUrl("/api/system/status"), () => {
      const next = fullStatus();

      next.state = "DEGRADED";
      next.components.mqttBroker = { ...next.components.mqttBroker, state: "degraded", connected: false };

      return HttpResponse.json(envelope(next));
    }));
    socket.dispatch("system:status-changed", {
      state: "DEGRADED",
      previousState: "OK",
      checkedAt: "2026-10-16T12:05:00.000Z",
      changedComponents: [{ component: "mqttBroker", state: "degraded", previousState: "up" }],
    });

    expect(await within(componentCard("Broker MQTT")).findByText("Degradado")).toBeInTheDocument();
    expect(componentCard("Broker MQTT")).toHaveAttribute("data-tone", "degraded");
    expect(within(screen.getByRole("region", { name: "Estado general" })).getByText("Degradado")).toBeInTheDocument();
  });

  it("is read-only for teachers: no probe button and no telemetry metrics", async() => {
    renderAdminConsole(<SystemStatusPage />, { role: "TEACHER" });

    await screen.findByRole("region", { name: "Proveedores de IA" });
    expect(screen.queryByRole("button", { name: STATUS_COMPONENTS_COPY.probeAria("gemini") })).not.toBeInTheDocument();
    expect(screen.queryByText(STATUS_COMPONENTS_COPY.telemetryTitle)).not.toBeInTheDocument();
    expect(metricsRequests).toBe(0);
  });

  it("probes a provider and explains the rate limit wait", async() => {
    renderAdminConsole(<SystemStatusPage />);

    const button = await screen.findByRole("button", { name: STATUS_COMPONENTS_COPY.probeAria("gemini") });

    fireEvent.click(button);
    expect(await screen.findByText(STATUS_COMPONENTS_COPY.probeOk("gemini-2.0-flash", "640 ms"))).toBeInTheDocument();

    probeStatus = 429;
    fireEvent.click(screen.getByRole("button", { name: STATUS_COMPONENTS_COPY.probeAria("gemini") }));

    expect(await screen.findByText("Se alcanzó el límite de 3 pruebas por minuto. Inténtalo de nuevo en 42 segundos.")).toBeInTheDocument();
  });
});
