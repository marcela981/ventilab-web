/*
* Funcionalidad: Engine settings ↔ ventilator console binding (public API)
* Descripción: Deep entry `@shared/sim-engine/console-binding`: the mapping between the engine ventilator settings and
*   the generic ventilator console shared by the simulator and the case editor. Kept out of the sim-engine barrel so
*   the worker and the barrel never load console code. Depends on the settings binding module.
*   v1.1 (T12): the engine output ↔ console mapping (samples, frame hub, metrics, vitals, trends, alarms, target
*   ranges), moved from the simulator for the case editor local preview.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export {
  applicabilityFor,
  buildConsoleLimits,
  MODE_LABELS,
  MODE_OPTIONS,
  PARAMETER_SETTINGS,
  tidy,
  toConsoleSettings,
  toSettingsChanges,
} from "./settings-binding";
export type { ParameterSetting } from "./settings-binding";
export {
  ALARM_LABELS,
  appendTrends,
  createConsoleFrameHub,
  rangesFromTargets,
  toConsoleAlarms,
  toConsoleMetrics,
  toConsoleSamples,
  toPatientValues,
} from "./frame-binding";
export type { ConsoleFrameHub, PatientTrends, PatientValues } from "./frame-binding";
