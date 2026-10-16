/*
* Funcionalidad: Errores del motor fisiológico
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/simulation/domain/engine/engine.errors.ts. Error tipado que lanza el motor cuando un caso, una opción, un evento o un ajuste del ventilador es inválido o está fuera de los límites del equipo
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
export type EngineErrorCode = "OUT_OF_RANGE" | "INVALID_VALUE" | "INVALID_TIMING" | "INVALID_CASE" | "INVALID_OPTION" | "INVALID_EVENT";

export class EngineValidationError extends Error {
  public readonly code: EngineErrorCode;
  public readonly field: string;

  public constructor(code: EngineErrorCode, field: string, message: string) {
    super(message);
    this.name = "EngineValidationError";
    this.code = code;
    this.field = field;
  }
}
