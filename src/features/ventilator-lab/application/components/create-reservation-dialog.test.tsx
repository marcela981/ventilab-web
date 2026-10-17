/*
* Funcionalidad: Create reservation dialog tests
* Descripción: Holder options by role (a student without led groups books only for themselves; a group leader may book for the group; a teacher for the listed student groups; an admin for another user found by search), the Bogota window and the duration select, the request bodies, the Spanish copy of the backend failures (upcoming limit, outside the window, slot in the past, overlap) and the preemption hook: a preemptable 409 goes to onConflict and shows nothing when it is handled, the overlap message otherwise. v1.1 (T3): a teacher overlapping another teacher's reservation is told that only an admin can preempt it. Depends on vitest, msw, Testing Library and the lab test helpers.
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
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Permission, Role } from "@shared/session/session.entity";
import { CREATE_RESERVATION_ERROR_COPY } from "../entities/lab-error-messages";
import { LAB_SETTING_DEFAULTS } from "../entities/lab-settings.entity";
import { apiUrl, envelope, errorResponse, groupDto, myGroupsDto, renderLab, userDto } from "../pages/lab-test-helpers";
import { CreateReservationDialog } from "./create-reservation-dialog";
import type { CreateReservationDialogProps } from "./create-reservation-dialog";

const server = setupServer();
let posted: unknown[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  posted = [];
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const slotStart = new Date("2026-10-16T15:00:00.000Z");

function acceptPosts() {
  server.use(http.post(apiUrl("/api/reservations"), async({ request }) => {
    posted.push(await request.json());

    return HttpResponse.json(envelope(null), { status: 201 });
  }));
}

function renderDialog(
  role: Role,
  permissions: readonly Permission[],
  overrides: Partial<CreateReservationDialogProps> = {},
) {
  const props: CreateReservationDialogProps = {
    open: true,
    slotStart,
    durations: [15, 30, 45, 60],
    settings: LAB_SETTING_DEFAULTS,
    onClose: vi.fn(),
    onCreated: vi.fn(),
    ...overrides,
  };

  renderLab(<CreateReservationDialog {...props} />, { role, permissions });

  return { props, dialog: screen.getByRole("dialog", { name: "Reservar el ventilador" }) };
}

function pickOption(dialog: HTMLElement, field: string, option: string) {
  fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: field }));
  fireEvent.click(screen.getByRole("option", { name: option }));
}

// MUI selects and the debounced user search are slow under parallel runs: generous timeouts.
describe("CreateReservationDialog holders", { timeout: 20_000 }, () => {
  it("books a student without led groups for themselves with the chosen duration and purpose", async() => {
    acceptPosts();
    server.use(http.get(apiUrl("/api/groups/mine"), () => HttpResponse.json(envelope(myGroupsDto([
      { groupId: "g1", groupName: "Grupo A", groupType: "STUDENT", isActive: true, memberRole: "MEMBER" },
    ])))));

    const { props, dialog } = renderDialog("STUDENT", ["groups:read_own"]);

    expect(await within(dialog).findByText("La reserva queda a tu nombre.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(within(dialog).getByText(/10:00 – 10:15/)).toBeInTheDocument();

    pickOption(dialog, "Duración", "45 min");
    expect(within(dialog).getByText(/10:00 – 10:45/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Propósito (opcional)" }), { target: { value: "Práctica" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar" }));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalledTimes(1));
    expect(posted).toEqual([{
      holderType: "USER",
      startsAt: "2026-10-16T15:00:00.000Z",
      endsAt: "2026-10-16T15:45:00.000Z",
      purpose: "Práctica",
    }]);
  });

  it("lets a group leader book for the group", async() => {
    acceptPosts();
    server.use(http.get(apiUrl("/api/groups/mine"), () => HttpResponse.json(envelope(myGroupsDto([
      { groupId: "g1", groupName: "Grupo A", groupType: "STUDENT", isActive: true, memberRole: "LEADER" },
    ])))));

    const { props, dialog } = renderDialog("STUDENT", ["groups:read_own"]);

    fireEvent.click(await within(dialog).findByRole("radio", { name: "Para un grupo" }));
    expect(within(dialog).queryByRole("radio", { name: "Para otro usuario" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Reservar" })).toBeDisabled();

    pickOption(dialog, "Grupo", "Grupo A");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar" }));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    expect(posted[0]).toMatchObject({ holderType: "GROUP", groupId: "g1" });
  });

  it("offers a teacher the listed student groups but no user search", async() => {
    server.use(http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([groupDto("g1", "Grupo A"), groupDto("g2", "Grupo B")]))));

    const { dialog } = renderDialog("TEACHER", ["groups:read", "users:list"]);

    fireEvent.click(await within(dialog).findByRole("radio", { name: "Para un grupo" }));
    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "Grupo" }));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Grupo A", "Grupo B"]);
    expect(within(dialog).queryByRole("radio", { name: "Para otro usuario" })).not.toBeInTheDocument();
  });

  it("lets an admin book for another user found by search", async() => {
    acceptPosts();
    server.use(
      http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([]))),
      http.get(apiUrl("/api/users"), () => HttpResponse.json(envelope([userDto("u9", "Luis Pérez")]))),
    );

    const { props, dialog } = renderDialog("ADMIN", ["groups:read", "users:list"]);

    fireEvent.click(await within(dialog).findByRole("radio", { name: "Para otro usuario" }));
    const input = within(dialog).getByRole("combobox", { name: "Usuario" });

    input.focus();
    fireEvent.change(input, { target: { value: "lu" } });
    fireEvent.click(await screen.findByRole("option", { name: "Luis Pérez" }, { timeout: 2000 }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar" }));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    expect(posted[0]).toMatchObject({ holderType: "USER", userId: "u9" });
  });
});

describe("CreateReservationDialog errors", { timeout: 20_000 }, () => {
  const failWith = (code: string, status: number) => {
    server.use(
      http.get(apiUrl("/api/groups/mine"), () => HttpResponse.json(envelope(myGroupsDto([])))),
      http.post(apiUrl("/api/reservations"), () => errorResponse(code, status)),
    );
  };

  it.each([
    ["reservations.limit_reached", 409, CREATE_RESERVATION_ERROR_COPY.limitReached],
    ["reservations.too_far_ahead", 400, CREATE_RESERVATION_ERROR_COPY.tooFarAhead(14)],
    ["reservations.in_past", 400, CREATE_RESERVATION_ERROR_COPY.inPast],
    ["reservations.conflict", 409, CREATE_RESERVATION_ERROR_COPY.overlap],
  ])("shows the Spanish message of %s and stays open", async(code, status, message) => {
    failWith(code, status);

    const { props, dialog } = renderDialog("STUDENT", ["groups:read_own"]);

    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
    expect(props.onCreated).not.toHaveBeenCalled();
  });

  const preemptable = () => server.use(
    http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([]))),
    http.post(apiUrl("/api/reservations"), () => HttpResponse.json({
      success: false,
      message: "overlap",
      code: "reservations.conflict_preemptable",
      data: { preemptable: true, conflicts: [{ reservationId: "r1", holderName: "Ana", startsAt: "a", endsAt: "b" }] },
      timestamp: "",
      traceId: "t",
      pagination: null,
    }, { status: 409 })),
  );

  it("hands a preemptable overlap to onConflict and shows nothing when it is handled", async() => {
    preemptable();
    const onConflict = vi.fn(() => true);
    const { dialog } = renderDialog("TEACHER", ["groups:read"], { onConflict });

    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar" }));

    await waitFor(() => expect(onConflict).toHaveBeenCalledTimes(1));
    expect(onConflict).toHaveBeenCalledWith(
      { preemptable: true, conflicts: [expect.objectContaining({ reservationId: "r1", holderName: "Ana" })] },
      expect.objectContaining({ startsAt: slotStart, durationMinutes: 15 }),
    );
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the overlap message when no preemption flow is plugged in", async() => {
    preemptable();
    const { dialog } = renderDialog("TEACHER", ["groups:read"]);

    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(CREATE_RESERVATION_ERROR_COPY.overlap);
  });

  it("tells a teacher that only an admin can preempt another teacher's reservation", async() => {
    server.use(
      http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([]))),
      http.post(apiUrl("/api/reservations"), () => HttpResponse.json({
        success: false,
        message: "overlap",
        code: "reservations.conflict",
        data: { preemptable: false, conflicts: [{ reservationId: "r1", holderRole: "TEACHER", holderName: "Prof. Ruiz", startsAt: "a", endsAt: "b" }] },
        timestamp: "",
        traceId: "t",
        pagination: null,
      }, { status: 409 })),
    );
    const onConflict = vi.fn(() => true);
    const { dialog } = renderDialog("TEACHER", ["groups:read"], { onConflict });

    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(CREATE_RESERVATION_ERROR_COPY.adminOnlyPreempt);
    expect(onConflict).not.toHaveBeenCalled();
  });

  it("explains that no time is left when the page allows no duration", () => {
    const { dialog } = renderDialog("STUDENT", [], { durations: [] });

    expect(within(dialog).getByText("No queda tiempo libre desde esta franja.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Reservar" })).toBeDisabled();
  });
});
