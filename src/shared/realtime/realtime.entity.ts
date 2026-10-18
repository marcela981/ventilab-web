/*
* Funcionalidad: Realtime contract types
* Descripción: Socket.io event names and payloads used by new code, taken from ventylab-server/openapi/asyncapi.yaml (connection events authenticated/auth_error, the client authenticate message and the user-room events user:role-changed, notification:new, grade:published, achievement:unlocked). v1.1 (S0 evaluations): the group-room event evaluation:activated (an evaluation was assigned and opened for the group). v1.2 (T0 ventilator-lab): the ventilator events (telemetry batch, alarm, availability, join-rejected, device connected/disconnected with reason, control-changed, command-status), reservation:preempted (user and group rooms) and the client messages ventilator:join and ventilator:heartbeat (payload ignored by the backend), from the asyncapi messages and the backend payload interfaces. Payload schemas that live in openapi.json come from the generated api-client types. Type-only module; depends on the session entity and the generated schema. v1.3 (O4b admin-console): system:status-changed (role rooms ADMIN and TEACHER) with the global state, previous state, changed components and checkedAt, typed from the SystemStatusDTO enums of the generated schema (payload from ventylab-server system-status.service.ts; not in asyncapi). v1.4 (closure B1): notification:new is the per-type discriminated union of the generated notification variants (NotificationNewEvent), so `type` narrows `data`.
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { Socket } from "socket.io-client";
import type { components } from "@shared/api-client/generated/schema";
import type { RoleChangedEvent } from "@shared/session/session.entity";

export type GradePublishedEvent = {
  attemptId: string
  evaluationId: string
  score: number
  maxScore: number
  grade: number
  passed: boolean
  publishedAt: string
};

export type EvaluationActivatedEvent = {
  evaluationId: string
  assignmentId: string
  title: string
  type: string
  startsAt: string
  endsAt: string
};

/** One device frame as relayed by the backend (asyncapi `TelemetryFrame`); every optional field is device-reported. */
export type VentilatorTelemetryFrame = {
  serverTs: number
  deviceTs?: number
  seq?: number
  pressure: number
  flow: number
  volume: number
  mode?: string
  settings?: Record<string, number>
  alarms?: string[]
  pco2?: number
  spo2?: number
  deviceId: string
};

export type VentilatorTelemetryEvent = {
  frames: VentilatorTelemetryFrame[]
  /** Server time of the flush, epoch milliseconds. */
  serverTs: number
};

export type VentilatorAvailabilityEvent = {
  occupied: boolean
  startsAt?: string
  endsAt?: string
};

export type VentilatorJoinRejectedReason = "no_active_reservation" | "not_reservation_holder";

export type VentilatorJoinRejectedEvent = {
  reason: VentilatorJoinRejectedReason
};

export type VentilatorDisconnectedReason = "device_stale" | "broker_disconnected";

export type VentilatorConnectionEvent = {
  /** Epoch milliseconds. */
  at: number
  /** Only on `ventilator:disconnected`. */
  reason?: VentilatorDisconnectedReason
};

export type VentilatorControlChangedReason =
  | "taken"
  | "takeover"
  | "released"
  | "presence_timeout"
  | "reservation_ended"
  | "reservation_preempted";

export type VentilatorControlChangedEvent = {
  reservationId: string
  operatorUserId: string | null
  reason: VentilatorControlChangedReason
};

export type VentilatorCommandStatus = "PENDING" | "SENT" | "ACKED" | "APPLIED" | "REJECTED" | "TIMEOUT";

export type VentilatorCommandStatusEvent = {
  commandId: string
  reservationId: string
  userId: string
  status: VentilatorCommandStatus
  sentAt?: string
  resolvedAt?: string
  latencyMs?: number
  reason?: string
};

export type ReservationPreemptedEvent = {
  reservationId: string
  holderType: "USER" | "GROUP"
  groupId: string | null
  startsAt: string
  endsAt: string
  reason: string | null
  wasActive: boolean
};

type SystemStatusSchema = components["schemas"]["SystemStatusDTO"];

export type SystemComponentName = keyof SystemStatusSchema["components"];

export type SystemComponentState = components["schemas"]["DatabaseStatusDTO"]["state"];

export type SystemComponentChange = {
  component: SystemComponentName
  state: SystemComponentState
  previousState: SystemComponentState
};

export type SystemStatusChangedEvent = {
  state: SystemStatusSchema["state"]
  previousState: SystemStatusSchema["state"]
  changedComponents: SystemComponentChange[]
  checkedAt: string
};

type Schemas = components["schemas"];

/** `notification:new` payload: one variant per notification type, so `type` narrows `data` (asyncapi `oneOf` + discriminator). */
export type NotificationNewEvent =
  | Schemas["ReservationPreemptedNotificationDTO"]
  | Schemas["ReservationCancelledNotificationDTO"]
  | Schemas["EvaluationActivatedNotificationDTO"]
  | Schemas["GradePublishedNotificationDTO"]
  | Schemas["FeedbackReadyNotificationDTO"]
  | Schemas["RoleChangedNotificationDTO"]
  | Schemas["VentilatorOfflineNotificationDTO"];

export type RealtimeEventMap = {
  "authenticated": { userId: string }
  "auth_error": { message: string }
  "user:role-changed": RoleChangedEvent
  "notification:new": NotificationNewEvent
  "grade:published": GradePublishedEvent
  "evaluation:activated": EvaluationActivatedEvent
  "achievement:unlocked": components["schemas"]["AchievementDTO"]
  "reservation:preempted": ReservationPreemptedEvent
  "ventilator:telemetry": VentilatorTelemetryEvent
  "ventilator:alarm": components["schemas"]["VentilatorAlarmDTO"]
  "ventilator:availability": VentilatorAvailabilityEvent
  "ventilator:join-rejected": VentilatorJoinRejectedEvent
  "ventilator:connected": VentilatorConnectionEvent
  "ventilator:disconnected": VentilatorConnectionEvent
  "ventilator:control-changed": VentilatorControlChangedEvent
  "ventilator:command-status": VentilatorCommandStatusEvent
  "system:status-changed": SystemStatusChangedEvent
};

export type RealtimeEventName = keyof RealtimeEventMap;

export type RealtimeEventHandler<E extends RealtimeEventName> = (payload: RealtimeEventMap[E]) => void;

export type RealtimeServerEvents = {
  [E in RealtimeEventName]: RealtimeEventHandler<E>
};

export type RealtimeClientEvents = {
  "authenticate": (payload: { token: string }) => void
  // The backend ignores the payload of both ventilator messages.
  "ventilator:join": () => void
  "ventilator:heartbeat": () => void
};

export type RealtimeClientEventName = keyof RealtimeClientEvents;

export type RealtimeSocket = Socket<RealtimeServerEvents, RealtimeClientEvents>;

// idle: no backend session; connecting: transport open, waiting for `authenticated`; unauthorized: gave up after auth_error.
export type RealtimeStatus = "idle" | "connecting" | "authenticated" | "disconnected" | "unauthorized";
