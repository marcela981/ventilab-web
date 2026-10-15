/*
* Funcionalidad: Realtime contract types
* Descripción: Socket.io event names and payloads used by new code, taken from ventylab-server/openapi/asyncapi.yaml (connection events authenticated/auth_error, the client authenticate message and the user-room events user:role-changed, notification:new, grade:published, achievement:unlocked). v1.1 (S0 evaluations): the group-room event evaluation:activated (an evaluation was assigned and opened for the group). Payload schemas that live in openapi.json come from the generated api-client types. Type-only module; depends on the session entity and the generated schema.
* Versión: 1.1
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

export type RealtimeEventMap = {
  "authenticated": { userId: string }
  "auth_error": { message: string }
  "user:role-changed": RoleChangedEvent
  "notification:new": components["schemas"]["NotificationDTO"]
  "grade:published": GradePublishedEvent
  "evaluation:activated": EvaluationActivatedEvent
  "achievement:unlocked": components["schemas"]["AchievementDTO"]
};

export type RealtimeEventName = keyof RealtimeEventMap;

export type RealtimeEventHandler<E extends RealtimeEventName> = (payload: RealtimeEventMap[E]) => void;

export type RealtimeServerEvents = {
  [E in RealtimeEventName]: RealtimeEventHandler<E>
};

export type RealtimeClientEvents = {
  authenticate: (payload: { token: string }) => void
};

export type RealtimeSocket = Socket<RealtimeServerEvents, RealtimeClientEvents>;

// idle: no backend session; connecting: transport open, waiting for `authenticated`; unauthorized: gave up after auth_error.
export type RealtimeStatus = "idle" | "connecting" | "authenticated" | "disconnected" | "unauthorized";
