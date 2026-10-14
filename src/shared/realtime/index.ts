/*
* Funcionalidad: Realtime public API
* Descripción: Public surface of the realtime module: RealtimeProvider (authenticated Socket.io connection bound to the backend session), useSocket, useSocketEvent and the contract types from asyncapi.yaml. No SSE helper: the only text/event-stream routes in openapi.json are the AI tutor and simulation assistance, outside the identity features and layouts (YAGNI).
* Versión: 1.0
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
