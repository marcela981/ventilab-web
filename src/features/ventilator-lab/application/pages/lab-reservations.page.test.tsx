/*
* Funcionalidad: Lab reservations page tests
* Descripción: /lab/reservations with msw: the Bogota week of the current date and its range query, the slot rules from the lab settings (vendored defaults for a student, the platform settings for an admin), occupied slots with only the backend label for a student and the holder name for staff, past slots without a booking button, week and day navigation with new range queries, booking a free slot through the dialog (POST, confirmation, calendar revalidated because the backend returns data null), realtime revalidation on ventilator:availability and the retryable error state. v1.1 (T3): staff preemption from an occupied slot (uncapped durations, 409 alert, confirmPreempt resend, confirmation), students cannot select occupied slots, the preempted holder toast without duplicates and the calendar refresh. v1.2 (T2 review fix + T4): the range query ends maxDurationMinutes after the range (durations of the last slots see the next day's reservations), another range shows its skeleton or its error instead of the previous range's slots, a slot taken while the dialog is open leaves no duration and disables Reservar, and the "Mis reservas" section is on the page. v1.3 (T3/T4 review fixes): the caller is not told about the reservation the caller preempts, teacher over teacher gets the admin-only message, and no duration is offered while the calendar of new settings loads. v1.4 (O1 notifications): the preemption toast moved to the notifications feature; the page shows no preemption toast and still refreshes the calendar on the preemption events. v1.5 (B2 closure): no own-preemption suppression (the backend does not notify the actor); the RESERVATION_PREEMPTED notification carries its typed data. v1.6 (S8): fixtures carry the regenerated block 1 contract fields (party code null).
* Versión: 1.6
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LAB_RESERVATIONS_COPY, LabReservationsPage } from "./lab-reservations.page";
import {
  apiUrl,
  createFakeSocket,
  detailDto,
  envelope,
  errorResponse,
  myGroupsDto,
  renderLab,
  settingDto,
  summaryDto,
} from "./lab-test-helpers";

const server = setupServer();
let calendarQueries: string[] = [];
let calendarItems: unknown[] = [];
let posted: unknown[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // Friday 2026-10-16, 09:37 in Bogota.
  vi.setSystemTime(new Date("2026-10-16T14:37:00.000Z"));
  calendarQueries = [];
  posted = [];
  calendarItems = [summaryDto("other", "reservations.labels.student", "Reserved by a student")];
  server.use(
    http.get(apiUrl("/api/reservations"), ({ request }) => {
      calendarQueries.push(new URL(request.url).search);

      return HttpResponse.json(envelope(calendarItems));
    }),
    http.get(apiUrl("/api/reservations/mine"), () => HttpResponse.json(envelope([]))),
    http.get(apiUrl("/api/groups/mine"), () => HttpResponse.json(envelope(myGroupsDto([])))),
    http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([]))),
    http.post(apiUrl("/api/reservations"), async({ request }) => {
      posted.push(await request.json());

      return HttpResponse.json(envelope(null), { status: 201 });
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const LOAD_TIMEOUT = 10_000;
const calendarTable = () => screen.findByRole("table", { name: "Calendario de reservas del ventilador" }, { timeout: LOAD_TIMEOUT });

// The week table renders 7 × 96 slot cells: generous timeouts for parallel runs.
describe("LabReservationsPage", { timeout: 30_000 }, () => {
  it("shows the Bogota week with the default rules and only the backend label to a student", async() => {
    renderLab(<LabReservationsPage />, { role: "STUDENT", permissions: ["groups:read_own"], socket: createFakeSocket() });

    const table = await calendarTable();

    expect(calendarQueries).toEqual(["?from=2026-10-12T05:00:00.000Z&to=2026-10-19T07:00:00.000Z"]);
    expect(within(table).getAllByRole("columnheader")).toHaveLength(8);
    expect(screen.getByText(/Franjas de 15 min · duración máxima 2 h · reservas con hasta 14 días de antelación/)).toBeInTheDocument();
    expect(within(table).getByText("Reservado por un estudiante")).toBeInTheDocument();
    expect(within(table).queryByText("Ana Gómez")).not.toBeInTheDocument();
    // Monday is in the past: no booking buttons; on Friday 09:15 is past and the slot in progress (09:30) is bookable.
    const labels = within(table).getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? "");
    const friday = labels.filter((label) => label.includes("16 de oct"));

    expect(labels.filter((label) => label.includes("12 de oct"))).toEqual([]);
    expect(friday.some((label) => label.includes("09:30 – 09:45"))).toBe(true);
    expect(friday.some((label) => label.includes("09:15 – 09:30"))).toBe(false);
    // 11:00–12:00 Bogota is taken.
    expect(friday.some((label) => label.includes("11:00 – 11:15"))).toBe(false);
  });

  it("uses the platform settings and shows the holder name to staff", async() => {
    calendarItems = [detailDto("mine", { startsAt: "2026-10-16T16:00:00.000Z", endsAt: "2026-10-16T17:00:00.000Z" })];
    server.use(http.get(apiUrl("/api/platform-settings"), () => HttpResponse.json(envelope([
      settingDto("reservations.slotMinutes", 30),
    ]))));

    renderLab(<LabReservationsPage />, { role: "ADMIN", permissions: ["settings:manage", "groups:read", "users:list"] });

    expect(await screen.findByText(/Franjas de 30 min/)).toBeInTheDocument();
    expect(within(await calendarTable()).getByText("Ana Gómez")).toBeInTheDocument();
  });

  it("navigates by week and by day with new range queries", async() => {
    renderLab(<LabReservationsPage />);

    await calendarTable();
    fireEvent.click(screen.getByRole("button", { name: "Semana siguiente" }));
    await waitFor(() => expect(calendarQueries).toContain("?from=2026-10-19T05:00:00.000Z&to=2026-10-26T07:00:00.000Z"), { timeout: LOAD_TIMEOUT });

    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    fireEvent.click(screen.getByRole("button", { name: "Día" }));
    await waitFor(() => expect(calendarQueries).toContain("?from=2026-10-16T05:00:00.000Z&to=2026-10-17T07:00:00.000Z"), { timeout: LOAD_TIMEOUT });
    expect(within(await calendarTable()).getAllByRole("columnheader")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Día anterior" }));
    await waitFor(() => expect(calendarQueries).toContain("?from=2026-10-15T05:00:00.000Z&to=2026-10-16T07:00:00.000Z"), { timeout: LOAD_TIMEOUT });
  });

  it("books a free slot and revalidates the calendar", async() => {
    renderLab(<LabReservationsPage />, { role: "STUDENT", permissions: ["groups:read_own"] });

    await calendarTable();
    fireEvent.click(screen.getByRole("button", { name: "Día" }));
    await waitFor(() => expect(calendarQueries).toHaveLength(2), { timeout: LOAD_TIMEOUT });

    fireEvent.click(await within(await calendarTable()).findByRole("button", { name: /10:00 – 10:15/ }, { timeout: LOAD_TIMEOUT }));
    const dialog = await screen.findByRole("dialog", { name: "Reservar el ventilador" });

    // The limited reservation starts at 11:00 Bogota: from 10:00 only one hour is free.
    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "Duración" }));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["15 min", "30 min", "45 min", "1 h"]);
    fireEvent.click(screen.getByRole("option", { name: "1 h" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar" }));

    expect(await screen.findByText("Reserva creada.", {}, { timeout: LOAD_TIMEOUT })).toBeInTheDocument();
    expect(posted).toEqual([{ holderType: "USER", startsAt: "2026-10-16T15:00:00.000Z", endsAt: "2026-10-16T16:00:00.000Z" }]);
    await waitFor(() => expect(calendarQueries).toHaveLength(3), { timeout: LOAD_TIMEOUT });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), { timeout: LOAD_TIMEOUT });
  });

  it("lets a teacher book over a student's reservation through the preemption dialog", async() => {
    calendarItems = [detailDto("student", { startsAt: "2026-10-16T16:00:00.000Z", endsAt: "2026-10-16T17:00:00.000Z" })];
    const socket = createFakeSocket();

    server.use(http.post(apiUrl("/api/reservations"), async({ request }) => {
      const body = await request.json() as Record<string, unknown>;

      posted.push(body);

      if (body.confirmPreempt === true) {
        // The backend notifies every holder (even a staff caller holding the preempted one) before answering.
        socket.dispatch("reservation:preempted", {
          reservationId: "student",
          holderType: "USER",
          groupId: null,
          startsAt: "2026-10-16T16:00:00.000Z",
          endsAt: "2026-10-16T17:00:00.000Z",
          reason: null,
          wasActive: false,
        });

        return HttpResponse.json(envelope(null), { status: 201 });
      }

      return HttpResponse.json({
        success: false,
        message: "overlap",
        code: "reservations.conflict_preemptable",
        data: {
          preemptable: true,
          conflicts: [{
            reservationId: "student",
            holderType: "USER",
            holderRole: "STUDENT",
            holderName: "Ana Gómez",
            holderIdentifier: "ana@ventylab.demo",
            startsAt: "2026-10-16T16:00:00.000Z",
            endsAt: "2026-10-16T17:00:00.000Z",
          }],
        },
        timestamp: "",
        traceId: "t",
        pagination: null,
      }, { status: 409 });
    }));

    renderLab(<LabReservationsPage />, { role: "TEACHER", permissions: ["groups:read"], socket });

    await calendarTable();
    fireEvent.click(screen.getByRole("button", { name: "Día" }));
    await waitFor(() => expect(calendarQueries).toHaveLength(2), { timeout: LOAD_TIMEOUT });
    fireEvent.click(await within(await calendarTable()).findByRole(
      "button",
      { name: /11:00 – 11:15 sobre la reserva de Ana Gómez/ },
      { timeout: LOAD_TIMEOUT },
    ));
    const dialog = await screen.findByRole("dialog", { name: "Reservar el ventilador" });

    // Staff durations are not capped by the reservation they book over.
    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "Duración" }));
    expect(screen.getAllByRole("option").map((option) => option.textContent).at(-1)).toBe("2 h");
    fireEvent.click(screen.getByRole("option", { name: "1 h" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar" }));

    const alert = await screen.findByRole("alertdialog", { name: "Desplazar reservas" }, { timeout: LOAD_TIMEOUT });

    expect(within(alert).getByText("Ana Gómez")).toBeInTheDocument();
    expect(within(alert).getByText("ana@ventylab.demo")).toBeInTheDocument();
    fireEvent.click(within(alert).getByRole("button", { name: "Desplazar y reservar" }));

    expect(await screen.findByText(LAB_RESERVATIONS_COPY.createdWithPreemption, {}, { timeout: LOAD_TIMEOUT }))
      .toBeInTheDocument();
    // The page shows no preemption notice of its own (the backend does not notify the actor; B2 closure).
    expect(screen.queryByText(/^Tu reserva del ventilador/)).not.toBeInTheDocument();
    expect(posted).toEqual([
      { holderType: "USER", startsAt: "2026-10-16T16:00:00.000Z", endsAt: "2026-10-16T17:00:00.000Z" },
      { holderType: "USER", startsAt: "2026-10-16T16:00:00.000Z", endsAt: "2026-10-16T17:00:00.000Z", confirmPreempt: true },
    ]);
    // Revalidated after the creation and by the realtime preemption event.
    await waitFor(() => expect(calendarQueries.length).toBeGreaterThanOrEqual(3), { timeout: LOAD_TIMEOUT });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), { timeout: LOAD_TIMEOUT });
  });

  it("tells a teacher booking over another teacher that only an admin can preempt it (T3 review fix S3)", async() => {
    calendarItems = [detailDto("teacher", {
      startsAt: "2026-10-16T16:00:00.000Z",
      endsAt: "2026-10-16T17:00:00.000Z",
      holderRole: "TEACHER",
      holder: { id: "t2", code: null, name: "Profesor Ruiz", identifier: "ruiz@ventylab.demo", role: "TEACHER" },
    })];
    server.use(http.post(apiUrl("/api/reservations"), async({ request }) => {
      posted.push(await request.json());

      return HttpResponse.json({
        success: false,
        message: "overlap",
        code: "reservations.conflict",
        data: {
          preemptable: false,
          conflicts: [{
            reservationId: "teacher",
            holderType: "USER",
            holderRole: "TEACHER",
            holderName: "Profesor Ruiz",
            holderIdentifier: "ruiz@ventylab.demo",
            startsAt: "2026-10-16T16:00:00.000Z",
            endsAt: "2026-10-16T17:00:00.000Z",
          }],
        },
        timestamp: "",
        traceId: "t",
        pagination: null,
      }, { status: 409 });
    }));

    renderLab(<LabReservationsPage />, { role: "TEACHER", permissions: ["groups:read"] });

    await calendarTable();
    fireEvent.click(screen.getByRole("button", { name: "Día" }));
    await waitFor(() => expect(calendarQueries).toHaveLength(2), { timeout: LOAD_TIMEOUT });
    fireEvent.click(await within(await calendarTable()).findByRole(
      "button",
      { name: /11:00 – 11:15 sobre la reserva de Profesor Ruiz/ },
      { timeout: LOAD_TIMEOUT },
    ));
    const dialog = await screen.findByRole("dialog", { name: "Reservar el ventilador" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar" }));

    expect(await within(dialog).findByText(/Solo un administrador puede desplazarla/, {}, { timeout: LOAD_TIMEOUT })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog", { name: "Desplazar reservas" })).not.toBeInTheDocument();
    expect(posted).toHaveLength(1);
  });

  it("does not let a student select occupied slots", async() => {
    calendarItems = [detailDto("mine", { startsAt: "2026-10-16T16:00:00.000Z", endsAt: "2026-10-16T17:00:00.000Z" })];

    renderLab(<LabReservationsPage />, { role: "STUDENT", permissions: ["groups:read_own"] });

    const table = await calendarTable();

    expect(within(table).queryByRole("button", { name: /sobre la reserva/ })).not.toBeInTheDocument();
  });

  it("refreshes the calendar on a preemption without a toast of its own (O1: the notification toast is the notice)", async() => {
    const socket = createFakeSocket();

    renderLab(<LabReservationsPage />, { socket });

    await calendarTable();
    socket.dispatch("reservation:preempted", {
      reservationId: "r1",
      holderType: "USER",
      groupId: null,
      startsAt: "2026-10-16T16:00:00.000Z",
      endsAt: "2026-10-16T17:00:00.000Z",
      reason: null,
      wasActive: false,
    });
    socket.dispatch("notification:new", {
      id: "n1",
      type: "RESERVATION_PREEMPTED",
      title: "Tu reserva del ventilador fue desplazada",
      body: "Tu reserva fue reemplazada por otra reserva.",
      data: { reservationId: "r1", replacedByReservationId: "r2" },
      createdAt: "2026-10-16T14:40:00.000Z",
      readAt: null,
    });

    await waitFor(() => expect(calendarQueries).toHaveLength(2), { timeout: LOAD_TIMEOUT });
    expect(screen.queryByText(/^Tu reserva del ventilador/)).not.toBeInTheDocument();
    expect(screen.queryByText("Tu reserva fue reemplazada por otra reserva.")).not.toBeInTheDocument();
  });

  it("revalidates the calendar on ventilator:availability", async() => {
    const socket = createFakeSocket();

    renderLab(<LabReservationsPage />, { socket });

    await calendarTable();
    socket.dispatch("ventilator:availability", { occupied: true });
    await waitFor(() => expect(calendarQueries).toHaveLength(2), { timeout: LOAD_TIMEOUT });
  });

  it("shows a retryable error", async() => {
    let fail = true;

    server.use(http.get(apiUrl("/api/reservations"), () => {
      if (fail) {
        return errorResponse("common.internal_server_error", 500);
      }

      return HttpResponse.json(envelope([]));
    }));

    renderLab(<LabReservationsPage />);

    expect(await screen.findByText("No se pudo cargar el calendario")).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(await calendarTable()).toBeInTheDocument();
  });

  it("shows the next range's skeleton or error, never the previous range's slots", async() => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(http.get(apiUrl("/api/reservations"), async({ request }) => {
      const search = new URL(request.url).search;

      calendarQueries.push(search);

      if (search.startsWith("?from=2026-10-19")) {
        await held;

        return errorResponse("common.internal_server_error", 500);
      }

      return HttpResponse.json(envelope(calendarItems));
    }));

    renderLab(<LabReservationsPage />);

    await calendarTable();
    fireEvent.click(screen.getByRole("button", { name: "Semana siguiente" }));
    await waitFor(() => expect(screen.queryByRole("table", { name: "Calendario de reservas del ventilador" })).not.toBeInTheDocument());
    expect(screen.getByRole("status", { name: "Cargando el calendario…" })).toBeInTheDocument();
    release();
    expect(await screen.findByText("No se pudo cargar el calendario", {}, { timeout: LOAD_TIMEOUT })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Calendario de reservas del ventilador" })).not.toBeInTheDocument();
  });

  it("caps the durations of the last slot of the range with a reservation of the next day", async() => {
    // Monday 2026-10-19 00:00–01:00 Bogota: outside the week shown, inside the loaded margin.
    calendarItems = [summaryDto("monday", "reservations.labels.student", "x")].map((item) => ({
      ...item,
      startsAt: "2026-10-19T05:00:00.000Z",
      endsAt: "2026-10-19T06:00:00.000Z",
    }));

    renderLab(<LabReservationsPage />, { role: "STUDENT", permissions: ["groups:read_own"] });

    fireEvent.click(await within(await calendarTable()).findByRole("button", { name: /18 de oct · 23:30 – 23:45/ }, { timeout: LOAD_TIMEOUT }));
    const dialog = await screen.findByRole("dialog", { name: "Reservar el ventilador" });

    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "Duración" }));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["15 min", "30 min"]);
  });

  it("offers no duration and disables Reservar when the chosen slot is taken while the dialog is open", async() => {
    const socket = createFakeSocket();

    renderLab(<LabReservationsPage />, { role: "STUDENT", permissions: ["groups:read_own"], socket });

    fireEvent.click(await within(await calendarTable()).findByRole("button", { name: /16 de oct · 10:00 – 10:15/ }, { timeout: LOAD_TIMEOUT }));
    const dialog = await screen.findByRole("dialog", { name: "Reservar el ventilador" });

    expect(within(dialog).getByRole("button", { name: "Reservar" })).toBeEnabled();
    calendarItems = [summaryDto("taken", "reservations.labels.student", "x")].map((item) => ({
      ...item,
      startsAt: "2026-10-16T15:00:00.000Z",
      endsAt: "2026-10-16T15:30:00.000Z",
    }));
    socket.dispatch("ventilator:availability", { occupied: false });

    expect(await within(dialog).findByText("No queda tiempo libre desde esta franja.", {}, { timeout: LOAD_TIMEOUT })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Reservar" })).toBeDisabled();
    expect(posted).toEqual([]);
  });

  it("offers no duration while the calendar of new settings loads, then the allowed ones (T4 review fix W1)", async() => {
    let releaseSettings: () => void = () => undefined;
    let releaseCalendar: () => void = () => undefined;

    server.use(
      http.get(apiUrl("/api/platform-settings"), async() => {
        await new Promise<void>((resolve) => {
          releaseSettings = resolve;
        });

        return HttpResponse.json(envelope([settingDto("reservations.maxDurationMinutes", 60)]));
      }),
      http.get(apiUrl("/api/reservations"), async({ request }) => {
        calendarQueries.push(new URL(request.url).search);

        if (calendarQueries.length > 1) {
          await new Promise<void>((resolve) => {
            releaseCalendar = resolve;
          });
        }

        return HttpResponse.json(envelope([]));
      }),
    );

    renderLab(<LabReservationsPage />, { role: "ADMIN", permissions: ["settings:manage", "groups:read", "users:list"] });

    fireEvent.click(await within(await calendarTable()).findByRole("button", { name: /16 de oct · 10:00 – 10:15/ }, { timeout: LOAD_TIMEOUT }));
    const dialog = await screen.findByRole("dialog", { name: "Reservar el ventilador" });

    expect(within(dialog).getByRole("button", { name: "Reservar" })).toBeEnabled();
    act(() => releaseSettings());
    await waitFor(() => expect(calendarQueries).toHaveLength(2), { timeout: LOAD_TIMEOUT });

    expect(await within(dialog).findByText("Comprobando la disponibilidad…", {}, { timeout: LOAD_TIMEOUT })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Reservar" })).toBeDisabled();

    act(() => releaseCalendar());
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Reservar" })).toBeEnabled(), { timeout: LOAD_TIMEOUT });
    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "Duración" }));
    expect(screen.getAllByRole("option").map((option) => option.textContent).at(-1)).toBe("1 h");
  });

  it("shows the \"Mis reservas\" section", async() => {
    renderLab(<LabReservationsPage />);

    expect(await screen.findByRole("heading", { name: "Mis reservas" })).toBeInTheDocument();
    expect(await screen.findByText("No tienes reservas.", {}, { timeout: LOAD_TIMEOUT })).toBeInTheDocument();
  });
});
