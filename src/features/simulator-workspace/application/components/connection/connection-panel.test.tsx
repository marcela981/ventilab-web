/*
* Funcionalidad: Connection panel tests
* Descripción: The Conexión tab of /simulador (W7, Bloque 1) with the live LabConnectionProvider against msw and a fake
*   socket: the two July cards; "Reservar ahora" (immediate booking with 30 min by default, "Para mi grupo" for a
*   leader, RESERVANDO → RESERVADO); someone else's reservation (the backend label for a student, name and code for
*   staff); Conectar as holder (join + POST control → "Controlas el equipo"), after a 423 (observer "Opera: <nombre>",
*   no error) and as a group member (observer, never a control request); the join rejected right after reserving
*   (stays CONECTANDO and joins again on `ventilator:availability`) and outside that window (ERROR); Desconectar
*   (DELETE control, reservation kept) versus Liberar (cancel); the blocking modal when the reservation is displaced or
*   ends, then SIN_RESERVA; and the staff preemption ("Desplazar y reservar" resends with confirmPreempt). Depends on
*   vitest, Testing Library, msw, SWR, the shared session and realtime contexts and the workspace connection.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import type { RealtimeEventMap, RealtimeEventName, RealtimeSocket } from "@shared/realtime/realtime.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { Permission, Role } from "@shared/session/session.entity";
import { LabConnectionProvider } from "../lab-connection-provider";
import { ConnectionPanel } from "./connection-panel";

const url = (path: string): string => `${BACKEND_ORIGIN}${path}`;
const envelopeOf = (data: unknown) => ({ success: true, message: null, data, code: null, timestamp: "", traceId: "t", pagination: null });
// Base handler: unmounting while operating releases the control with a keepalive DELETE (leaving the page).
const server = setupServer(http.delete(url("/api/ventilator/control"), () => HttpResponse.json(envelopeOf(null))));
const envelope = envelopeOf;
const failure = (code: string, status: number, data: unknown = null) => HttpResponse.json(
  { success: false, message: code, data, code, timestamp: "", traceId: "t", pagination: null },
  { status },
);

const IN_ONE_HOUR = () => new Date(Date.now() + 60 * 60_000).toISOString();

function detail(id: string, overrides: Record<string, unknown> = {}) {
  return {
    visibility: "full",
    id,
    holderType: "USER",
    startsAt: new Date(Date.now() - 60_000).toISOString(),
    endsAt: IN_ONE_HOUR(),
    status: "SCHEDULED",
    purpose: null,
    holderRole: "STUDENT",
    holder: { id: "student-1", code: null, name: "Ana Gómez", identifier: "ana@ventylab.demo", role: "STUDENT" },
    group: null,
    createdBy: null,
    preemptedReason: null,
    ...overrides,
  };
}

type Current = { reservation: unknown, canControl: boolean, relation: string };

const FREE: Current = { reservation: null, canControl: false, relation: "none" };
const OWN: Current = { reservation: detail("r1"), canControl: true, relation: "holder" };

let current: Current = FREE;
const requests: string[] = [];
let createdBodies: unknown[] = [];

function control(overrides: Record<string, unknown> = {}) {
  return {
    isOperator: false,
    canTake: true,
    canTakeover: false,
    occupied: true,
    reservationId: "r1",
    operatorUserId: null,
    operatorName: null,
    operatorLabelKey: null,
    ...overrides,
  };
}

let controlState = control();

function useDefaultHandlers() {
  server.use(
    http.get(url("/api/reservations/current"), () => HttpResponse.json(envelope(current))),
    http.get(url("/api/reservations/mine"), () => HttpResponse.json(envelope([]))),
    http.get(url("/api/reservations"), () => HttpResponse.json(envelope([]))),
    http.get(url("/api/ventilator/control"), () => HttpResponse.json(envelope(controlState))),
    http.post(url("/api/ventilator/control"), () => {
      requests.push("take");
      controlState = control({ isOperator: true, canTake: false, operatorUserId: "student-1", operatorName: "Ana Gómez" });

      return HttpResponse.json(envelope(null));
    }),
    http.delete(url("/api/ventilator/control"), () => {
      requests.push("release-control");
      controlState = control();

      return HttpResponse.json(envelope(null));
    }),
    http.post(url("/api/reservations/:id/cancel"), ({ params }) => {
      requests.push(`cancel ${String(params.id)}`);
      current = FREE;

      return HttpResponse.json(envelope(null));
    }),
    http.post(url("/api/reservations"), async({ request }) => {
      const body = await request.json();

      createdBodies.push(body);
      current = OWN;

      return HttpResponse.json(envelope(detail("r1")), { status: 201 });
    }),
  );
}

type Listener = (payload: never) => void;

function createFakeSocket() {
  const listeners = new Map<string, Set<Listener>>();
  const emitted: string[] = [];
  const socket = {
    on: (event: string, listener: Listener) => {
      const set = listeners.get(event) ?? new Set<Listener>();

      set.add(listener);
      listeners.set(event, set);
    },
    off: (event: string, listener: Listener) => {
      listeners.get(event)?.delete(listener);
    },
    emit: (event: string) => {
      emitted.push(event);
    },
  };

  return {
    socket: socket as unknown as RealtimeSocket,
    emitted,
    dispatch<E extends RealtimeEventName>(event: E, payload: RealtimeEventMap[E]) {
      act(() => {
        for (const listener of listeners.get(event) ?? []) {
          (listener as (value: typeof payload) => void)(payload);
        }
      });
    },
  };
}

type FakeSocket = ReturnType<typeof createFakeSocket>;

function sessionValue(role: Role, permissions: readonly Permission[]): SessionContextValue {
  const user = { id: `${role.toLowerCase()}-1`, email: "user@ventylab.demo", name: "Usuario", image: null, role };

  return {
    status: "authenticated",
    user,
    role,
    permissions,
    error: null,
    hasRole: (...roles) => roles.includes(role),
    hasPermission: (permission) => permissions.includes(permission),
    establishSession: () => Promise.resolve(user),
    signOut: () => Promise.resolve(),
    reloadSession: () => Promise.resolve(user),
    handleRoleChanged: () => Promise.resolve(false),
  };
}

function renderPanel({ role = "STUDENT", permissions = [] }: { role?: Role, permissions?: readonly Permission[] } = {}): FakeSocket {
  const fake = createFakeSocket();
  const session = sessionValue(role, permissions);

  function Wrapper({ children }: { children: ReactNode }) {
    const realtime = useMemo(() => ({ socket: fake.socket, status: "authenticated" as const }), []);

    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <SessionContext.Provider value={session}>
          <RealtimeContext.Provider value={realtime}>{children}</RealtimeContext.Provider>
        </SessionContext.Provider>
      </SWRConfig>
    );
  }

  render(<LabConnectionProvider><ConnectionPanel /></LabConnectionProvider>, { wrapper: Wrapper });

  return fake;
}

const reservationStatus = () => screen.getByTestId("connection-reservation-status");
// `hidden`: an open modal hides the rest of the page from the accessibility tree.
const stateLabel = () => within(screen.getByRole("region", { name: "2. Conexión con el ventilador", hidden: true })).getByText(
  /^(Sin reserva|Reservando…|Reservado|Conectando…|Conectado|Error|Desconectado)$/,
);
const button = (name: string) => screen.getByRole("button", { name });
const joins = (fake: FakeSocket) => fake.emitted.filter((event) => event === "ventilator:join").length;

async function expectState(label: string) {
  await waitFor(() => expect(stateLabel()).toHaveTextContent(label));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  current = FREE;
  controlState = control();
  requests.length = 0;
  createdBodies = [];
  useDefaultHandlers();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("ConnectionPanel", { timeout: 20_000 }, () => {
  it("shows the two July cards: free ventilator, Reservar ahora enabled, Conectar disabled and the calendar link", async() => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "1. Reserva del ventilador" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2. Conexión con el ventilador" })).toBeInTheDocument();
    await waitFor(() => expect(button("Reservar ahora")).toBeEnabled());
    expect(reservationStatus()).toHaveTextContent("Disponible");
    expect(stateLabel()).toHaveTextContent("Sin reserva");
    expect(button("Conectar")).toBeDisabled();
    expect(screen.getByRole("link", { name: "Ver calendario" })).toHaveAttribute("href", "/lab/reservations");
    expect(screen.queryByRole("button", { name: "Liberar" })).not.toBeInTheDocument();
    expect(screen.getByText("En línea")).toBeInTheDocument();
  });

  it("books now for 30 minutes by default and becomes RESERVADO with the remaining time", async() => {
    renderPanel();

    await waitFor(() => expect(button("Reservar ahora")).toBeEnabled());
    fireEvent.click(button("Reservar ahora"));
    const dialog = await screen.findByRole("dialog", { name: "Reservar ahora" });

    expect(within(dialog).getByText("Desde ahora · 30 min")).toBeInTheDocument();
    expect(within(dialog).getByText(/Recuerda liberar la reserva cuando termines/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Propósito (opcional)"), { target: { value: " Práctica " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar ahora" }));

    await expectState("Reservado");
    expect(createdBodies).toEqual([{ holderType: "USER", durationMinutes: 30, purpose: "Práctica" }]);
    expect(screen.queryByRole("dialog", { name: "Reservar ahora" })).not.toBeInTheDocument();
    expect(reservationStatus()).toHaveTextContent(/^Activa · (59|60) min restantes$/);
    expect(screen.getByText("Ventilador reservado. Ya puedes conectar.")).toBeInTheDocument();
    expect(button("Conectar")).toBeEnabled();
    expect(button("Liberar")).toBeEnabled();
    expect(button("Reservar ahora")).toBeDisabled();
  });

  it("offers \"Para mi grupo\" to a group leader and books the group", async() => {
    server.use(http.get(url("/api/groups/mine"), () => HttpResponse.json(envelope({
      studentGroup: null,
      memberships: [{ groupId: "g1", groupName: "Grupo B", groupType: "STUDENT", isActive: true, memberRole: "LEADER" }],
    }))));
    renderPanel({ permissions: ["groups:read_own"] });

    await waitFor(() => expect(button("Reservar ahora")).toBeEnabled());
    fireEvent.click(button("Reservar ahora"));
    const dialog = await screen.findByRole("dialog", { name: "Reservar ahora" });

    fireEvent.click(await within(dialog).findByRole("radio", { name: "Para mi grupo" }));
    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "Grupo" }));
    fireEvent.click(await screen.findByRole("option", { name: "Grupo B" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar ahora" }));

    await waitFor(() => expect(createdBodies).toEqual([{ holderType: "GROUP", groupId: "g1", durationMinutes: 30 }]));
  });

  it("shows a failed booking as ERROR with the backend message and keeps Reservar ahora available", async() => {
    server.use(http.post(url("/api/reservations"), () => failure("reservations.limit_reached", 409)));
    renderPanel();

    await waitFor(() => expect(button("Reservar ahora")).toBeEnabled());
    fireEvent.click(button("Reservar ahora"));
    const dialog = await screen.findByRole("dialog", { name: "Reservar ahora" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Reservar ahora" }));
    await expectState("Error");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(button("Reservar ahora")).toBeEnabled();
  });

  it("someone else's reservation: SIN_RESERVA with the backend label for a student, Reservar disabled", async() => {
    current = {
      reservation: { visibility: "limited", id: "r9", startsAt: "a", endsAt: IN_ONE_HOUR(), status: "SCHEDULED", label: "Reservado por un estudiante del grupo B", labelKey: "reservations.labels.group_student" },
      canControl: false,
      relation: "none",
    };
    renderPanel();

    await waitFor(() => expect(reservationStatus()).toHaveTextContent("Reservado por un estudiante del grupo B"));
    expect(stateLabel()).toHaveTextContent("Sin reserva");
    expect(button("Reservar ahora")).toBeDisabled();
    expect(button("Conectar")).toBeDisabled();
  });

  it("someone else's reservation seen by staff: the holder name and student code", async() => {
    current = {
      reservation: detail("r9", { holder: { id: "s9", code: "2024123456", name: "Luis Pérez", identifier: "luis@ventylab.demo", role: "STUDENT" } }),
      canControl: true,
      relation: "none",
    };
    renderPanel({ role: "TEACHER" });

    await waitFor(() => expect(reservationStatus()).toHaveTextContent("Reservado por Luis Pérez (2024123456)"));
    expect(button("Reservar ahora")).toBeEnabled();
  });

  it("Conectar as holder joins the room, takes the control and shows \"Controlas el equipo\"", async() => {
    current = OWN;
    const fake = renderPanel();

    await waitFor(() => expect(button("Conectar")).toBeEnabled());
    fireEvent.click(button("Conectar"));

    await expectState("Conectado");
    expect(joins(fake)).toBe(1);
    expect(requests).toEqual(["take"]);
    await waitFor(() => expect(screen.getByTestId("connection-operator")).toHaveTextContent("Controlas el equipo"));
    expect(screen.getByText("Conectado al ventilador.")).toBeInTheDocument();
    expect(button("Desconectar")).toBeEnabled();
  });

  it("a 423 on taking the control leaves an observer with \"Opera: <nombre>\" and no error", async() => {
    current = OWN;
    controlState = control({ canTake: false, operatorUserId: "teacher-9", operatorName: null, operatorLabelKey: "ventilator-commands.operator_labels.teacher" });
    server.use(http.post(url("/api/ventilator/control"), () => {
      requests.push("take");

      return failure("ventilator-commands.control_locked", 423);
    }));
    renderPanel();

    await waitFor(() => expect(button("Conectar")).toBeEnabled());
    fireEvent.click(button("Conectar"));

    await expectState("Conectado");
    await waitFor(() => expect(screen.getByTestId("connection-operator")).toHaveTextContent("Opera: Un docente"));
    expect(requests).toEqual(["take"]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("a group member connects as observer and never asks for the control", async() => {
    current = { reservation: detail("r1", { holderType: "GROUP", group: { id: "g1", name: "Grupo B" } }), canControl: false, relation: "group_member" };
    controlState = control({ canTake: false, operatorUserId: "student-7", operatorName: "Marta Ruiz" });
    const fake = renderPanel();

    await waitFor(() => expect(button("Conectar")).toBeEnabled());
    expect(screen.queryByRole("button", { name: "Liberar" })).not.toBeInTheDocument();
    fireEvent.click(button("Conectar"));

    await expectState("Conectado");
    expect(joins(fake)).toBe(1);
    await waitFor(() => expect(screen.getByTestId("connection-operator")).toHaveTextContent("Opera: Marta Ruiz"));
    expect(requests).toEqual([]);
  });

  it("a join rejected right after reserving stays CONECTANDO and joins again on ventilator:availability", async() => {
    const fake = renderPanel();

    await waitFor(() => expect(button("Reservar ahora")).toBeEnabled());
    fireEvent.click(button("Reservar ahora"));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Reservar ahora" })).getByRole("button", { name: "Reservar ahora" }));
    await expectState("Reservado");
    fireEvent.click(button("Conectar"));
    await waitFor(() => expect(joins(fake)).toBe(1));

    fake.dispatch("ventilator:join-rejected", { reason: "no_active_reservation" });
    await expectState("Conectando…");
    expect(screen.queryByText(/No se pudo entrar a la sala/)).not.toBeInTheDocument();

    fake.dispatch("ventilator:availability", { occupied: true });
    await waitFor(() => expect(joins(fake)).toBe(2));
    await expectState("Conectado");
  });

  it("a join rejected without a recent booking is an ERROR with the July-style message", async() => {
    current = OWN;
    const fake = renderPanel();

    await waitFor(() => expect(button("Conectar")).toBeEnabled());
    fireEvent.click(button("Conectar"));
    await waitFor(() => expect(joins(fake)).toBe(1));
    fake.dispatch("ventilator:join-rejected", { reason: "no_active_reservation" });

    await expectState("Error");
    expect(screen.getByRole("status")).toHaveTextContent("No se pudo entrar a la sala del ventilador. No hay una reserva activa del ventilador en este momento.");
    expect(button("Conectar")).toBeEnabled();
  });

  it("Desconectar releases the control and keeps the reservation (DESCONECTADO); Liberar cancels it (SIN_RESERVA)", async() => {
    current = OWN;
    renderPanel();

    await waitFor(() => expect(button("Conectar")).toBeEnabled());
    fireEvent.click(button("Conectar"));
    await waitFor(() => expect(screen.getByTestId("connection-operator")).toHaveTextContent("Controlas el equipo"));

    fireEvent.click(button("Desconectar"));
    await expectState("Desconectado");
    await waitFor(() => expect(requests).toEqual(["take", "release-control"]));
    expect(reservationStatus()).toHaveTextContent(/^Activa · /);
    expect(button("Conectar")).toBeEnabled();

    fireEvent.click(button("Liberar"));
    await expectState("Sin reserva");
    expect(requests).toEqual(["take", "release-control", "cancel r1"]);
    expect(reservationStatus()).toHaveTextContent("Disponible");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("a displaced reservation opens the blocking modal and then falls to SIN_RESERVA", async() => {
    current = OWN;
    const fake = renderPanel();

    await waitFor(() => expect(button("Conectar")).toBeEnabled());
    fireEvent.click(button("Conectar"));
    await expectState("Conectado");

    current = { reservation: detail("r2", { holderRole: "TEACHER" }), canControl: false, relation: "none" };
    fake.dispatch("reservation:preempted", {
      reservationId: "r1",
      holderType: "USER",
      groupId: null,
      startsAt: "a",
      endsAt: "b",
      reason: "Clase práctica",
      wasActive: true,
    });

    const modal = await screen.findByRole("dialog", { name: "La reserva fue desplazada" });

    expect(within(modal).getByText("Motivo: Clase práctica")).toBeInTheDocument();
    expect(stateLabel()).toHaveTextContent("Sin reserva");
    fireEvent.click(within(modal).getByRole("button", { name: "Entendido" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await expectState("Sin reserva");
  });

  it("a reservation that ends (expired or cancelled elsewhere) opens the modal, never after an own release", async() => {
    current = OWN;
    const fake = renderPanel();

    await expectState("Reservado");
    current = FREE;
    fake.dispatch("ventilator:availability", { occupied: false });

    const modal = await screen.findByRole("dialog", { name: "La reserva terminó" });

    expect(within(modal).getByText("El ventilador quedó sin reserva activa.")).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole("button", { name: "Entendido" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(stateLabel()).toHaveTextContent("Sin reserva");
  });

  it("staff over a preemptable conflict confirms \"Desplazar y reservar\" and resends with confirmPreempt", async() => {
    current = { reservation: detail("r9"), canControl: true, relation: "none" };
    server.use(http.post(url("/api/reservations"), async({ request }) => {
      const body = await request.json() as Record<string, unknown>;

      createdBodies.push(body);

      if (!body.confirmPreempt) {
        return failure("reservations.conflict_preemptable", 409, {
          preemptable: true,
          conflicts: [{ reservationId: "r9", holderType: "USER", holderRole: "STUDENT", holderName: "Ana Gómez", startsAt: "2026-10-16T14:00:00.000Z", endsAt: "2026-10-16T15:00:00.000Z" }],
        });
      }

      current = OWN;

      return HttpResponse.json(envelope(detail("r1")), { status: 201 });
    }));
    renderPanel({ role: "TEACHER" });

    await waitFor(() => expect(button("Reservar ahora")).toBeEnabled());
    fireEvent.click(button("Reservar ahora"));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Reservar ahora" })).getByRole("button", { name: "Reservar ahora" }));

    const confirm = await screen.findByRole("alertdialog", { name: "Desplazar reservas" });

    expect(within(confirm).getByText(/desde ahora \(30 min\)/)).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole("button", { name: "Desplazar y reservar" }));

    await expectState("Reservado");
    expect(createdBodies).toEqual([
      { holderType: "USER", durationMinutes: 30 },
      { holderType: "USER", durationMinutes: 30, confirmPreempt: true },
    ]);
  });
});
