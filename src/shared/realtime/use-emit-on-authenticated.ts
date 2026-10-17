/*
* Funcionalidad: useEmitOnAuthenticated
* Descripción: Generic hook that sends one client message every time the shared socket becomes authenticated (first authentication and every reconnect, since the server only knows the rooms of the current connection) while `enabled` is true, and again whenever `trigger` changes (for example a new reservation id). Used for messages such as ventilator:join that must be repeated per connection; it holds no feature logic. v1.1 (generic, optional): `onEmit` is called (latest callback) right after each emit, so a consumer can tag the replies of the server with what it actually sent. Depends on useSocket and the realtime contract types.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useLayoutEffect, useRef } from "react";
import type { RealtimeClientEventName, RealtimeClientEvents } from "./realtime.entity";
import { useSocket } from "./use-socket";

// Loose emitter shape: socket.io's typed overloads do not resolve for a generic event name.
type LooseEmitter = { emit: (event: string, ...args: unknown[]) => unknown };

export type EmitOnAuthenticatedOptions<E extends RealtimeClientEventName> = {
  enabled?: boolean
  /** Any value whose change re-sends the message on the current connection. */
  trigger?: unknown
  args?: Parameters<RealtimeClientEvents[E]>
  /** Called right after each emit (the latest callback passed). */
  onEmit?: () => void
};

export function useEmitOnAuthenticated<E extends RealtimeClientEventName>(
  event: E,
  { enabled = true, trigger, args, onEmit }: EmitOnAuthenticatedOptions<E> = {},
): void {
  const { socket, status } = useSocket();
  const argsRef = useRef(args);
  const onEmitRef = useRef(onEmit);

  useLayoutEffect(() => {
    argsRef.current = args;
    onEmitRef.current = onEmit;
  });

  useEffect(() => {
    if (!socket || status !== "authenticated" || !enabled) {
      return;
    }

    (socket as unknown as LooseEmitter).emit(event, ...(argsRef.current ?? []));
    onEmitRef.current?.();
  }, [socket, status, enabled, event, trigger]);
}
