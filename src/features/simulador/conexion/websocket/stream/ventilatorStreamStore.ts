/*
 * Funcionalidad: ventilatorStreamStore
 * Descripción: Store externo (singleton) para la telemetría del ventilador.
 *   Implementa el patrón ingesta → ring buffer → flush en rAF:
 *     - Las muestras entrantes (socket o emisor sintético de dev) se acumulan en
 *       un ring buffer acotado (ref), SIN disparar un render por muestra.
 *     - Un único bucle requestAnimationFrame publica un snapshot a cadencia de
 *       display (~12 fps) y sólo notifica cuando hay cambios (dirty-gated), de
 *       modo que en reposo el coste de render es cero.
 *   Una sola suscripción al socket y un solo bucle de flush sirven a todos los
 *   consumidores vía useSyncExternalStore, eliminando las 3 instancias previas
 *   que mantenían 3 buffers y 3 ciclos de re-render independientes.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import type { Socket } from 'socket.io-client';

import type {
  VentilatorReading,
  VentilatorAlarm,
  VentilatorStatus,
  UseVentilatorDataReturn,
  AlarmType,
} from '@/contracts/simulator.contracts';
import { subscribeSyntheticEmitter } from '@/features/simulador/conexion/websocket/dev/syntheticVentilatorEmitter';

const BUFFER_SIZE = 300;
const FLUSH_MS = 80; // ~12.5 fps de cadencia de display
const STALE_THRESHOLD_MS = 2000;
const FPS_WINDOW_MS = 1000;

type Listener = () => void;

// =============================================================================
// Estado interno del singleton
// =============================================================================

const buffer: VentilatorReading[] = [];
const frameTimestamps: number[] = [];
let frameCount = 0;
let lastFrameAt = 0;

let isConnected = false;
let status: VentilatorStatus = 'DISCONNECTED';
let activeAlarms: VentilatorAlarm[] = [];
let error: Error | null = null;

let boundSocket: Socket | null = null;
let socketBindCount = 0;
let emitterUnsub: (() => void) | null = null;

const listeners = new Set<Listener>();
let rafId: number | null = null;
let lastFlush = 0;

// Marcadores de cambio para el flush dirty-gated
let dataDirty = false; // llegó al menos una muestra desde el último publish
let metaDirty = false; // cambió estado/alarmas/conexión/error
let lastPublishedFps = -1;
let lastPublishedStale = false;

// Snapshot cacheado: useSyncExternalStore exige identidad estable entre flushes.
// Se inicializa más abajo, tras declarar `actions` (evita TDZ).
let snapshot: UseVentilatorDataReturn;

// =============================================================================
// Acciones estables (referencian el socket actualmente enlazado)
// =============================================================================

const actions = {
  clearData: () => {
    buffer.length = 0;
    dataDirty = true;
    publish();
  },
  reconnect: () => {
    boundSocket?.disconnect();
    boundSocket?.connect();
  },
  acknowledgeAlarm: (alarmId: AlarmType) => {
    boundSocket?.emit('alarm:acknowledge', { alarmId });
    activeAlarms = activeAlarms.map((a) =>
      a.type === alarmId ? { ...a, acknowledged: true } : a,
    );
    metaDirty = true;
    publish();
  },
};

// =============================================================================
// Construcción del snapshot
// =============================================================================

function computeFps(now: number): number {
  const cutoff = now - FPS_WINDOW_MS;
  let count = 0;
  for (let i = frameTimestamps.length - 1; i >= 0; i--) {
    const t = frameTimestamps[i];
    if (t !== undefined && t >= cutoff) count++;
    else break;
  }
  return count;
}

function computeStale(now: number): boolean {
  return lastFrameAt > 0 && now - lastFrameAt > STALE_THRESHOLD_MS;
}

function buildSnapshot(): UseVentilatorDataReturn {
  const now = Date.now();
  const data = buffer.slice();
  const latest = data.at(-1) ?? null;
  const fps = computeFps(now);
  const isStale = computeStale(now);
  lastPublishedFps = fps;
  lastPublishedStale = isStale;
  return {
    data,
    latest,
    isConnected,
    error,
    status,
    activeAlarms,
    actions,
    latestFrame: latest,
    recentFrames: data,
    fps,
    isStale,
    frameCount,
  };
}

function publish(): void {
  snapshot = buildSnapshot();
  listeners.forEach((fn) => fn());
}

// Inicialización del snapshot (tras declarar `actions` y las funciones).
snapshot = buildSnapshot();

// =============================================================================
// Ingesta
// =============================================================================

function pushReading(reading: VentilatorReading): void {
  buffer.push(reading);
  if (buffer.length > BUFFER_SIZE) buffer.splice(0, buffer.length - BUFFER_SIZE);

  const now = Date.now();
  lastFrameAt = now;
  frameCount += 1;
  frameTimestamps.push(now);
  if (frameTimestamps.length > 200) frameTimestamps.splice(0, frameTimestamps.length - 200);

  dataDirty = true;
}

// =============================================================================
// Bucle de flush (rAF, dirty-gated)
// =============================================================================

function flushTick(): void {
  if (listeners.size === 0) {
    rafId = null;
    return;
  }
  const now = Date.now();
  if (now - lastFlush >= FLUSH_MS) {
    lastFlush = now;
    // ¿Cambió algo que justifique re-render?
    const fps = computeFps(now);
    const isStale = computeStale(now);
    const changed =
      dataDirty ||
      metaDirty ||
      fps !== lastPublishedFps ||
      isStale !== lastPublishedStale;
    if (changed) {
      dataDirty = false;
      metaDirty = false;
      publish();
    }
  }
  rafId = requestAnimationFrame(flushTick);
}

function startLoop(): void {
  if (rafId == null && typeof requestAnimationFrame !== 'undefined') {
    lastFlush = 0;
    rafId = requestAnimationFrame(flushTick);
  }
}

function stopLoop(): void {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// =============================================================================
// API pública del store
// =============================================================================

/** Suscripción de consumidores (useSyncExternalStore). Ref-contada. */
export function subscribe(listener: Listener): () => void {
  const firstConsumer = listeners.size === 0;
  listeners.add(listener);

  if (firstConsumer) {
    startLoop();
    // El emisor sintético de dev sólo corre mientras hay consumidores montados
    // (p. ej. la tab Monitoreo); se pausa en tabs inactivas.
    emitterUnsub = subscribeSyntheticEmitter(pushReading);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopLoop();
      emitterUnsub?.();
      emitterUnsub = null;
    }
  };
}

