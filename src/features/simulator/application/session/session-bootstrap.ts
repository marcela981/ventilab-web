/*
* Funcionalidad: Simulation session bootstrap
* Descripción: Decides how the console starts a session. A fresh record in the session store (just started in this
*   tab) boots at simulated time 0 with no events and is marked as booted. Any other case (a reload, another tab, a
*   lost store) rebuilds from the server: GET /replay (seed, engine case, engine version, time multiplier and the
*   stored events) plus GET /state (status, simulated time, deadline). The worker then replays the stored PARAM_CHANGE
*   events up to max(state time, last event time), so the state catches up deterministically. Neither replay nor
*   state carries the session mode (backend gap): the store keeps it, and without the store a non-null deadline means
*   EXAM. A session that is no longer ACTIVE leads to its result; a failure or an unusable case shows a Spanish
*   message. Depends on the session entities, the session store and the simulator error messages.
*   v1.1: the events this tab enqueued but the server never acknowledged (outbox mirror) are replayed too and sent
*   again before the simulation starts (the ones already in /replay are skipped by id). The resume time follows the
*   wall clock: target = min((now − startedAt) × session multiplier, (deadline − startedAt) × multiplier); the loop
*   starts at the last known state (last event, pending event or /state time) and catches up the rest as an initial
*   backlog, so no state is invented. `startedAt` comes from the store (start response) or, after a lost store, from
*   the history `ids` filter; without it the resume keeps the last known time.
*   v1.2 (review of 524aedf): the fast-forward never trusts the client clock. "now" is the server time of the /state
*   response (HTTP Date header) corrected by the elapsed client time since that response (skew = serverNow −
*   clientNowAtResponse), and the target stays RESUME_SAFETY_MARGIN_WALL_MS × multiplier behind the server bound, so a
*   client clock that runs ahead can no longer produce events the server refuses (403, time ahead). Without a Date
*   header (CORS hides it unless exposed) there is no fast-forward (backlog 0). FREE resumes at the last known time
*   (backlog 0); only EXAM fast-forwards, capped by `expiresAt`. `fastForward: false` (a reload after repeated
*   time-ahead refusals) also gives backlog 0, so "Recargar sesión" cannot loop. v1.3 (T9): a rebuilt record keeps
*   the exam context of the stored one.
*   v1.4 (review of 180a0a1): the elapsed time since the server reading is measured on a MONOTONIC clock
*   (performance.now at the response vs. now), so a wall-clock jump cannot move the estimate. The backend CORS config
*   does not expose `Date` (backend gap), so when /state has no server clock an EXAM resume with a known attempt reads
*   the server time from the attempt BODY (`GET /evaluation-attempts/{id}` `serverNow`); without either, backlog 0.
*   v1.5 (review of eb3c21b): an EXAM rebuilt without its exam context (the "Continuar parte práctica" path writes
*   only the exam return record) takes the attempt from that record, so the resume can read the attempt clock, and
*   the boot carries the server clock offset (server now − client wall clock) for the countdown.
*   v1.6 (W6, Bloque 1): a rebuilt record keeps the own patient (stored record, else the session state, else the
*   replay; null without one).
* Versión: 1.6
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ParamChangeEvent } from "@shared/sim-engine";
import { isEngineCase, monotonicNow, toEngineEvents, toTimeMultiplier } from "../entities/sim-session.entity";
import { RESUME_SAFETY_MARGIN_WALL_MS } from "../config/sim-console.config";
import type { ClientSessionEvent, ServerClock, SessionBoot, SessionRecord, SessionReplay, SessionState } from "../entities/sim-session.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
import type { EventOutbox } from "./event-outbox";
import type { ExamReturnStore } from "./exam-return-store";
import type { SessionStore } from "./session-store";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const BOOTSTRAP_COPY = {
  unavailable: "No se puede reanudar esta sesión en este navegador",
  invalidCase: "El servidor no devolvió un caso que este navegador pueda simular.",
} as const;

export type BootstrapDeps = {
  store: SessionStore
  fetchReplay: (sessionId: string) => Promise<SessionReplay>
  fetchState: (sessionId: string) => Promise<SessionState>
  /** Session start from the history, used when the store does not have it. */
  fetchStartedAt?: ((sessionId: string) => Promise<string | null>) | undefined
  outbox?: EventOutbox | undefined
  /** Server clock from the exam attempt body (`serverNow`), used when /state carries none. */
  fetchAttemptServerClock?: ((attemptId: string) => Promise<ServerClock | null>) | undefined
  /** Monotonic client clock (ms), only used to measure the time elapsed since the server reading. */
  monotonicNow?: (() => number) | undefined
  /** Client wall clock (ms), only used to turn the server clock into the countdown offset. Default Date.now. */
  wallNow?: (() => number) | undefined
  /** Exam return record: the attempt of an EXAM rebuilt without its exam context. */
  examReturn?: ExamReturnStore | undefined
  /** false: resume at the last known time (no fast-forward), e.g. after repeated time-ahead refusals. Default true. */
  fastForward?: boolean | undefined
};

