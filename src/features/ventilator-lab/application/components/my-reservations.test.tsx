/*
* Funcionalidad: My reservations section tests
* Descripción: "Mis reservas" with msw: GET /api/reservations/mine split into upcoming (the one in progress as "En curso") and past (preempted with its reason, cancelled), "Cancelar" only where the mirrored backend rules allow it (creator or holder, leader of the holder group, admin; never a group member who is not the leader, never a past reservation), confirming posts POST /api/reservations/{id}/cancel once, revalidates mine and shows the success toast, going back sends nothing, and the backend cancel codes are shown in Spanish. Depends on vitest, msw, Testing Library and the lab test helpers. v1.1 (S8): fixtures carry the regenerated block 1 contract fields (party code null).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ReservationDetailDTO } from "../../api/dtos/lab.dto";
import { CANCEL_RESERVATION_ERROR_COPY } from "../entities/lab-error-messages";
import { apiUrl, detailDto, envelope, errorResponse, myGroupsDto, renderLab, sessionUserId } from "../pages/lab-test-helpers";
import { MyReservations } from "./my-reservations";

const NOW = new Date("2026-10-16T14:37:00.000Z");
const STUDENT = sessionUserId("STUDENT");
const server = setupServer();
let mine: ReservationDetailDTO[] = [];
let mineReads = 0;
let cancelPosts: string[] = [];

const party = (id: string, name: string) => ({ id, code: null, name, identifier: `${id}@ventylab.demo`, role: "STUDENT" });

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  mineReads = 0;
  cancelPosts = [];
  mine = [
    detailDto("running", {
      startsAt: "2026-10-16T14:00:00.000Z",
      endsAt: "2026-10-16T15:00:00.000Z",
      holder: party(STUDENT, "Yo"),
      createdBy: party(STUDENT, "Yo"),
    }),
    detailDto("own", {
      startsAt: "2026-10-17T14:00:00.000Z",
      endsAt: "2026-10-17T15:00:00.000Z",
      holder: party(STUDENT, "Yo"),
      createdBy: party(STUDENT, "Yo"),
      purpose: "Práctica de PEEP",
    }),
    detailDto("group", {
      startsAt: "2026-10-18T14:00:00.000Z",
      endsAt: "2026-10-18T15:00:00.000Z",
      holderType: "GROUP",
      holder: null,
      group: { id: "g1", name: "Grupo A" },
      createdBy: party("leader", "Líder"),
    }),
    detailDto("preempted", {
      status: "PREEMPTED",
      startsAt: "2026-10-16T16:00:00.000Z",
      endsAt: "2026-10-16T17:00:00.000Z",
      holder: party(STUDENT, "Yo"),
      createdBy: party(STUDENT, "Yo"),
      preemptedReason: "Clase demostrativa",
    }),
    detailDto("cancelled", {
      status: "CANCELLED",
      startsAt: "2026-10-16T18:00:00.000Z",
      endsAt: "2026-10-16T19:00:00.000Z",
      holder: party(STUDENT, "Yo"),
      createdBy: party(STUDENT, "Yo"),
    }),
  ];
  server.use(
    http.get(apiUrl("/api/reservations/mine"), () => {
      mineReads += 1;

      return HttpResponse.json(envelope(mine));
    }),
    http.get(apiUrl("/api/groups/mine"), () => HttpResponse.json(envelope(myGroupsDto([
      { groupId: "g1", groupName: "Grupo A", groupType: "STUDENT", isActive: true, memberRole: "MEMBER" },
    ])))),
    http.post(apiUrl("/api/reservations/:id/cancel"), ({ params }) => {
      cancelPosts.push(String(params.id));

      return HttpResponse.json(envelope(null));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const list = (name: string) => screen.findByRole("list", { name });
const itemOf = async(listName: string, text: string | RegExp) => {
  const item = within(await list(listName)).getByText(text).closest("li");

  if (!item) {
    throw new Error(`no item with ${String(text)}`);
  }

  return item as HTMLElement;
};

describe("MyReservations", { timeout: 20_000 }, () => {
  it("splits the reservations into upcoming and past with their status labels", async() => {
    renderLab(<MyReservations now={NOW} />, { role: "STUDENT", permissions: ["groups:read_own"] });

    const upcoming = await list("Próximas");
    const past = await list("Anteriores");

    expect(within(upcoming).getAllByRole("listitem")).toHaveLength(3);
    expect(within(past).getAllByRole("listitem")).toHaveLength(2);
    expect(within(upcoming).getByText("En curso")).toBeInTheDocument();
    expect(within(upcoming).getByText("Propósito: Práctica de PEEP")).toBeInTheDocument();
    expect(within(upcoming).getByText("Grupo Grupo A")).toBeInTheDocument();
    expect(within(past).getByText("Desplazada")).toBeInTheDocument();
    expect(within(past).getByText("Motivo del desplazamiento: Clase demostrativa")).toBeInTheDocument();
    expect(within(past).getByText("Cancelada")).toBeInTheDocument();
  });

  it("offers Cancelar only where the backend rules allow it", async() => {
    renderLab(<MyReservations now={NOW} />, { role: "STUDENT", permissions: ["groups:read_own"] });

    expect(within(await itemOf("Próximas", "En curso")).getByRole("button", { name: /^Cancelar la reserva/ })).toBeInTheDocument();
    expect(within(await itemOf("Próximas", "Propósito: Práctica de PEEP")).getByRole("button", { name: /^Cancelar/ })).toBeInTheDocument();
    // A member (not leader) of the holder group who did not create it.
    expect(within(await itemOf("Próximas", "Grupo Grupo A")).queryByRole("button")).not.toBeInTheDocument();
    expect(within(await list("Anteriores")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("lets the leader of the holder group and an admin cancel a group reservation", async() => {
    server.use(http.get(apiUrl("/api/groups/mine"), () => HttpResponse.json(envelope(myGroupsDto([
      { groupId: "g1", groupName: "Grupo A", groupType: "STUDENT", isActive: true, memberRole: "LEADER" },
    ])))));

    const { unmount } = renderLab(<MyReservations now={NOW} />, { role: "STUDENT", permissions: ["groups:read_own"] });

    await waitFor(async() => {
      expect(within(await itemOf("Próximas", "Grupo Grupo A")).getByRole("button", { name: /^Cancelar/ })).toBeInTheDocument();
    });
    unmount();

    mine = mine.map((reservation) => ({ ...reservation, holder: reservation.holder ? party("other", "Otra") : null, createdBy: party("other", "Otra") }));
    renderLab(<MyReservations now={NOW} />, { role: "ADMIN", permissions: [] });

    expect(within(await list("Próximas")).getAllByRole("button", { name: /^Cancelar/ })).toHaveLength(3);
  });

  it("asks for confirmation, posts the cancel once, revalidates and shows a toast", async() => {
    renderLab(<MyReservations now={NOW} />, { role: "STUDENT", permissions: ["groups:read_own"] });

    fireEvent.click(within(await itemOf("Próximas", "Propósito: Práctica de PEEP")).getByRole("button", { name: /^Cancelar/ }));
    const dialog = await screen.findByRole("dialog", { name: "¿Cancelar la reserva?" });

    expect(within(dialog).getByText(/La franja quedará libre para otras personas\./)).toBeInTheDocument();
    expect(cancelPosts).toEqual([]);
    mine = mine.filter((reservation) => reservation.id !== "own");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar reserva" }));

    expect(await screen.findByText("Reserva cancelada.")).toBeInTheDocument();
    expect(cancelPosts).toEqual(["own"]);
    await waitFor(() => expect(mineReads).toBe(2));
    await waitFor(() => expect(screen.queryByText("Propósito: Práctica de PEEP")).not.toBeInTheDocument());
  });

  it("warns that cancelling the reservation in progress ends the session", async() => {
    renderLab(<MyReservations now={NOW} />, { role: "STUDENT", permissions: ["groups:read_own"] });

    fireEvent.click(within(await itemOf("Próximas", "En curso")).getByRole("button", { name: /^Cancelar/ }));

    expect(await screen.findByText(/al cancelarla termina la sesión y se libera el ventilador/)).toBeInTheDocument();
  });

  it("sends nothing when the confirmation is dismissed", async() => {
    renderLab(<MyReservations now={NOW} />, { role: "STUDENT", permissions: ["groups:read_own"] });

    fireEvent.click(within(await itemOf("Próximas", "Propósito: Práctica de PEEP")).getByRole("button", { name: /^Cancelar/ }));
    const dialog = await screen.findByRole("dialog", { name: "¿Cancelar la reserva?" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Volver" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(cancelPosts).toEqual([]);
    expect(mineReads).toBe(1);
  });

  it.each([
    ["reservations.not_scheduled", 409, CANCEL_RESERVATION_ERROR_COPY.notScheduled],
    ["reservations.cancel_forbidden", 403, CANCEL_RESERVATION_ERROR_COPY.forbidden],
    ["reservations.reservation_not_found", 404, CANCEL_RESERVATION_ERROR_COPY.notFound],
  ])("shows the backend code %s in Spanish and refreshes the list", async(code, status, message) => {
    server.use(http.post(apiUrl("/api/reservations/:id/cancel"), () => errorResponse(code, status)));

    renderLab(<MyReservations now={NOW} />, { role: "STUDENT", permissions: ["groups:read_own"] });

    fireEvent.click(within(await itemOf("Próximas", "Propósito: Práctica de PEEP")).getByRole("button", { name: /^Cancelar/ }));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "¿Cancelar la reserva?" })).getByRole("button", { name: "Cancelar reserva" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    await waitFor(() => expect(mineReads).toBe(2));
  });

  it("shows the empty state", async() => {
    mine = [];

    renderLab(<MyReservations now={NOW} />, { role: "STUDENT", permissions: ["groups:read_own"] });

    expect(await screen.findByText("No tienes reservas.")).toBeInTheDocument();
  });
});
