/*
* Funcionalidad: Lab connection FSM tests
* Descripción: Every transition of the derived connection FSM of the Conexión tab (W7, Bloque 1; FLUJOS_JULIO b.4):
*   SIN_RESERVA (free, unread, someone else's reservation), RESERVANDO (booking or releasing), RESERVADO, CONECTANDO
*   (socket down, control read or take in flight, join rejected right after reserving), CONECTADO (operator or
*   observer: a group member never needs the control), ERROR (failed booking or release, a join rejected outside the
*   retry window or for another reason), DESCONECTADO (reservation kept), the loss of the reservation from any state and
*   the guards of the July buttons. Depends on vitest and the FSM.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  canReleaseReservation,
  connectionActions,
  deriveConnectionState,
  hasReservationAccess,
  IDLE_INTENT,
  isTransientJoinRejection,
  JOIN_RETRY_WINDOW_MS,
  takesControl,
} from "./connection-fsm";
import type {
  ConnectionControl,
  ConnectionError,
  ConnectionIntent,
  ConnectionRelation,
  ConnectionReservation,
  ConnectionRoom,
  LabConnectionState,
} from "./connection-fsm";

const RESERVED_AT = 1_000_000;

const own = (relation: ConnectionRelation = "holder", canControl = relation !== "group_member"): ConnectionReservation => ({
  reservationId: "r1",
  relation,
  canControl,
});
const others: ConnectionReservation = { reservationId: "r9", relation: "none", canControl: false };
const free: ConnectionReservation = { reservationId: null, relation: "none", canControl: false };

const LOADED: ConnectionControl = { state: { isOperator: false }, pending: false };
const OPERATING: ConnectionControl = { state: { isOperator: true }, pending: false };
const ONLINE: ConnectionRoom = { socketOnline: true, rejectedReason: null, rejectedAt: null };

const connectIntent = (reservedAt: number | null = null): ConnectionIntent => ({ kind: "connect", reservedAt });
const rejected = (reason: string, at: number): ConnectionRoom => ({ socketOnline: true, rejectedReason: reason, rejectedAt: at });
const reserveError: ConnectionError = { source: "reserve", message: "El ventilador ya está reservado en esa franja." };

type Case = {
  name: string
  reservation: ConnectionReservation
  control?: ConnectionControl
  room?: ConnectionRoom
  intent?: ConnectionIntent
  error?: ConnectionError
  expected: LabConnectionState
};

const CASES: Case[] = [
  // SIN_RESERVA
  { name: "unread reservation → SIN_RESERVA", reservation: null, expected: "NO_RESERVATION" },
  { name: "free ventilator → SIN_RESERVA", reservation: free, expected: "NO_RESERVATION" },
  { name: "someone else's reservation → SIN_RESERVA (\"Reservado por …\")", reservation: others, expected: "NO_RESERVATION" },
  { name: "someone else's reservation ignores a connect intent", reservation: others, intent: connectIntent(), expected: "NO_RESERVATION" },
  // SIN_RESERVA → RESERVANDO → RESERVADO | ERROR
  { name: "booking in flight → RESERVANDO", reservation: free, intent: { kind: "reserving" }, expected: "RESERVING" },
  { name: "booked and read → RESERVADO", reservation: own(), intent: { kind: "reserved", at: RESERVED_AT }, expected: "RESERVED" },
  { name: "booking failed → ERROR", reservation: free, error: reserveError, expected: "ERROR" },
  { name: "own reservation found on load → RESERVADO", reservation: own(), expected: "RESERVED" },
  { name: "group reservation for a member → RESERVADO", reservation: own("group_member"), expected: "RESERVED" },
  // RESERVADO → CONECTANDO → CONECTADO
  { name: "connecting while the socket is down → CONECTANDO", reservation: own(), control: LOADED, room: { ...ONLINE, socketOnline: false }, intent: connectIntent(), expected: "CONNECTING" },
  { name: "holder before the control is read → CONECTANDO", reservation: own(), control: { state: null, pending: false }, room: ONLINE, intent: connectIntent(), expected: "CONNECTING" },
  { name: "holder while the take is in flight → CONECTANDO", reservation: own(), control: { state: { isOperator: false }, pending: true }, room: ONLINE, intent: connectIntent(), expected: "CONNECTING" },
  { name: "holder operating → CONECTADO", reservation: own(), control: OPERATING, room: ONLINE, intent: connectIntent(), expected: "CONNECTED" },
  { name: "holder after a 423 (someone else operates) → CONECTADO as observer", reservation: own(), control: LOADED, room: ONLINE, intent: connectIntent(), expected: "CONNECTED" },
  { name: "group leader operating → CONECTADO", reservation: own("group_leader"), control: OPERATING, room: ONLINE, intent: connectIntent(), expected: "CONNECTED" },
  { name: "group member → CONECTADO as observer without waiting for the control", reservation: own("group_member"), control: { state: null, pending: false }, room: ONLINE, intent: connectIntent(), expected: "CONNECTED" },
  { name: "staff over someone else's reservation → CONECTADO as observer", reservation: { reservationId: "r9", relation: "none", canControl: true }, control: { state: null, pending: false }, room: ONLINE, intent: connectIntent(), expected: "CONNECTED" },
  // Join race right after reserving
  { name: "join rejected (no_active_reservation) within the window of reserving → CONECTANDO", reservation: own(), control: OPERATING, room: rejected("no_active_reservation", RESERVED_AT + 500), intent: connectIntent(RESERVED_AT), expected: "CONNECTING" },
  { name: "join rejected on the window edge → still CONECTANDO", reservation: own(), control: OPERATING, room: rejected("no_active_reservation", RESERVED_AT + JOIN_RETRY_WINDOW_MS), intent: connectIntent(RESERVED_AT), expected: "CONNECTING" },
  { name: "join rejected after the window → ERROR", reservation: own(), control: OPERATING, room: rejected("no_active_reservation", RESERVED_AT + JOIN_RETRY_WINDOW_MS + 1), intent: connectIntent(RESERVED_AT), expected: "ERROR" },
  { name: "join rejected without a recent booking → ERROR", reservation: own(), control: OPERATING, room: rejected("no_active_reservation", RESERVED_AT), intent: connectIntent(null), expected: "ERROR" },
  { name: "join rejected for another reason → ERROR", reservation: own(), control: OPERATING, room: rejected("not_reservation_holder", RESERVED_AT + 10), intent: connectIntent(RESERVED_AT), expected: "ERROR" },
  // CONECTADO → DESCONECTADO (reservation kept) → CONECTANDO again
  { name: "disconnected with the reservation kept → DESCONECTADO", reservation: own(), control: OPERATING, room: ONLINE, intent: { kind: "disconnected" }, expected: "DISCONNECTED" },
  { name: "disconnected and the reservation ended meanwhile → SIN_RESERVA", reservation: free, intent: { kind: "disconnected" }, expected: "NO_RESERVATION" },
  { name: "reconnecting from DESCONECTADO → CONECTANDO", reservation: own(), control: { state: null, pending: false }, room: ONLINE, intent: connectIntent(), expected: "CONNECTING" },
  // Liberar
  { name: "release in flight → RESERVANDO", reservation: own(), intent: { kind: "releasing", reservationId: "r1", done: false }, expected: "RESERVING" },
  { name: "released, until the read drops it → RESERVANDO", reservation: own(), intent: { kind: "releasing", reservationId: "r1", done: true }, expected: "RESERVING" },
  { name: "released and read → SIN_RESERVA", reservation: free, intent: IDLE_INTENT, expected: "NO_RESERVATION" },
  { name: "release failed with the reservation kept → ERROR", reservation: own(), error: { source: "release", message: "No se pudo liberar." }, expected: "ERROR" },
  // Reservation lost (expired, cancelled by someone else, preempted) from any connected state
  { name: "reservation lost while CONECTADO → SIN_RESERVA", reservation: free, control: OPERATING, room: ONLINE, intent: connectIntent(), expected: "NO_RESERVATION" },
  { name: "reservation taken over by someone else while CONECTANDO → SIN_RESERVA", reservation: others, control: LOADED, room: ONLINE, intent: connectIntent(), expected: "NO_RESERVATION" },
];

describe("deriveConnectionState", () => {
  it.each(CASES)("$name", ({ reservation, control = LOADED, room = ONLINE, intent = IDLE_INTENT, error = null, expected }) => {
    expect(deriveConnectionState(reservation, control, room, intent, error)).toBe(expected);
  });
});

describe("relation rules", () => {
  it("only the holder user and the group leader take the control (S3b); members and creators observe", () => {
    expect(takesControl(own("holder"))).toBe(true);
    expect(takesControl(own("group_leader"))).toBe(true);
    expect(takesControl(own("group_member"))).toBe(false);
    expect(takesControl(own("creator"))).toBe(false);
    expect(takesControl(others)).toBe(false);
  });

  it("gives access to own and group reservations and to staff over anyone's, never to a student over someone else's", () => {
    expect(hasReservationAccess(own("group_member"))).toBe(true);
    expect(hasReservationAccess(others)).toBe(false);
    expect(hasReservationAccess({ ...others, canControl: true })).toBe(true);
    expect(hasReservationAccess(free)).toBe(false);
    expect(hasReservationAccess(null)).toBe(false);
  });

  it("lets the holder, the group leader and the creator release it, never a member", () => {
    expect(canReleaseReservation(own("holder"))).toBe(true);
    expect(canReleaseReservation(own("group_leader"))).toBe(true);
    expect(canReleaseReservation(own("creator"))).toBe(true);
    expect(canReleaseReservation(own("group_member"))).toBe(false);
    expect(canReleaseReservation({ ...others, canControl: true })).toBe(false);
  });

  it("treats only a no_active_reservation rejection of a connect right after reserving as transient", () => {
    expect(isTransientJoinRejection(rejected("no_active_reservation", RESERVED_AT + 100), connectIntent(RESERVED_AT))).toBe(true);
    expect(isTransientJoinRejection(rejected("no_active_reservation", RESERVED_AT + 100), { kind: "disconnected" })).toBe(false);
    expect(isTransientJoinRejection(ONLINE, connectIntent(RESERVED_AT))).toBe(false);
  });
});

describe("connectionActions (July guards)", () => {
  const student = (reservation: ConnectionReservation) => ({ reservation, isStaff: false });

  it("SIN_RESERVA: Reservar only while nobody else holds it (staff may displace)", () => {
    expect(connectionActions("NO_RESERVATION", student(free))).toEqual({ reserve: true, release: false, connect: false, disconnect: false });
    expect(connectionActions("NO_RESERVATION", student(others)).reserve).toBe(false);
    expect(connectionActions("NO_RESERVATION", { reservation: others, isStaff: true }).reserve).toBe(true);
  });

  it("RESERVANDO and CONECTANDO block Reservar, Conectar and Liberar", () => {
    expect(connectionActions("RESERVING", student(free))).toEqual({ reserve: false, release: false, connect: false, disconnect: false });
    expect(connectionActions("CONNECTING", student(own()))).toEqual({ reserve: false, release: false, connect: false, disconnect: true });
  });

  it("RESERVADO: Conectar and Liberar; no second reservation", () => {
    expect(connectionActions("RESERVED", student(own()))).toEqual({ reserve: false, release: true, connect: true, disconnect: false });
    expect(connectionActions("RESERVED", student(own("group_member")))).toEqual({ reserve: false, release: false, connect: true, disconnect: false });
  });

  it("CONECTADO: Desconectar and Liberar", () => {
    expect(connectionActions("CONNECTED", student(own()))).toEqual({ reserve: false, release: true, connect: false, disconnect: true });
  });

  it("DESCONECTADO: Conectar again and Liberar (the reservation is kept)", () => {
    expect(connectionActions("DISCONNECTED", student(own()))).toEqual({ reserve: false, release: true, connect: true, disconnect: false });
  });

  it("ERROR: Reservar after a failed booking; Conectar and Liberar while the reservation is kept", () => {
    expect(connectionActions("ERROR", student(free))).toEqual({ reserve: true, release: false, connect: false, disconnect: false });
    expect(connectionActions("ERROR", student(own()))).toEqual({ reserve: false, release: true, connect: true, disconnect: false });
  });
});
