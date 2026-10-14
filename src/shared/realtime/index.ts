/*
* Funcionalidad: Realtime public API
* Descripción: Public surface of the realtime module: RealtimeProvider (authenticated Socket.io connection bound to the backend session), useSocket, useSocketEvent and the contract types from asyncapi.yaml. v1.1 (T0 learning): the SSE helper for the text/event-stream routes (AI tutor, simulation assistance) lives in @shared/api-client (postEventStream/runEventStream) because it is a POST request that shares the bearer token and refresh logic of the HTTP client, not a push channel.
* Versión: 1.1
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
  RealtimeClientEvents,
  RealtimeEventHandler,
  RealtimeEventMap,
  RealtimeEventName,
  RealtimeServerEvents,
  RealtimeSocket,
  RealtimeStatus,
} from "./realtime.entity";
export { useSocket } from "./use-socket";
export { useSocketEvent } from "./use-socket-event";
