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
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ParamChangeEvent } from "@shared/sim-engine";
import { isEngineCase, toEngineEvents, toTimeMultiplier } from "../entities/sim-session.entity";
import { RESUME_SAFETY_MARGIN_WALL_MS } from "../config/sim-console.config";
import type { ClientSessionEvent, ServerClock, SessionBoot, SessionRecord, SessionReplay, SessionState } from "../entities/sim-session.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
import type { EventOutbox } from "./event-outbox";
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
  /** Client clock (epoch ms), only used to measure the time elapsed since the /state response. */
  now?: (() => number) | undefined
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

/** Current server time: the server clock of a response plus the client time elapsed since it; null without one. */
export function estimateServerNowMs(clock: ServerClock | null | undefined, clientNowMs: number): number | null {
  if (!clock || !Number.isFinite(clock.serverNowMs) || !Number.isFinite(clock.clientNowMs)) {
    return null;
  }

  const skewMs = clock.serverNowMs - clock.clientNowMs;

  // Never estimate a server time earlier than the reading itself (a client clock moved backwards).
  return Math.max(clock.serverNowMs, clientNowMs + skewMs);
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
  };
  const startAtSimTimeMs = Math.max(0, state.simTimeMs, lastEventMs);

  deps.store.save(record);

  return {
    status: "ready",
    boot: {
      record,
      initialEvents,
      startAtSimTimeMs,
      // FREE (and a no-fast-forward reload) resumes at the last known time; EXAM follows the server clock.
      initialBacklogMs: record.mode !== "EXAM" || deps.fastForward === false ? 0 : resumeBacklogMs({
        lastKnownMs: startAtSimTimeMs,
        startedAt,
        expiresAt: state.expiresAt,
        multiplier: timeMultiplier,
        serverNowMs: estimateServerNowMs(state.serverClock, (deps.now ?? Date.now)()),
      }),
      pendingEvents,
    },
  };
}
