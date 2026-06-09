/*
 * Funcionalidad: useVentilatorData (WebSocket)
 * Descripción: Hook de telemetría del ventilador. Es un selector delgado sobre
 *   ventilatorStreamStore: TODOS los consumidores comparten un único buffer, una
 *   única suscripción al socket/emisor y un único bucle de flush en rAF (~12 fps).
 *   Sustituye el diseño previo donde cada instancia mantenía su propio buffer y
 *   su propio ciclo de re-render, multiplicando la carga.
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { useEffect, useSyncExternalStore } from 'react';

import { useSocket } from '@/shared/hooks/useSocket';
import type { UseVentilatorDataReturn } from '@/contracts/simulator.contracts';
import {
  subscribe,
  getSnapshot,
  bindSocket,
  setConnectionState,
} from '@/features/simulador/conexion/websocket/stream/ventilatorStreamStore';

/**
 * Selector principal: devuelve el snapshot completo del stream. Se re-renderiza
 * a la cadencia de flush del store (~12 fps) sólo cuando hay cambios.
 */
export function useVentilatorData(): UseVentilatorDataReturn {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Selector ligero: sólo `isStale`. Re-renderiza únicamente cuando ese valor
 * cambia (no en cada flush), apto para banners/indicadores de bajo refresco.
 */
export function useVentilatorStale(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().isStale,
    () => getSnapshot().isStale,
  );
}

/**
 * Enlaza el socket del contexto al store (una sola vez en el árbol). Debe
 * montarse alto en la jerarquía del simulador (p. ej. el wrapper del dashboard).
 */
export function useBindVentilatorStream(): void {
  const { socket, isConnected } = useSocket();

  useEffect(() => bindSocket(socket), [socket]);

  useEffect(() => {
    setConnectionState(isConnected);
  }, [isConnected]);
}
