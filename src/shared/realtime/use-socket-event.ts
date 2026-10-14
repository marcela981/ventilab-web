/*
* Funcionalidad: useSocketEvent hook
* Descripción: Typed subscription to one server event of the realtime contract. The handler is kept in a ref (callers may pass inline functions without resubscribing); the listener is removed on unmount and moved to the new socket when the provider replaces it. Depends on react and useSocket.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useLayoutEffect, useRef } from "react";
import type { RealtimeEventHandler, RealtimeEventName } from "./realtime.entity";
import { useSocket } from "./use-socket";

// Loose listener shape: socket.io's typed overloads do not resolve for a generic event name.
type AnyListener = (payload: never) => void;

type LooseEmitter = {
  on: (event: string, listener: AnyListener) => unknown
  off: (event: string, listener: AnyListener) => unknown
};

export function useSocketEvent<E extends RealtimeEventName>(event: E, handler: RealtimeEventHandler<E>): void {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!socket) {
      return;
    }

    const emitter = socket as unknown as LooseEmitter;
    const listener: RealtimeEventHandler<E> = (payload) => handlerRef.current(payload);

    emitter.on(event, listener);

    return () => {
      emitter.off(event, listener);
    };
  }, [socket, event]);
}
