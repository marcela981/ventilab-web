/*
 * Funcionalidad: syntheticVentilatorEmitter (DEV)
 * Descripción: Emisor sintético de telemetría de ventilador para desarrollo.
 *   Reproduce la carga del MODO SIMULADO sin broker MQTT ni backend socket.io.
 *   Es un SINGLETON ref-contado: un único temporizador genera lecturas a ~Hz
 *   configurable y las reparte (fan-out) a todos los suscriptores, de modo que
 *   la carga observada sea fiel (N hooks re-renderizando) sin multiplicar la
 *   generación de datos. Aislado bajo flag de dev: si la flag está apagada,
 *   subscribe() es un no-op y no se crea ningún temporizador.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import type { VentilatorReading } from '@/contracts/simulator.contracts';

type Listener = (reading: VentilatorReading) => void;

/** Flag de dev: '1' activa el emisor. Apagado por defecto (producción intacta). */
export const DEV_EMITTER_ENABLED =
  process.env.NEXT_PUBLIC_DEV_VENT_EMITTER === '1';

/** Frecuencia de emisión en Hz (default 60 para reproducir el peor caso). */
const EMITTER_HZ = Number(process.env.NEXT_PUBLIC_DEV_VENT_EMITTER_HZ) || 60;

const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Genera una lectura sintética basada en un ciclo respiratorio de 4 s.
 * Reusa la forma de onda del modo simulado (presión/flujo/volumen) + ruido.
 * NO altera la lógica de simulación de producción; es sólo carga de dev.
 */
function generateReading(now: number): VentilatorReading {
  const cycleProgress = (now % 4000) / 4000;

  let pressure: number;
  let flow: number;
  let volume: number;

  if (cycleProgress < 0.3) {
    const p = cycleProgress / 0.3;
    pressure = 5 + 20 * Math.sin((p * Math.PI) / 2);
    flow = 60 * Math.sin(p * Math.PI);
    volume = 500 * Math.sin((p * Math.PI) / 2);
  } else if (cycleProgress < 0.4) {
    pressure = 25;
    flow = 0;
    volume = 500;
  } else {
    const p = (cycleProgress - 0.4) / 0.6;
    pressure = 25 - 20 * Math.sin((p * Math.PI) / 2);
    flow = -40 * Math.sin(p * Math.PI);
    volume = 500 * Math.cos((p * Math.PI) / 2);
  }

  return {
    pressure: Math.max(0, pressure + (Math.random() - 0.5) * 2),
    flow: flow + (Math.random() - 0.5) * 5,
    volume: Math.max(0, volume + (Math.random() - 0.5) * 20),
    spo2: 97 + (Math.random() - 0.5),
    timestamp: now,
    deviceId: 'dev-synthetic',
  };
}

function start(): void {
  if (timer) return;
  const periodMs = Math.max(1, Math.round(1000 / EMITTER_HZ));
  timer = setInterval(() => {
    const reading = generateReading(Date.now());
    listeners.forEach((fn) => fn(reading));
  }, periodMs);
}

function stop(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Suscribe un listener al emisor sintético. Ref-contado: el temporizador
 * arranca con el primer suscriptor y se detiene al quedar sin suscriptores.
 * Devuelve la función de baja. No-op si la flag de dev está apagada.
 */
export function subscribeSyntheticEmitter(listener: Listener): () => void {
  if (!DEV_EMITTER_ENABLED) return () => {};

  listeners.add(listener);
  start();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}