export type BootstrapResult =
  | { status: "ready", boot: SessionBoot }
  | { status: "ended", sessionId: string }
  | { status: "unavailable", title: string, message: string };

export type ResumeInput = {
  /** Last simulated time known for the session (stored events, unsent events and /state). */
  lastKnownMs: number
  startedAt: string | null
  expiresAt: string | null
  multiplier: number
  /** Current server time (epoch ms); null when unknown (no fast-forward). */
  serverNowMs: number | null
};

/**
 * Current server time: the server time of a response plus the MONOTONIC time elapsed since it arrived
 * (serverNow + (monotonicNow − monotonicAtResponse)); null without a reading. Never earlier than the reading.
 */
export function estimateServerNowMs(clock: ServerClock | null | undefined, monotonicNowMs: number): number | null {
  if (!clock || !Number.isFinite(clock.serverNowMs) || !Number.isFinite(clock.monotonicAtMs) || !Number.isFinite(monotonicNowMs)) {
    return null;
  }

  return clock.serverNowMs + Math.max(0, monotonicNowMs - clock.monotonicAtMs);
}

/** /state server clock, else (EXAM with a known attempt) the attempt body clock; null when neither is readable. */
async function readResumeClock(state: SessionState, attemptId: string | null, deps: BootstrapDeps): Promise<ServerClock | null> {
  if (state.serverClock) {
    return state.serverClock;
  }

  if (!attemptId || !deps.fetchAttemptServerClock) {
    return null;
  }

  try {
    return await deps.fetchAttemptServerClock(attemptId);
  } catch {
    // Not fatal: the resume keeps the last known simulated time.
    return null;
  }
}

/**
 * Simulated time the server clock owes beyond the last known state: (serverNow − startedAt) × multiplier, capped by
 * the deadline, minus the safety margin. 0 when the start or the server time is unknown, or the target is behind the
 * last known time.
 */
export function resumeBacklogMs({ lastKnownMs, startedAt, expiresAt, multiplier, serverNowMs }: ResumeInput): number {
  const startMs = startedAt === null ? Number.NaN : Date.parse(startedAt);

  if (!Number.isFinite(startMs) || serverNowMs === null || !Number.isFinite(serverNowMs)) {
    return 0;
  }

  const deadlineMs = expiresAt === null ? Number.NaN : Date.parse(expiresAt);
  const wallEndMs = Number.isFinite(deadlineMs) ? Math.min(serverNowMs, deadlineMs) : serverNowMs;
  const targetMs = (Math.max(0, wallEndMs - startMs) - RESUME_SAFETY_MARGIN_WALL_MS) * multiplier;

  return Math.max(0, Math.floor(targetMs - lastKnownMs));
}

function toEngineEvent(event: ClientSessionEvent): ParamChangeEvent {
  return { type: "PARAM_CHANGE", simTimeMs: event.simTimeMs, changes: event.payload.changes };
}

async function readStartedAt(sessionId: string, stored: SessionRecord | null, deps: BootstrapDeps): Promise<string | null> {
  if (stored?.startedAt) {
    return stored.startedAt;
  }

  try {
    return (await deps.fetchStartedAt?.(sessionId)) ?? null;
  } catch {
    // Not fatal: the resume keeps the last known simulated time.
    return null;
  }
}

