/*
* Funcionalidad: Punto de entrada del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/index.ts. Exporta la API pública del motor de simulación determinista (creación, eventos, avance, ondas, métricas, repetición), sus tipos, errores, límites del ventilador y versión, para consumirlo como paquete
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
export * from "./engine.types";
export * from "./engine.errors";
export * from "./engine-version";
export * from "./ventilator-limits";
export { DEFAULT_ALARM_THRESHOLDS } from "./alarms";
export { predictedBodyWeightKg, mechanicalPowerJPerMin } from "./cycle-metrics";
export {
  alveolarPo2,
  arterialPh,
  equilibriumPao2,
  equilibriumPaco2,
  severinghausSaturation,
  shuntFractionAtPeep,
} from "./gas-exchange";
export {
  applyEvent,
  createSimulation,
  getMetrics,
  getWaveformBuffer,
  INTERNAL_STEP_MS,
  replay,
  step,
} from "./simulation";
