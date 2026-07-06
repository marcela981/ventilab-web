/*
 * Funcionalidad: useConexionVentilador
 * Descripción: Máquina de estados finita (FSM) que gobierna el ciclo de vida de la
 *   conexión al ventilador físico de la universidad (recurso único):
 *     SIN_RESERVA → RESERVANDO → RESERVADO → CONECTANDO → CONECTADO → ERROR/DESCONECTADO
 *   Reusa useRemoteVentilator (reserva vía simulatorApi.reserve/release y telemetría
 *   WebSocket); NO duplica lógica de backend ni de MQTT. El hook concentra el estado
 *   y las acciones con guardas; el render vive en componentes presentacionales (UI/).
 * Versión: 1.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { useState, useCallback, useMemo } from 'react';

import { useRemoteVentilator } from '@/features/simulador/conexion/websocket/hooks/useRemoteVentilator';
import type { VentilatorStatus } from '@/features/simulador/compartido/tipos/simulator.types';

// =============================================================================
// Estados de la FSM
// =============================================================================

export type EstadoConexion =
  | 'SIN_RESERVA'   // no hay reserva activa; el usuario puede solicitarla
  | 'RESERVANDO'    // petición de reserva en curso (mutex de recurso único)
  | 'RESERVADO'     // reserva confirmada; aún no conectado al ventilador
  | 'CONECTANDO'    // estableciendo el canal de datos con el ventilador
  | 'CONECTADO'     // recibiendo (o listo para recibir) telemetría en vivo
  | 'ERROR'         // fallo de reserva/conexión; recuperable reintentando
  | 'DESCONECTADO'; // desconexión voluntaria conservando o no la reserva

export interface UseConexionVentiladorReturn {
  /** Estado actual de la máquina. */
  estado: EstadoConexion;
  /** Mensaje legible asociado al estado (errores, avisos). */
  mensaje: string;
  /** Reserva activa de ESTE usuario sobre el ventilador. */
  tieneReserva: boolean;
  /** Nombre del usuario que tiene reservado el ventilador (null si está libre o es propio). */
  reservadoPor: string | null;
  /** WebSocket con el backend (puerta de enlace al broker MQTT). */
  socketConectado: boolean;
  /** Estado reportado por el backend para el ventilador físico. */
  estadoVentilador: VentilatorStatus;
  /** Minutos restantes de la reserva (0 si no hay). */
  minutosRestantes: number;
  /** True solo en CONECTADO — atajo para consumidores (Monitoreo). */
  estaConectado: boolean;
  // --- Guardas de transición (habilitan/deshabilitan botones) ---
  puedeReservar: boolean;
  puedeConectar: boolean;
  puedeDesconectar: boolean;
  puedeLiberar: boolean;
  /** True mientras una acción asíncrona está en vuelo. */
  ocupado: boolean;
  acciones: {
    reservar: (minutos: number, proposito?: string) => Promise<boolean>;
    conectar: () => Promise<void>;
    desconectar: () => void;
    liberar: () => Promise<void>;
  };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * FSM de conexión al ventilador. Debe usarse dentro de <SocketProvider> (global
 * en _app.js) y normalmente a través de <ConexionVentiladorProvider> para que un
 * único estado sea compartido por la tab Conexión y la tab Monitoreo.
 */
