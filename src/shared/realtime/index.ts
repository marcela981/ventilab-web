/*
* Funcionalidad: Realtime public API
* Descripción: Public surface of the realtime module: RealtimeProvider (authenticated Socket.io connection bound to the backend session), useSocket, useSocketEvent and the contract types from asyncapi.yaml. v1.1 (T0 learning): the SSE helper for the text/event-stream routes (AI tutor, simulation assistance) lives in @shared/api-client (postEventStream/runEventStream) because it is a POST request that shares the bearer token and refresh logic of the HTTP client, not a push channel. v1.2 (T0 ventilator-lab): useEmitOnAuthenticated (client message re-sent on every authenticated connection) and the ventilator / reservation event types. v1.3 (O4b admin-console): the system:status-changed payload types. v1.4 (closure B1): NotificationNewEvent (per-type notification:new union).
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { RealtimeProvider } from "./realtime-provider";
export type { RealtimeProviderProps } from "./realtime-provider";
export type { RealtimeContextValue } from "./realtime-context";
export type {
  GradePublishedEvent,
  NotificationNewEvent,
  RealtimeClientEventName,
  RealtimeClientEvents,
  RealtimeEventHandler,
  RealtimeEventMap,
  RealtimeEventName,
  RealtimeServerEvents,
  RealtimeSocket,
  RealtimeStatus,
  ReservationPreemptedEvent,
  SystemComponentChange,
  SystemComponentName,
  SystemComponentState,
  SystemStatusChangedEvent,
  VentilatorAvailabilityEvent,
  VentilatorCommandStatus,
  VentilatorCommandStatusEvent,
  VentilatorConnectionEvent,
  VentilatorControlChangedEvent,
  VentilatorControlChangedReason,
  VentilatorDisconnectedReason,
  VentilatorJoinRejectedEvent,
  VentilatorJoinRejectedReason,
  VentilatorTelemetryEvent,
  VentilatorTelemetryFrame,
} from "./realtime.entity";
export { useEmitOnAuthenticated } from "./use-emit-on-authenticated";
export type { EmitOnAuthenticatedOptions } from "./use-emit-on-authenticated";
export { useSocket } from "./use-socket";
export { useSocketEvent } from "./use-socket-event";
