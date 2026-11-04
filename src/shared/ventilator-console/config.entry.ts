/*
* Funcionalidad: Ventilator console config entry point
* Descripción: Light public entry of the ventilator console: only the static config (parameter ids and definitions,
*   the parameters per mode, the patient trend length and the alarm priority resolver), without the console
*   components. v0.1 (Bloque 5, perf): the engine ↔ console bindings and the simulator adapter import these values
*   from here instead of the index barrel; the package has no `sideEffects: false`, so a value import from the barrel
*   evaluates every console module (the July console, its cards, drawers and next/image logos). That pulled the whole
*   console into routes that only map values, such as the session result page that the /learn Inicio tab prefetches
*   (its evaluation became a new long task). Depends on the console config modules only.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { PATIENT_TREND_POINTS } from "./application/config/console.config";
export {
  CONSOLE_PARAMETER_IDS,
  CONSOLE_PARAMETERS,
  MODE_PARAMETERS,
  resolveAlarmPriority,
} from "./application/config/console-controls.config";
