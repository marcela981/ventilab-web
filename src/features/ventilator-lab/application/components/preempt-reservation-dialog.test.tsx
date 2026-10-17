/*
* Funcionalidad: Preempt reservation dialog tests
* Descripción: The staff preemption alert lists each overlapping reservation as the backend returned it (holder name and identifier, group, Bogota window), resends the same window with confirmPreempt and the chosen holder ("Asignarme a mí" or "Asignar a un grupo"), sends nothing on cancel and shows the backend failure (only an admin can preempt a teacher's reservation). v1.1 (T3 review fix): no exact preempted count, and the caller's own preemption is announced before the request and undone on failure. Depends on vitest, msw, Testing Library and the lab test helpers.
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
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SELF_HOLDER } from "../entities/create-reservation.entity";
import type { CreateReservationRequest, HolderOption, ReservationConflict } from "../entities/create-reservation.entity";
import { CREATE_RESERVATION_ERROR_COPY } from "../entities/lab-error-messages";
import { LAB_SETTING_DEFAULTS } from "../entities/lab-settings.entity";
import { apiUrl, envelope, groupDto, renderLab } from "../pages/lab-test-helpers";
import { PreemptReservationDialog } from "./preempt-reservation-dialog";
import type { PreemptReservationDialogProps } from "./preempt-reservation-dialog";

// Initial handler: the groups list survives resetHandlers, so a late revalidation never hits an unhandled request.
const server = setupServer(
  http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([groupDto("g1", "Grupo A"), groupDto("g2", "Grupo B")]))),
);
let posted: unknown[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  posted = [];
  server.use(http.post(apiUrl("/api/reservations"), async({ request }) => {
    posted.push(await request.json());

    return HttpResponse.json(envelope(null), { status: 201 });
  }));
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const conflict: ReservationConflict = {
  preemptable: true,
  conflicts: [
    {
      reservationId: "r1",
      holderType: "USER",
      holderRole: "STUDENT",
      holderName: "Ana Gómez",
      holderIdentifier: "ana@ventylab.demo",
      groupName: null,
      startsAt: "2026-10-16T15:00:00.000Z",
      endsAt: "2026-10-16T15:30:00.000Z",
    },
    {
      reservationId: "r2",
      holderType: "GROUP",
      holderRole: "STUDENT",
      holderName: "Grupo C",
      holderIdentifier: null,
      groupName: "Grupo C",
      startsAt: "2026-10-16T15:30:00.000Z",
      endsAt: "2026-10-16T16:00:00.000Z",
    },
  ],
};

const request = (holder: HolderOption = SELF_HOLDER): CreateReservationRequest => ({
  holder,
  startsAt: new Date("2026-10-16T15:00:00.000Z"),
  durationMinutes: 60,
  purpose: "Clase",
});

function renderDialog(overrides: Partial<PreemptReservationDialogProps> = {}) {
  const props: PreemptReservationDialogProps = {
    open: true,
    conflict,
    request: request(),
    settings: LAB_SETTING_DEFAULTS,
    onClose: vi.fn(),
    onCreated: vi.fn(),
    ...overrides,
  };

  renderLab(<PreemptReservationDialog {...props} />, { role: "TEACHER", permissions: ["groups:read"] });

  return { props, dialog: screen.getByRole("alertdialog", { name: "Desplazar reservas" }) };
}

describe("PreemptReservationDialog", { timeout: 20_000 }, () => {
  it("lists each conflict as the backend returned it", () => {
    const { dialog } = renderDialog();
    const items = within(dialog).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Ana Gómez");
    expect(items[0]).toHaveTextContent("ana@ventylab.demo");
    expect(items[0]).toHaveTextContent(/10:00 – 10:30/);
    expect(items[1]).toHaveTextContent("Grupo Grupo C");
    expect(items[1]).toHaveTextContent(/10:30 – 11:00/);
  });

  it("does not promise how many reservations will be preempted (T3 review fix W2)", () => {
    const { dialog } = renderDialog();

    expect(dialog).toHaveTextContent("se desplazarán todas las reservas en conflicto");
    expect(dialog).not.toHaveTextContent(/estas 2 reservas/);
  });

  it("resends the same window with confirmPreempt for the caller", async() => {
    const undo = vi.fn();
    let postedWhenAnnounced = -1;
    const onPreempting = vi.fn(() => {
      postedWhenAnnounced = posted.length;

      return undo;
    });
    const { props, dialog } = renderDialog({ onPreempting });

    expect(within(dialog).getByRole("radio", { name: "Asignarme a mí" })).toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: "Desplazar y reservar" }));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalledTimes(1));
    // The caller's own preemption is announced before the request (the realtime event may beat the response).
    expect(onPreempting).toHaveBeenCalledWith(["r1", "r2"]);
    expect(postedWhenAnnounced).toBe(0);
    expect(undo).not.toHaveBeenCalled();
    expect(posted).toEqual([{
      holderType: "USER",
      startsAt: "2026-10-16T15:00:00.000Z",
      endsAt: "2026-10-16T16:00:00.000Z",
      purpose: "Clase",
      confirmPreempt: true,
    }]);
  });

  it("resends for the chosen group", async() => {
    const { props, dialog } = renderDialog();

    fireEvent.click(await within(dialog).findByRole("radio", { name: "Asignar a un grupo" }));
    expect(within(dialog).getByRole("button", { name: "Desplazar y reservar" })).toBeDisabled();
    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "Grupo" }));
    fireEvent.click(screen.getByRole("option", { name: "Grupo B" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Desplazar y reservar" }));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    expect(posted[0]).toMatchObject({ holderType: "GROUP", groupId: "g2", confirmPreempt: true });
  });

  it("starts from the group of the original request", async() => {
    const group: HolderOption = { kind: "group", key: "g1", holderType: "GROUP", userId: null, groupId: "g1", label: "Grupo A" };
    const { dialog } = renderDialog({ request: request(group) });

    expect(await within(dialog).findByRole("radio", { name: "Asignar a un grupo" })).toBeChecked();
    expect(within(dialog).getByRole("combobox", { name: "Grupo" })).toHaveTextContent("Grupo A");
  });

  it("sends nothing on cancel", async() => {
    const { props, dialog } = renderDialog();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(posted).toEqual([]);
  });

  it("shows the backend failure and stays open", async() => {
    server.use(http.post(apiUrl("/api/reservations"), () => HttpResponse.json({
      success: false,
      message: "overlap",
      code: "reservations.conflict",
      data: { preemptable: false, conflicts: [{ ...conflict.conflicts[0], holderRole: "TEACHER" }] },
      timestamp: "",
      traceId: "t",
      pagination: null,
    }, { status: 409 })));

    const undo = vi.fn();
    const { props, dialog } = renderDialog({ onPreempting: () => undo });

    fireEvent.click(within(dialog).getByRole("button", { name: "Desplazar y reservar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(CREATE_RESERVATION_ERROR_COPY.adminOnlyPreempt);
    expect(props.onCreated).not.toHaveBeenCalled();
    expect(undo).toHaveBeenCalledTimes(1);
  });
});
