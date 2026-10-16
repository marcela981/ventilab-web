/*
* Funcionalidad: Simulator result and replay config
* Descripción: Static configuration of the session result and replay pages (T8): Spanish labels of the server rubric
*   criteria (TARGETS_REACHED, TIME_TO_STABILIZE, TIME_IN_RANGE, SAFETY_VIOLATIONS, AI_ASSIST_USAGE; an unknown
*   criterion keeps its raw name), the key metrics of the local evolution chart, the local playback speeds of the
*   replay, the seek debounce, the event mark labels, the tolerance of the determinism check and the sessionStorage
*   prefix of the exam return link (written by the exam flow). The playback speeds are a UI constant on purpose: they
*   only change how fast this browser replays a recording (nothing is sent), so the session time multiplier of the
*   contract does not bound them. v1.1: local replay timeout and the mark list collapse threshold. v1.2 (T9): labels
*   of the outcome rubric limit criteria (plateau, driving pressure, tidal volume, auto-PEEP). No dependencies.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

// TODO(i18n): move to a simulator namespace in src/i18n.
export const CRITERION_LABELS: Readonly<Record<string, string>> = {
  TARGETS_REACHED: "Objetivos alcanzados",
  TIME_TO_STABILIZE: "Tiempo hasta estabilizar",
  TIME_IN_RANGE: "Tiempo en rango",
  SAFETY_VIOLATIONS: "Violaciones de seguridad",
  AI_ASSIST_USAGE: "Uso de la asesoría IA",
  PLATEAU_PRESSURE_LIMIT: "Límite de presión meseta",
  DRIVING_PRESSURE_LIMIT: "Límite de presión de distensión",
  TIDAL_VOLUME_LIMIT: "Límite de volumen corriente",
  AUTO_PEEP_LIMIT: "Límite de auto-PEEP",
};

export const TIME_TO_STABILIZE_CRITERION = "TIME_TO_STABILIZE";
export const SAFETY_VIOLATIONS_CRITERION = "SAFETY_VIOLATIONS";

/** Key metrics of the evolution chart, read from each engine metrics snapshot of the local replay. */
export const EVOLUTION_METRICS = [
  { id: "spo2", label: "SpO2", unit: "%" },
  { id: "paco2", label: "PaCO2", unit: "mmHg" },
  { id: "plateauPressure", label: "Presión meseta", unit: "cmH2O" },
  { id: "tidalVolumePerKg", label: "Vt/kg PBW", unit: "mL/kg" },
] as const;

export type EvolutionMetricId = (typeof EVOLUTION_METRICS)[number]["id"];

/** Most bars per evolution chart: the timeline (one snapshot per simulated second) is sampled evenly. */
export const EVOLUTION_MAX_POINTS = 12;

/** Local replay playback speeds (simulated seconds per wall second); never sent to the server. */
export const REPLAY_SPEEDS = [1, 2, 4, 8] as const;

export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

export const DEFAULT_REPLAY_SPEED: ReplaySpeed = 1;

/** A scrub on the time bar re-initialises the worker only after this quiet period. */
export const REPLAY_SEEK_DEBOUNCE_MS = 250;

export type TimelineMarkKind = "param" | "assist" | "alarm" | "alarmAck" | "caseEvent";

export const MARK_LABELS: Readonly<Record<TimelineMarkKind, string>> = {
  param: "Cambio de parámetros",
  assist: "Asesoría IA",
  alarm: "Alarma",
  alarmAck: "Alarma reconocida",
  caseEvent: "Evento del caso",
};

/** Recorded event types shown on the replay time bar (START and END add nothing to the bar). */
export const EVENT_MARK_KINDS: Readonly<Record<string, TimelineMarkKind>> = {
  PARAM_CHANGE: "param",
  AI_HELP: "assist",
  ALARM_ACK: "alarmAck",
  CASE_EVENT: "caseEvent",
};

/** Relative tolerance of the local-versus-server final metrics comparison (the engine is deterministic). */
export const DETERMINISM_TOLERANCE = 1e-6;

/**
 * Longest wait for a local engine replay in the worker before it is shown as a retryable error. A long session
 * replays in a few seconds on a recent laptop; the margin covers slow devices.
 */
export const LOCAL_REPLAY_TIMEOUT_MS = 60_000;

/** Above this many marks the replay mark list is collapsed behind a disclosure. */
export const MARK_LIST_COLLAPSE_THRESHOLD = 30;

/** sessionStorage key prefix of the exam return link of a session (the exam flow writes it). */
export const EXAM_RETURN_STORAGE_PREFIX = "ventylab.simulator.exam-return.";
