/*
* Funcionalidad: Simulator console config
* Descripción: Static configuration of the running simulation console (T6). Maps every generic console parameter id
*   to its engine setting key with the display scale, unit and step (min/max always come from the vendored
*   VENTILATOR_LIMITS, never from here; FiO2 is shown in % with scale 100), the Spanish labels of the engine alarm
*   codes, target ids, modes and patient sex, the event queue timings (flush every 3 s, exponential backoff 1 s → 30 s,
*   at most 50 events per request), the UI refresh throttle and the sessionStorage key prefix. Depends on the
*   ventilator console and sim-engine public types. v1.1: the acknowledgement wait on end (2 s). v1.2: the outbox
*   sessionStorage prefix and the pending-events warning threshold. v1.3 (review of 524aedf): the resume safety margin,
*   the time-ahead refusal threshold, the keepalive chunk limits, the resync settle wait and the tab-claim probe.
*   v1.4 (review of 180a0a1): the keepalive TOTAL budget (all chunks of one page hide together).
*   v1.5 (T11): the parameter settings and mode labels moved to `@shared/sim-engine/console-binding` (re-exported).
*   v1.6 (T12): the alarm labels moved there too (re-exported), for the case editor local preview.
* Versión: 1.6
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { PatientSex, TargetId } from "@shared/sim-engine";

// Moved unchanged to the shared engine ↔ console binding (the case editor shows the same controls).
export { ALARM_LABELS, MODE_LABELS, PARAMETER_SETTINGS } from "@shared/sim-engine/console-binding";
export type { ParameterSetting } from "@shared/sim-engine/console-binding";

export type ObjectiveDefinition = { label: string, unit: string, decimals: number };

export const OBJECTIVE_DEFINITIONS = {
  SPO2: { label: "SpO2", unit: "%", decimals: 0 },
  PACO2: { label: "PaCO2", unit: "mmHg", decimals: 0 },
  PH: { label: "pH", unit: "", decimals: 2 },
  PLATEAU_PRESSURE: { label: "Presión meseta", unit: "cmH2O", decimals: 0 },
  DRIVING_PRESSURE: { label: "Presión de distensión", unit: "cmH2O", decimals: 0 },
  TIDAL_VOLUME_PER_KG_PBW: { label: "Vt por kg de peso predicho", unit: "mL/kg", decimals: 1 },
  AUTO_PEEP: { label: "Auto-PEEP", unit: "cmH2O", decimals: 1 },
} as const satisfies Record<TargetId, ObjectiveDefinition>;

export const SEX_LABELS = { MALE: "Masculino", FEMALE: "Femenino" } as const satisfies Record<PatientSex, string>;

/** Events are sent in batches every ~3 s (and on end, deadline and page hide). */
export const EVENT_FLUSH_INTERVAL_MS = 3000;
/** Exponential backoff for network, 429 and 5xx failures: 1 s, 2 s, 4 s … capped at 30 s. */
export const EVENT_RETRY_BASE_MS = 1000;
export const EVENT_RETRY_MAX_MS = 30_000;
/** Attempts of an explicit flush (end, deadline) before it reports the failure; the events stay queued. */
export const EVENT_FLUSH_ATTEMPTS = 4;
/** Client cap per request; the backend limit is a server setting not exposed in the contract. */
export const EVENT_MAX_BATCH_SIZE = 50;

/** Metrics, alarms and the clock refresh React state at most this often (curves never go through React). */
export const UI_REFRESH_INTERVAL_MS = 250;
/** Longest wait, on end, for the worker to acknowledge the changes it was sent (a batch arrives every ~33 ms). */
export const EVENT_ACK_TIMEOUT_MS = 2000;

export const SESSION_STORAGE_PREFIX = "ventylab.simulator.session.";
/** sessionStorage mirror of the events the server has not acknowledged yet (resent after a reload). */
export const EVENT_OUTBOX_STORAGE_PREFIX = "ventylab.simulator.outbox.";
/** Above this many unsent events the console warns that the connection may be failing (events are never dropped). */
export const EVENT_PENDING_WARNING_COUNT = 50;

/**
 * Wall-clock safety margin of the EXAM resume (multiplied by the session multiplier): the resume stays this far behind
 * the server bound `elapsed × multiplier + tolerance`. The tolerance is a server setting not exposed in the contract,
 * so the margin is a conservative 2 s instead of a fraction of it.
 */
export const RESUME_SAFETY_MARGIN_WALL_MS = 2000;
/** Consecutive time-ahead refusals after which "Recargar sesión" resumes without fast-forward (backlog 0). */
export const TIME_AHEAD_REFUSALS_BEFORE_NO_FAST_FORWARD = 2;
/**
 * Page-hide keepalive limits. Browsers cap the TOTAL of the in-flight keepalive bodies at 64 KiB (not each request),
 * so one page hide sends chunks of ≤ KEEPALIVE_MAX_EVENTS events and < KEEPALIVE_MAX_BYTES each only while their sum
 * stays within KEEPALIVE_MAX_TOTAL_BYTES (below 64 KiB for headers and other keepalive requests); the outbox keeps
 * the rest.
 */
export const KEEPALIVE_MAX_EVENTS = 50;
export const KEEPALIVE_MAX_BYTES = 60 * 1024;
export const KEEPALIVE_MAX_TOTAL_BYTES = 60 * 1024;
/** Longest wait, before a resync, for the old event queue to settle (the new boot reads the outbox it writes). */
export const RESYNC_SETTLE_TIMEOUT_MS = 3000;
/** BroadcastChannel fallback of the tab claim: how long a new tab waits for another tab to answer. */
export const TAB_CLAIM_PROBE_MS = 250;
