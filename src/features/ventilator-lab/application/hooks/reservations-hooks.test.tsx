/*
* Funcionalidad: Reservation calendar and booking hooks tests
* Descripción: useHolderOptions by role (a student gets only the student groups they lead from /api/groups/mine; a teacher the active student groups of /api/groups; an admin every active group and the user search; a failed read keeps no groups and reports the error), useUserHolderSearch (nothing below two characters, then the users search), useReservationsCalendar (range query, revalidated by ventilator:availability through useReservationsRealtime) and useCreateReservation (request body, calendar and mine revalidated after the data-null 201, a 409 with its parsed conflict, other failures without conflict). v1.1 (T2 review fix): a teacher is offered only the groups of the list the teacher did not create (certainly supervised), and the calendar never returns the previous range's data while another range loads or fails. v1.2 (T4 review fix S3): useCancelReservation resolves before the revalidations finish. Depends on vitest, msw, Testing Library and the lab test helpers.
*   v1.3 (W7, Bloque 1): fixtures and expectations follow the W7 contract (current reservation relation, holder student code, immediate booking, created reservation id).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { SELF_HOLDER } from "../entities/create-reservation.entity";
import {
  apiUrl,
  createFakeSocket,
  envelope,
  errorResponse,
  groupDto,
  myGroupsDto,
  renderLabHook,
  summaryDto,
  userDto,
} from "../pages/lab-test-helpers";
import { useCancelReservation } from "./use-cancel-reservation";
import { useCreateReservation } from "./use-create-reservation";
import { useHolderOptions, useUserHolderSearch } from "./use-holder-options";
import { useMyReservations } from "./use-lab-reservations";
import { useReservationsCalendar } from "./use-reservations-calendar";
import { useReservationsRealtime } from "./use-reservations-realtime";

const server = setupServer();
const requests: string[] = [];
let term = "a";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);

    requests.push(`${request.method} ${url.pathname}${url.search}`);
  });
});

afterEach(() => {
  requests.length = 0;
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const membership = (groupId: string, groupName: string, memberRole: "LEADER" | "MEMBER") => ({
  groupId,
  groupName,
  groupType: "STUDENT" as const,
  isActive: true,
  memberRole,
});

describe("useHolderOptions", () => {
  it("offers a student only the groups they lead and never lists the staff groups", async() => {
    server.use(http.get(apiUrl("/api/groups/mine"), () => HttpResponse.json(envelope(myGroupsDto([
      membership("g1", "Grupo A", "LEADER"),
      membership("g2", "Grupo B", "MEMBER"),
    ])))));

    const { result } = renderLabHook(() => useHolderOptions(), { role: "STUDENT", permissions: ["groups:read_own"] });

    await waitFor(() => expect(result.current.groups).toHaveLength(1));
    expect(result.current.groups[0]).toMatchObject({ kind: "group", groupId: "g1", label: "Grupo A" });
    expect(result.current.canPickUser).toBe(false);
    expect(requests).toEqual(["GET /api/groups/mine"]);
  });

  it("offers a teacher only the student groups of the list that the teacher supervises (not the ones the teacher created)", async() => {
    server.use(http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([
      groupDto("g1", "Grupo A", { createdBy: "other-teacher" }),
      groupDto("g2", "Grupo creado", { createdBy: "teacher-1" }),
    ]))));

    const { result } = renderLabHook(() => useHolderOptions(), { role: "TEACHER", permissions: ["groups:read", "users:list"] });

    await waitFor(() => expect(result.current.groups.map(({ label }) => label)).toEqual(["Grupo A"]));
    expect(result.current.canPickUser).toBe(false);
    expect(requests).toEqual(["GET /api/groups?isActive=true&type=STUDENT"]);
  });

  it("offers an admin every active group and the user search", async() => {
    server.use(http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([
      groupDto("g1", "Grupo A"),
      groupDto("t1", "Docentes", { type: "TEACHER" }),
    ]))));

    const { result } = renderLabHook(() => useHolderOptions(), { role: "ADMIN", permissions: ["groups:read", "users:list"] });

    await waitFor(() => expect(result.current.groups).toHaveLength(2));
    expect(result.current.canPickUser).toBe(true);
    expect(requests).toEqual(["GET /api/groups?isActive=true"]);
  });

  it("reports a failed read and keeps no group options", async() => {
    server.use(http.get(apiUrl("/api/groups/mine"), () => errorResponse("common.internal_server_error", 500)));

    const { result } = renderLabHook(() => useHolderOptions(), { role: "STUDENT", permissions: ["groups:read_own"] });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.groups).toEqual([]);
  });

  it("requests nothing while disabled", async() => {
    renderLabHook(() => useHolderOptions(false), { role: "ADMIN", permissions: ["groups:read", "users:list"] });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(requests).toEqual([]);
  });
});

describe("useUserHolderSearch", () => {
  it("searches users from two characters on", async() => {
    server.use(http.get(apiUrl("/api/users"), () => HttpResponse.json(envelope([userDto("u1", "Ana Pérez")]))));

    const { result, rerender } = renderLabHook(
      () => useUserHolderSearch(term, true),
      { role: "ADMIN", permissions: ["users:list"] },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(requests).toEqual([]);
    expect(result.current.options).toEqual([]);

    term = "an";
    rerender();

    await waitFor(() => expect(result.current.options.map(({ label }) => label)).toEqual(["Ana Pérez"]));
    expect(requests).toEqual(["GET /api/users?search=an&limit=20&isActive=true&sortBy=name&sortOrder=asc"]);
  });
});


describe("useReservationsCalendar", () => {
  it("reads the range and refetches it on ventilator:availability", async() => {
    server.use(http.get(apiUrl("/api/reservations"), () => HttpResponse.json(envelope([
      summaryDto("r1", "reservations.labels.student", "Reserved by a student"),
    ]))));

    const socket = createFakeSocket();
    const { result } = renderLabHook(() => {
      useReservationsRealtime();

      return useReservationsCalendar(new Date("2026-10-12T05:00:00.000Z"), new Date("2026-10-19T05:00:00.000Z"));
    }, { socket });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0]).toMatchObject({ visibility: "limited", occupancyLabel: "Reservado por un estudiante" });
    expect(requests).toEqual(["GET /api/reservations?from=2026-10-12T05:00:00.000Z&to=2026-10-19T05:00:00.000Z"]);

    socket.dispatch("ventilator:availability", { occupied: false });
    await waitFor(() => expect(requests).toHaveLength(2));
  });

  it("never returns the previous range's data while another range loads, and shows that range's failure", async() => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(http.get(apiUrl("/api/reservations"), async({ request }) => {
      const from = new URL(request.url).searchParams.get("from");

      if (from === "2026-10-19T05:00:00.000Z") {
        await held;

        return HttpResponse.json(envelope([]));
      }

      if (from === "2026-10-26T05:00:00.000Z") {
        return HttpResponse.json({ success: false, message: "x", code: "common.internal_server_error", data: null }, { status: 500 });
      }

      return HttpResponse.json(envelope([summaryDto("r1", "reservations.labels.student", "Reserved by a student")]));
    }));

    const day = 24 * 60 * 60 * 1000;
    const { result, rerender } = renderLabHook(({ from }: { from: string }) => useReservationsCalendar(
      new Date(from),
      new Date(new Date(from).getTime() + 7 * day),
    ), { initialProps: { from: "2026-10-12T05:00:00.000Z" } });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    rerender({ from: "2026-10-19T05:00:00.000Z" });
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    release();
    await waitFor(() => expect(result.current.data).toEqual([]));

    rerender({ from: "2026-10-26T05:00:00.000Z" });
    await waitFor(() => expect(result.current.error?.status).toBe(500));
    expect(result.current.data).toBeNull();
  });
});

describe("useCreateReservation", () => {
  const request = { holder: SELF_HOLDER, startsAt: new Date("2026-10-16T15:00:00.000Z"), durationMinutes: 30, purpose: "Práctica" };

  it("posts the reservation and revalidates the calendar and my reservations", async() => {
    let body: unknown = null;

    server.use(
      http.post(apiUrl("/api/reservations"), async({ request: incoming }) => {
        body = await incoming.json();

        return HttpResponse.json(envelope(null), { status: 201 });
      }),
      http.get(apiUrl("/api/reservations"), () => HttpResponse.json(envelope([]))),
      http.get(apiUrl("/api/reservations/mine"), () => HttpResponse.json(envelope([]))),
    );

    const { result } = renderLabHook(() => ({
      create: useCreateReservation(),
      calendar: useReservationsCalendar(new Date("2026-10-12T05:00:00.000Z"), new Date("2026-10-19T05:00:00.000Z")),
      mine: useMyReservations(),
    }));

    await waitFor(() => expect(result.current.calendar.data).toEqual([]));
    await waitFor(() => expect(result.current.mine.data).toEqual([]));

    let outcome: unknown = null;

    await act(async() => {
      outcome = await result.current.create.submit(request);
    });

    expect(outcome).toEqual({ kind: "created", reservationId: null });
    expect(body).toEqual({
      holderType: "USER",
      startsAt: "2026-10-16T15:00:00.000Z",
      endsAt: "2026-10-16T15:30:00.000Z",
      purpose: "Práctica",
    });
    expect(requests.filter((line) => line.startsWith("GET /api/reservations?"))).toHaveLength(2);
    expect(requests.filter((line) => line === "GET /api/reservations/mine")).toHaveLength(2);
    expect(result.current.create.isSubmitting).toBe(false);
  });

  it("resolves a 409 with the parsed conflict", async() => {
    server.use(http.post(apiUrl("/api/reservations"), () => HttpResponse.json({
      success: false,
      message: "overlap",
      code: "reservations.conflict_preemptable",
      data: { preemptable: true, conflicts: [{ reservationId: "r1", holderName: "Ana", startsAt: "a", endsAt: "b" }] },
      timestamp: "",
      traceId: "t",
      pagination: null,
    }, { status: 409 })));

    const { result } = renderLabHook(() => useCreateReservation(), { role: "TEACHER" });
    const outcome = await act(() => result.current.submit(request));

    expect(outcome).toMatchObject({
      kind: "failed",
      error: { status: 409, code: "reservations.conflict_preemptable" },
      conflict: { preemptable: true, conflicts: [{ reservationId: "r1", holderName: "Ana" }] },
    });
  });

  it("resolves other failures without a conflict", async() => {
    server.use(http.post(apiUrl("/api/reservations"), () => errorResponse("reservations.limit_reached", 409)));

    const { result } = renderLabHook(() => useCreateReservation());
    const outcome = await act(() => result.current.submit(request));

    expect(outcome).toMatchObject({ kind: "failed", error: { code: "reservations.limit_reached" }, conflict: null });
  });
});

describe("useCancelReservation", () => {
  it("resolves as soon as the cancel succeeds and revalidates without waiting (T4 review fix S3)", async() => {
    let release: () => void = () => undefined;
    let mineReads = 0;

    server.use(
      http.post(apiUrl("/api/reservations/r1/cancel"), () => HttpResponse.json(envelope(null))),
      http.get(apiUrl("/api/reservations/mine"), async() => {
        mineReads += 1;

        if (mineReads > 1) {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        }

        return HttpResponse.json(envelope([]));
      }),
    );

    const { result } = renderLabHook(() => ({ cancel: useCancelReservation(), mine: useMyReservations() }));

    await waitFor(() => expect(result.current.mine.data).toEqual([]));

    const outcome = await act(() => result.current.cancel.cancel("r1"));

    expect(outcome).toEqual({ kind: "cancelled" });
    expect(result.current.cancel.isCancelling).toBe(false);
    await waitFor(() => expect(mineReads).toBe(2));

    act(() => release());
  });
});
