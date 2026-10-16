/*
* Funcionalidad: Lab summary page tests
* Descripción: The /lab summary shows the console entry only when the backend lets the caller control the ventilator, the occupancy label (never a name the backend did not send) otherwise, the free state, the upcoming reservations of the user and group without the active one, the empty and retryable error states, and the device status from the broadcast events without joining the ventilator room. Depends on vitest, msw, Testing Library and the lab test helpers.
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
import { LabHomePage } from "./lab-home.page";
import { apiUrl, createFakeSocket, detailDto, envelope, errorResponse, renderLab, summaryDto } from "./lab-test-helpers";

const server = setupServer();

const active = detailDto("active", {
  startsAt: "2026-10-16T14:00:00.000Z",
  endsAt: "2026-10-16T15:00:00.000Z",
});
const groupUpcoming = detailDto("group", {
  startsAt: "2026-10-17T14:00:00.000Z",
  endsAt: "2026-10-17T15:00:00.000Z",
  holderType: "GROUP",
  holder: null,
  group: { id: "g1", name: "Grupo A" },
});
const ownUpcoming = detailDto("own", {
  startsAt: "2026-10-16T20:00:00.000Z",
  endsAt: "2026-10-16T21:00:00.000Z",
});

function useCurrent(data: unknown) {
  server.use(http.get(apiUrl("/api/reservations/current"), () => HttpResponse.json(envelope(data))));
}

function useMine(data: unknown[]) {
  server.use(http.get(apiUrl("/api/reservations/mine"), () => HttpResponse.json(envelope(data))));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-16T14:30:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const section = (name: string) => screen.getByRole("region", { name });

describe("LabHomePage", () => {
  it("offers the console to a caller who may control and lists the upcoming reservations without the active one", async() => {
    useCurrent({ reservation: active, canControl: true });
    useMine([groupUpcoming, active, ownUpcoming]);

    renderLab(<LabHomePage />, { socket: createFakeSocket() });

    const console = await screen.findByRole("link", { name: "Entrar a la consola" });
    const activeCard = section("Reserva activa");

    expect(console).toHaveAttribute("href", "/lab/live");
    expect(activeCard).toHaveTextContent("Ana Gómez");

    const list = await screen.findByRole("list", { name: "Próximas reservas" });
    const items = within(list).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Ana Gómez");
    expect(items[1]).toHaveTextContent("Grupo A");
    expect(items[1]).toHaveTextContent("Programada");
    expect(screen.getByRole("link", { name: "Ver calendario y reservar" })).toHaveAttribute("href", "/lab/reservations");
  });

  it("shows the backend occupancy label and no console entry to a caller who may not control", async() => {
    useCurrent({
      reservation: summaryDto("other", "reservations.labels.group_student", "Reservado por un estudiante del grupo B"),
      canControl: false,
    });
    useMine([]);

    renderLab(<LabHomePage />, { socket: createFakeSocket() });

    const activeCard = section("Reserva activa");

    expect(await within(activeCard).findByText("Reservado por un estudiante del grupo B")).toBeInTheDocument();
    expect(activeCard).toHaveTextContent("Ventilador en uso");
    expect(screen.queryByRole("link", { name: "Entrar a la consola" })).not.toBeInTheDocument();
    expect(await screen.findByText("No tienes reservas próximas.")).toBeInTheDocument();
  });

  it("shows a free ventilator", async() => {
    useCurrent({ reservation: null, canControl: false });
    useMine([]);

    renderLab(<LabHomePage />, { socket: createFakeSocket() });

    expect(await screen.findByText("El ventilador está libre en este momento.")).toBeInTheDocument();
  });

  it("shows a retryable error when the active reservation cannot be read", async() => {
    let fail = true;

    server.use(http.get(apiUrl("/api/reservations/current"), () => (
      fail ? errorResponse("common.internal", 500) : HttpResponse.json(envelope({ reservation: null, canControl: false }))
    )));
    useMine([]);

    renderLab(<LabHomePage />, { socket: createFakeSocket() });

    expect(await screen.findByText("No se pudo cargar la reserva activa")).toBeInTheDocument();
    expect(screen.getByText("Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.")).toBeInTheDocument();

    fail = false;
    fireEvent.click(within(section("Reserva activa")).getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("El ventilador está libre en este momento.")).toBeInTheDocument();
  });

  it("shows the device status from the broadcast events without joining the ventilator room", async() => {
    useCurrent({ reservation: null, canControl: false });
    useMine([]);

    const socket = createFakeSocket();

    renderLab(<LabHomePage />, { socket });

    const device = section("Estado del dispositivo");

    expect(device).toHaveTextContent("Sin datos");
    expect(device).toHaveTextContent("Todavía no se ha recibido ningún estado del ventilador en esta conexión.");

    socket.dispatch("ventilator:connected", { at: 1 });
    expect(device).toHaveTextContent("En línea");

    socket.dispatch("ventilator:disconnected", { at: 2, reason: "device_stale" });
    expect(device).toHaveTextContent("Sin datos");
    expect(device).toHaveTextContent("El ventilador dejó de enviar datos.");

    await screen.findByText("El ventilador está libre en este momento.");
    expect(socket.emitted).not.toContain("ventilator:join");
  });
});
