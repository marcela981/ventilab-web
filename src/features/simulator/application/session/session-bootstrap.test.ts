/*
* Funcionalidad: Simulation session bootstrap tests
* Descripción: Verifies the session store (memory + sessionStorage mirror, invalid or throwing storage ignored), the
*   bootstrap paths (fresh record boots at 0 once; otherwise replay + state rebuild the record and the stored events
*   with the resume time; mode from the store or from the deadline; ended and unavailable results) and the engine
*   version check (FREE warning, EXAM block). Depends on vitest and the session modules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { checkEngineVersion } from "../entities/sim-session.entity";
import type { SessionReplay, SessionState } from "../entities/sim-session.entity";
import { bootstrapSession, BOOTSTRAP_COPY } from "./session-bootstrap";
import { createSessionStore } from "./session-store";
import { buildEngineCase, buildRecord, createMemoryStorage } from "./sim-session-test-helpers";

function replayOf(overrides: Partial<SessionReplay> = {}): SessionReplay {
  return {
    id: "s1",
    seed: 7,
    engineVersion: "1.0.0",
    timeMultiplier: 2,
    engineCase: buildEngineCase(),
    events: [
      { id: "e2", type: "PARAM_CHANGE", simTimeMs: 9000, payload: { changes: { fio2: 0.6 } } },
      { id: "e0", type: "ALARM_ACK", simTimeMs: 5000, payload: { alarmCode: "APNEA" } },
      { id: "e1", type: "PARAM_CHANGE", simTimeMs: 4000, payload: { changes: { peepCmH2O: 8 } } },
    ],
    ...overrides,
  };
}

function stateOf(overrides: Partial<SessionState> = {}): SessionState {
  return { id: "s1", status: "ACTIVE", simTimeMs: 12_000, expiresAt: null, ...overrides };
}

describe("session store", () => {
  it("mirrors records to sessionStorage and reads them back in a new page", () => {
    const storage = createMemoryStorage();

    createSessionStore(() => storage).save(buildRecord({ fresh: true }));

    expect(storage.data.has("ventylab.simulator.session.s1")).toBe(true);
    expect(createSessionStore(() => storage).read("s1")).toEqual(buildRecord({ fresh: true }));
  });

  it("ignores corrupted entries and storages that throw", () => {
    const storage = createMemoryStorage();

    storage.setItem("ventylab.simulator.session.s1", "{not json");
    expect(createSessionStore(() => storage).read("s1")).toBeNull();
    storage.setItem("ventylab.simulator.session.s1", JSON.stringify({ ...buildRecord(), engineCase: {} }));
    expect(createSessionStore(() => storage).read("s1")).toBeNull();

    const throwing = createSessionStore(() => {
      throw new Error("SecurityError");
    });

    expect(() => throwing.save(buildRecord())).not.toThrow();
    expect(throwing.read("s1")).toEqual(buildRecord());
    expect(() => throwing.forget("s1")).not.toThrow();
    expect(throwing.read("s1")).toBeNull();
  });
});

describe("bootstrapSession", () => {
  it("boots a fresh record at time 0 without the server, once", async() => {
    const store = createSessionStore(() => null);
    const fetchReplay = vi.fn(() => Promise.resolve(replayOf()));
    const fetchState = vi.fn(() => Promise.resolve(stateOf()));

    store.save(buildRecord({ fresh: true }));

    const result = await bootstrapSession("s1", { store, fetchReplay, fetchState });

    expect(result).toEqual({ status: "ready", boot: { record: buildRecord({ fresh: false }), initialEvents: [], startAtSimTimeMs: 0 } });
    expect(fetchReplay).not.toHaveBeenCalled();
    expect(store.read("s1")?.fresh).toBe(false);
  });

  it("rebuilds from replay + state after a reload: PARAM_CHANGE events in time order and the resume time", async() => {
    const store = createSessionStore(() => null);

    store.save(buildRecord({ mode: "FREE", caseId: "clinical-1" }));

    const result = await bootstrapSession("s1", {
      store,
      fetchReplay: () => Promise.resolve(replayOf()),
      fetchState: () => Promise.resolve(stateOf()),
    });

    expect(result.status).toBe("ready");

    if (result.status !== "ready") {
      return;
    }

    expect(result.boot.initialEvents).toEqual([
      { type: "PARAM_CHANGE", simTimeMs: 4000, changes: { peepCmH2O: 8 } },
      { type: "PARAM_CHANGE", simTimeMs: 9000, changes: { fio2: 0.6 } },
    ]);
    expect(result.boot.startAtSimTimeMs).toBe(12_000);
    expect(result.boot.record).toMatchObject({ seed: 7, timeMultiplier: 2, mode: "FREE", caseId: "clinical-1", fresh: false });
  });

  it("without the store, infers EXAM from the deadline and the case id from the engine case", async() => {
    const result = await bootstrapSession("s1", {
      store: createSessionStore(() => null),
      fetchReplay: () => Promise.resolve(replayOf({ events: [{ id: "e", type: "PARAM_CHANGE", simTimeMs: 15_000, payload: { changes: {} } }] })),
      fetchState: () => Promise.resolve(stateOf({ expiresAt: "2026-10-15T15:00:00.000Z" })),
    });

    expect(result.status === "ready" ? result.boot.record : null).toMatchObject({ mode: "EXAM", caseId: "case-1" });
    expect(result.status === "ready" ? result.boot.startAtSimTimeMs : null).toBe(15_000);
  });

  it("sends a session that is no longer active to its result", async() => {
    const result = await bootstrapSession("s1", {
      store: createSessionStore(() => null),
      fetchReplay: () => Promise.resolve(replayOf()),
      fetchState: () => Promise.resolve(stateOf({ status: "ENDED" })),
    });

    expect(result).toEqual({ status: "ended", sessionId: "s1" });
  });

  it("reports that the session cannot be resumed when the server fails or the case is unusable", async() => {
    const failed = await bootstrapSession("s1", {
      store: createSessionStore(() => null),
      fetchReplay: () => Promise.reject(new ApiError({ code: "simulation.session_access_denied", message: "", status: 403 })),
      fetchState: () => Promise.resolve(stateOf()),
    });

    expect(failed).toEqual({ status: "unavailable", title: BOOTSTRAP_COPY.unavailable, message: "No tienes acceso a esta sesión de simulación." });

    const invalid = await bootstrapSession("s1", {
      store: createSessionStore(() => null),
      fetchReplay: () => Promise.resolve(replayOf({ engineCase: { id: "x" } })),
      fetchState: () => Promise.resolve(stateOf()),
    });

    expect(invalid).toEqual({ status: "unavailable", title: BOOTSTRAP_COPY.unavailable, message: BOOTSTRAP_COPY.invalidCase });
  });
});

describe("checkEngineVersion", () => {
  it("passes a matching version, warns in FREE and blocks in EXAM", () => {
    expect(checkEngineVersion("FREE", "1.0.0", "1.0.0")).toEqual({ status: "match" });
    expect(checkEngineVersion("FREE", "0.9.0", "1.0.0")).toMatchObject({ status: "warning" });
    expect(checkEngineVersion("EXAM", "0.9.0", "1.0.0")).toMatchObject({ status: "blocked" });
  });
});