export async function bootstrapSession(sessionId: string, deps: BootstrapDeps): Promise<BootstrapResult> {
  const stored = deps.store.read(sessionId);

  if (stored?.fresh) {
    const record: SessionRecord = { ...stored, fresh: false };

    deps.store.save(record);

    return { status: "ready", boot: { record, initialEvents: [], startAtSimTimeMs: 0, initialBacklogMs: 0, pendingEvents: [] } };
  }

  let replay: SessionReplay;
  let state: SessionState;
  let startedAt: string | null;

  try {
    [replay, state, startedAt] = await Promise.all([
      deps.fetchReplay(sessionId),
      deps.fetchState(sessionId),
      readStartedAt(sessionId, stored, deps),
    ]);
  } catch (error) {
    return { status: "unavailable", title: BOOTSTRAP_COPY.unavailable, message: getSimulatorErrorMessage(error) };
  }

  if (state.status !== "ACTIVE") {
    deps.store.forget(sessionId);
    deps.outbox?.clear(sessionId);

    return { status: "ended", sessionId };
  }

  if (!isEngineCase(replay.engineCase)) {
    return { status: "unavailable", title: BOOTSTRAP_COPY.unavailable, message: BOOTSTRAP_COPY.invalidCase };
  }

  const storedIds = new Set(replay.events.map((event) => event.id));
  // Unsent events of this tab, minus the ones the server already stored (a refusal later shows the divergence).
  const pendingEvents = (deps.outbox?.read(sessionId) ?? [])
    .filter((event) => !storedIds.has(event.id))
    .sort((a, b) => a.simTimeMs - b.simTimeMs);
  const initialEvents = [...toEngineEvents(replay.events), ...pendingEvents.map(toEngineEvent)].sort((a, b) => a.simTimeMs - b.simTimeMs);
  const lastEventMs = initialEvents.at(-1)?.simTimeMs ?? 0;
  const timeMultiplier = toTimeMultiplier(replay.timeMultiplier);
  const record: SessionRecord = {
    id: sessionId,
    mode: stored?.mode ?? (state.expiresAt === null ? "FREE" : "EXAM"),
    seed: replay.seed,
    engineVersion: replay.engineVersion,
    timeMultiplier,
    expiresAt: state.expiresAt,
    startedAt,
    engineCase: replay.engineCase,
    caseId: stored?.caseId ?? replay.engineCase.id,
    fresh: false,
    // The exam linkage only exists in this tab's record (no session endpoint carries it).
    exam: stored?.exam ?? null,
    patient: stored?.patient ?? state.patient ?? replay.patient ?? null,
  };
  const startAtSimTimeMs = Math.max(0, state.simTimeMs, lastEventMs);
  // FREE (and a no-fast-forward reload) resumes at the last known time; EXAM follows the server clock.
  const exam = record.mode === "EXAM";
  const fastForward = exam && deps.fastForward !== false;
  // Without its exam context (continue path), the attempt comes from the exam return record and the offset is measured.
  const needsOffset = exam && !stored?.exam;
  const attemptId = stored?.exam?.attemptId ?? (needsOffset ? deps.examReturn?.read(sessionId)?.attemptId ?? null : null);
  const clock = fastForward || needsOffset ? await readResumeClock(state, attemptId, deps) : null;
  const serverNowMs = estimateServerNowMs(clock, (deps.monotonicNow ?? monotonicNow)());

  deps.store.save(record);

  return {
    status: "ready",
    boot: {
      record,
      initialEvents,
      startAtSimTimeMs,
      initialBacklogMs: !fastForward ? 0 : resumeBacklogMs({
        lastKnownMs: startAtSimTimeMs,
        startedAt,
        expiresAt: state.expiresAt,
        multiplier: timeMultiplier,
        serverNowMs,
      }),
      pendingEvents,
      ...(needsOffset && serverNowMs !== null ? { serverOffsetMs: Math.round(serverNowMs - (deps.wallNow ?? Date.now)()) } : {}),
    },
  };
}