export function useConexionVentilador(): UseConexionVentiladorReturn {
  const remote = useRemoteVentilator();

  // Desestructurar valores/callbacks estables para usarlos en dep arrays.
  const {
    isSocketConnected,
    hasReservation,
    occupiedBy,
    ventilatorStatus,
    reservation,
    requestReservation,
    releaseReservation,
    connect,
    disconnect,
  } = remote;

  const [estado, setEstado] = useState<EstadoConexion>('SIN_RESERVA');
  const [mensaje, setMensaje] = useState<string>('');

  // ---------------------------------------------------------------------------
  // Reconciliación con el backend (estado derivado, sin efecto)
  // Si la reserva se pierde (timeout o liberación remota) mientras la FSM creía
  // tenerla, el estado efectivo cae a SIN_RESERVA. Se calcula en render —puro e
  // idempotente— en lugar de un useEffect con setState, que dispara renders en
  // cascada y rompe la pureza del hook.
  // ---------------------------------------------------------------------------
  const reservaPerdida =
    !hasReservation &&
    (estado === 'RESERVADO' || estado === 'CONECTANDO' || estado === 'CONECTADO');

  const estadoEfectivo: EstadoConexion = reservaPerdida ? 'SIN_RESERVA' : estado;
  const mensajeEfectivo = reservaPerdida ? 'La reserva finalizó o fue liberada.' : mensaje;

  // ---------------------------------------------------------------------------
  // Acciones con guardas (evaluadas contra el estado efectivo)
  // ---------------------------------------------------------------------------

  const reservar = useCallback(
    async (minutos: number, proposito?: string): Promise<boolean> => {
      // Guarda: solo se reserva desde un estado sin reserva activa.
      if (
        !(
          estadoEfectivo === 'SIN_RESERVA' ||
          estadoEfectivo === 'DESCONECTADO' ||
          estadoEfectivo === 'ERROR'
        )
      ) {
        return false;
      }
      setEstado('RESERVANDO');
      setMensaje('');
      const ok = await requestReservation(minutos, proposito);
      if (ok) {
        setEstado('RESERVADO');
        setMensaje('Ventilador reservado. Ya puedes conectar.');
        return true;
      }
      // El backend rechaza con 409 si el recurso único ya está reservado.
      setEstado('ERROR');
      setMensaje('No se pudo reservar: el ventilador ya está en uso.');
      return false;
    },
    [estadoEfectivo, requestReservation],
  );

  const conectar = useCallback(async (): Promise<void> => {
    // Guarda: no se puede conectar sin una reserva confirmada.
    if (estadoEfectivo !== 'RESERVADO') return;
    setEstado('CONECTANDO');
    setMensaje('');
    try {
      await connect(); // lanza si no hay socket o no hay reserva
      setEstado('CONECTADO');
      setMensaje('Conectado al ventilador.');
    } catch (err) {
      setEstado('ERROR');
      setMensaje(err instanceof Error ? err.message : 'Error al conectar.');
    }
  }, [estadoEfectivo, connect]);

  const desconectar = useCallback((): void => {
    // Guarda: solo aplica si hay un canal abierto o estableciéndose.
    if (!(estadoEfectivo === 'CONECTADO' || estadoEfectivo === 'CONECTANDO')) return;
    disconnect();
    // Se conserva la reserva: la FSM regresa a RESERVADO si sigue vigente.
    setEstado(hasReservation ? 'RESERVADO' : 'DESCONECTADO');
    setMensaje('');
  }, [estadoEfectivo, disconnect, hasReservation]);

  const liberar = useCallback(async (): Promise<void> => {
    if (!hasReservation) return;
    setEstado('RESERVANDO'); // breve estado de transición durante el release
    await releaseReservation();
    setEstado('SIN_RESERVA');
    setMensaje('Reserva liberada.');
  }, [hasReservation, releaseReservation]);

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------

  const ocupado = estadoEfectivo === 'RESERVANDO' || estadoEfectivo === 'CONECTANDO';

  const guardas = useMemo(
    () => ({
      // Además del estado de la FSM, el recurso único debe estar libre: si otro
      // usuario lo tiene reservado (occupiedBy) el botón Reservar se deshabilita.
      puedeReservar:
        !ocupado &&
        occupiedBy === null &&
        (estadoEfectivo === 'SIN_RESERVA' ||
          estadoEfectivo === 'DESCONECTADO' ||
          estadoEfectivo === 'ERROR'),
      puedeConectar: !ocupado && estadoEfectivo === 'RESERVADO',
      puedeDesconectar: estadoEfectivo === 'CONECTADO' || estadoEfectivo === 'CONECTANDO',
      puedeLiberar: !ocupado && hasReservation,
    }),
    [estadoEfectivo, ocupado, hasReservation, occupiedBy],
  );

  return {
    estado: estadoEfectivo,
    mensaje: mensajeEfectivo,
    tieneReserva: hasReservation,
    reservadoPor: occupiedBy ? occupiedBy.name ?? 'otro usuario' : null,
    socketConectado: isSocketConnected,
    estadoVentilador: ventilatorStatus,
    minutosRestantes: reservation?.remainingMinutes ?? 0,
    estaConectado: estadoEfectivo === 'CONECTADO',
    ...guardas,
    ocupado,
    acciones: { reservar, conectar, desconectar, liberar },
  };
}

export default useConexionVentilador;
