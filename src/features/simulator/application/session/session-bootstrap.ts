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
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { isEngineCase, toEngineEvents, toTimeMultiplier } from "../entities/sim-session.entity";
import type { SessionBoot, SessionRecord, SessionReplay, SessionState } from "../entities/sim-session.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
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
};

export type BootstrapResult =
  | { status: "ready", boot: SessionBoot }
  | { status: "ended", sessionId: string }
  | { status: "unavailable", title: string, message: string };

export async function bootstrapSession(sessionId: string, deps: BootstrapDeps): Promise<BootstrapResult> {
  const stored = deps.store.read(sessionId);

  if (stored?.fresh) {
    const record: SessionRecord = { ...stored, fresh: false };

    deps.store.save(record);

    return { status: "ready", boot: { record, initialEvents: [], startAtSimTimeMs: 0 } };
  }

  let replay: SessionReplay;
  let state: SessionState;

  try {
    [replay, state] = await Promise.all([deps.fetchReplay(sessionId), deps.fetchState(sessionId)]);
  } catch (error) {
    return { status: "unavailable", title: BOOTSTRAP_COPY.unavailable, message: getSimulatorErrorMessage(error) };
  }

  if (state.status !== "ACTIVE") {
    deps.store.forget(sessionId);

    return { status: "ended", sessionId };
  }

  if (!isEngineCase(replay.engineCase)) {
    return { status: "unavailable", title: BOOTSTRAP_COPY.unavailable, message: BOOTSTRAP_COPY.invalidCase };
  }

  const initialEvents = toEngineEvents(replay.events);
  const lastEventMs = initialEvents.at(-1)?.simTimeMs ?? 0;
  const record: SessionRecord = {
    id: sessionId,
    mode: stored?.mode ?? (state.expiresAt === null ? "FREE" : "EXAM"),
    seed: replay.seed,
    engineVersion: replay.engineVersion,
    timeMultiplier: toTimeMultiplier(replay.timeMultiplier),
    expiresAt: state.expiresAt,
    engineCase: replay.engineCase,
    caseId: stored?.caseId ?? replay.engineCase.id,
    fresh: false,
  };

  deps.store.save(record);

  return {
    status: "ready",
    boot: { record, initialEvents, startAtSimTimeMs: Math.max(0, state.simTimeMs, lastEventMs) },
  };
}
