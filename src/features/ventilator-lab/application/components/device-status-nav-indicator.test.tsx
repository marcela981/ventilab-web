/*
* Funcionalidad: Device status navigation indicator tests
* Descripción: T12 review fix W1: the "Laboratorio" navigation indicator is fed by the ventilator-lab feature from
*   useDeviceStatus. deviceNavIndicator shows "Equipo en línea" only when the device is online and "Equipo sin datos"
*   only for a disconnect or stale state the backend reported; an unknown state (no event yet, no trusted seed) or a
*   realtime socket that is down shows no indicator. DeviceStatusNavIndicatorSync loads its feeder only while a host
*   displays the key, follows the realtime events and telemetry, seeds staff from GET /api/system/status (msw), sends
*   nothing while the key is not on screen and clears the indicator when it unmounts. Depends on vitest, msw, Testing
*   Library, the nav-indicators registry of @shared/layouts and the lab test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, cleanup, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NavIndicatorProvider, useNavIndicatorHost, useNavIndicators } from "@shared/layouts/nav-indicators";
import { apiUrl, createFakeSocket, envelope, renderLab } from "../pages/lab-test-helpers";
import type { FakeSocket, LabRenderOptions } from "../pages/lab-test-helpers";
import { DEVICE_NAV_INDICATOR_COPY, deviceNavIndicator } from "./device-status-nav-indicator-loader";
import { DeviceStatusNavIndicatorSync } from "./lazy-device-status-nav-indicator-sync";

const server = setupServer();
let statusReads = 0;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  statusReads = 0;
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function systemStatusHandler(online: boolean) {
  server.use(http.get(apiUrl("/api/system/status"), () => {
    statusReads += 1;

    return HttpResponse.json(envelope({
      state: "OK",
      checkedAt: "2026-10-16T14:00:00.000Z",
      components: { ventilator: { state: online ? "up" : "idle", online, activeReservation: false } },
    }));
  }));
}

function ShownIndicator({ host }: { host: boolean }) {
  useNavIndicatorHost(host ? ["ventilatorDevice"] : []);
  const indicator = useNavIndicators().ventilatorDevice;

  return <output data-testid="indicator" data-tone={indicator?.tone ?? "none"}>{indicator?.text ?? ""}</output>;
}

function Tree({ host = true, feed = true }: { host?: boolean, feed?: boolean }) {
  return (
    <NavIndicatorProvider>
      {feed ? <DeviceStatusNavIndicatorSync /> : null}
      <ShownIndicator host={host} />
    </NavIndicatorProvider>
  );
}

function renderSync(socket: FakeSocket, { host = true, ...options }: LabRenderOptions & { host?: boolean } = {}) {
  return renderLab(<Tree host={host} />, { socket, ...options });
}

const shown = () => screen.getByTestId("indicator");

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

describe("deviceNavIndicator", () => {
  it("states online only when online and 'sin datos' only for a reported disconnect or stale state", () => {
    expect(deviceNavIndicator({ kind: "online", since: 1 })).toEqual({ tone: "positive", text: DEVICE_NAV_INDICATOR_COPY.online });
    expect(deviceNavIndicator({ kind: "no-data", reason: "device_stale", since: 2 })).toEqual({
      tone: "negative",
      text: DEVICE_NAV_INDICATOR_COPY.noData,
    });
    expect(deviceNavIndicator({ kind: "no-data", reason: "broker_disconnected", since: 3 })?.text).toBe(DEVICE_NAV_INDICATOR_COPY.noData);
  });

  it("shows nothing for an unknown state or a realtime socket that is down", () => {
    expect(deviceNavIndicator({ kind: "no-data", reason: "unknown", since: null })).toBeNull();
    expect(deviceNavIndicator({ kind: "no-data", reason: "realtime_offline", since: null })).toBeNull();
  });
});

describe("DeviceStatusNavIndicatorSync", () => {
  it("shows no indicator while unknown, then follows the reported events and telemetry", async() => {
    const socket = createFakeSocket();
    renderSync(socket);

    // Let the lazy feeder load before the events (it subscribes on mount).
    await wait(100);
    expect(shown()).toHaveAttribute("data-tone", "none");
    expect(shown()).toHaveTextContent("");

    await waitFor(() => {
      socket.dispatch("ventilator:connected", { at: 1000 });
      expect(shown()).toHaveTextContent(DEVICE_NAV_INDICATOR_COPY.online);
    });
    expect(shown()).toHaveAttribute("data-tone", "positive");

    socket.dispatch("ventilator:disconnected", { at: 2000, reason: "device_stale" });
    expect(shown()).toHaveTextContent(DEVICE_NAV_INDICATOR_COPY.noData);
    expect(shown()).toHaveAttribute("data-tone", "negative");

    socket.dispatch("ventilator:telemetry", { frames: [], serverTs: 3000 });
    expect(shown()).toHaveTextContent(DEVICE_NAV_INDICATOR_COPY.online);
    expect(socket.emitted).toEqual([]);
  });

  it("seeds staff from the system status, without any event", async() => {
    systemStatusHandler(true);
    renderSync(createFakeSocket(), { role: "TEACHER", permissions: ["system:status"] });

    await waitFor(() => expect(shown()).toHaveTextContent(DEVICE_NAV_INDICATOR_COPY.online));
    expect(statusReads).toBeGreaterThan(0);
  });

  it("does not state 'sin datos' when the seed only says the device is not online (unknown)", async() => {
    systemStatusHandler(false);
    renderSync(createFakeSocket(), { role: "TEACHER", permissions: ["system:status"] });

    await waitFor(() => expect(statusReads).toBeGreaterThan(0));
    await wait(50);
    expect(shown()).toHaveAttribute("data-tone", "none");
  });

  it("reads and shows nothing while no host displays the key", async() => {
    systemStatusHandler(true);
    const socket = createFakeSocket();
    renderSync(socket, { host: false, role: "TEACHER", permissions: ["system:status"] });

    await wait(100);
    socket.dispatch("ventilator:connected", { at: 1000 });
    expect(statusReads).toBe(0);
    expect(shown()).toHaveAttribute("data-tone", "none");
  });

  it("clears the indicator when the feeder unmounts", async() => {
    systemStatusHandler(true);
    const view = renderSync(createFakeSocket(), { role: "TEACHER", permissions: ["system:status"] });
    await waitFor(() => expect(shown()).toHaveTextContent(DEVICE_NAV_INDICATOR_COPY.online));

    view.rerender(<Tree feed={false} />);
    expect(shown()).toHaveAttribute("data-tone", "none");
  });
});
