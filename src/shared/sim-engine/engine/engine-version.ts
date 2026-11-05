/*
* Funcionalidad: Versión del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/engine-version.ts. Versión semántica del motor de simulación determinista; se registra con cada sesión para reproducir su repetición
* Versión: 2.0 (motor 2.0.0: evolución opcional del paciente)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
export const ENGINE_VERSION: string = "2.0.0";

/** Sessions recorded before 2.0.0 replay without the patient evolution so their replay and grade stay unchanged */
export function engineSupportsEvolution(engineVersion: string): boolean {
  const major: number = Number.parseInt(engineVersion.split(".")[0] ?? "", 10);

  return Number.isFinite(major) && major >= 2;
}