export function getSnapshot(): UseVentilatorDataReturn {
  return snapshot;
}

/**
 * Enlaza el socket (provisto por el contexto React) al store. Ref-contado para
 * tolerar múltiples montajes; registra los listeners una sola vez.
 */
export function bindSocket(socket: Socket | null): () => void {
  if (!socket) return () => {};

  socketBindCount += 1;
  if (socketBindCount === 1) {
    boundSocket = socket;

    socket.on('ventilator:data', pushReading);
    socket.on('ventilator:alarm', handleAlarm);
    socket.on('ventilator:status', handleStatus);
    socket.on('connect_error', handleConnectError);
  }

  return () => {
    socketBindCount -= 1;
    if (socketBindCount === 0) {
      socket.off('ventilator:data', pushReading);
      socket.off('ventilator:alarm', handleAlarm);
      socket.off('ventilator:status', handleStatus);
      socket.off('connect_error', handleConnectError);
      boundSocket = null;
    }
  };
}

/** Actualiza el estado de conexión (derivado del contexto del socket). */
export function setConnectionState(connected: boolean): void {
  if (isConnected === connected) return;
  isConnected = connected;
  status = connected ? 'CONNECTED' : 'DISCONNECTED';
  if (connected) error = null;
  metaDirty = true;
  // Con consumidores activos, el próximo flushTick lo publicará. Sin consumidores
  // (bucle detenido), refrescamos el snapshot para lecturas directas vía getSnapshot.
  if (listeners.size === 0) {
    snapshot = buildSnapshot();
  }
}

function handleAlarm(alarm: VentilatorAlarm): void {
  const idx = activeAlarms.findIndex((a) => a.type === alarm.type);
  if (idx >= 0) {
    const next = activeAlarms.slice();
    next[idx] = alarm;
    activeAlarms = next;
  } else {
    activeAlarms = [...activeAlarms, alarm];
  }
  metaDirty = true;
}

function handleStatus(incoming: VentilatorStatus): void {
  if (status === incoming) return;
  status = incoming;
  metaDirty = true;
}

function handleConnectError(err: Error): void {
  error = err;
  metaDirty = true;
}
