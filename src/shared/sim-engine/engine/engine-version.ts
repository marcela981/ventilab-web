/*
* Funcionalidad: Versión del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/engine-version.ts. Versión semántica del motor de simulación determinista; se registra con cada sesión para reproducir su repetición
* Versión: 2.1 (compatibilidad: el motor 2.x reproduce igual las sesiones 1.x)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
export const ENGINE_VERSION: string = "2.0.0";

function majorOf(engineVersion: string): number {
  return Number.parseInt(engineVersion.split(".")[0] ?? "", 10);
}

/** Sessions recorded before 2.0.0 replay without the patient evolution so their replay and grade stay unchanged */
export function engineSupportsEvolution(engineVersion: string): boolean {
  const major: number = majorOf(engineVersion);

  return Number.isFinite(major) && major >= 2;
}

/**
 * Whether the engine `current` reproduces a session recorded with `recorded` exactly: the same version, or a 1.x
 * session on a 2.x engine (the 1.x case carries no evolution block, so the 2.x engine runs the 1.x physics unchanged).
 */
export function engineReplaysVersion(recorded: string, current: string = ENGINE_VERSION): boolean {
  if (recorded === current) {
    return true;
  }

  return majorOf(recorded) === 1 && majorOf(current) === 2;
}
