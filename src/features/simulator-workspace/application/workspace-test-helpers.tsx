/*
* Funcionalidad: Simulator workspace test helpers
* Descripción: Shared fixtures of the /simulador workspace tests: a stateful next/router mock (shallow `replace`
*   updates the query and re-renders the readers, like the Pages Router), an in-memory session store with a fresh FREE
*   record, a fake simulation worker client and the session dependencies with a counting worker factory. Depends on
*   vitest, React, the simulator session types and the sim-engine test case.
*   v0.2 (W7, Bloque 1): labConnectionControllerMock, an idle lab connection for the workspace tests without session or socket providers.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useSyncExternalStore } from "react";
import { vi } from "vitest";
import type { SessionRecord, SessionStore } from "@features/simulator";
import type { SimSessionHostDeps } from "@features/simulator/session.entry";
import { ENGINE_VERSION } from "@shared/sim-engine";
import type { SimCommand, SimWorkerClient, SimWorkerListener, SimWorkerMessage } from "@shared/sim-engine";
import { buildTestCase } from "@shared/sim-engine/runtime/sim-test-helpers";
import { createLabConnectionValue } from "./entities/lab-connection.entity";

type Query = Record<string, string | string[] | undefined>;

type RouterUrl = { pathname?: string, query?: Query };

type RouterSnapshot = {
  isReady: boolean
  pathname: string
  query: Query
  replace: (url: RouterUrl, as?: unknown, options?: unknown) => Promise<boolean>
  push: (url: unknown) => Promise<boolean>
};

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

let snapshot: RouterSnapshot;

const replace = vi.fn((url: RouterUrl): Promise<boolean> => {
  snapshot = { ...snapshot, query: url.query ?? {} };
  notify();

  return Promise.resolve(true);
});

const push = vi.fn((): Promise<boolean> => Promise.resolve(true));

snapshot = { isReady: true, pathname: "/simulador", query: {}, replace, push };

/** Router of the workspace tests; `reset` before each test. */
export const routerStore = {
  replace,
  push,
  reset(query: Query = {}, isReady = true): void {
    replace.mockClear();
    push.mockClear();
    snapshot = { isReady, pathname: "/simulador", query, replace, push };
    notify();
  },
  setReady(): void {
    snapshot = { ...snapshot, isReady: true };
    notify();
  },
  get query(): Query {
    return snapshot.query;
  },
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Body of the `next/router` mock: `vi.mock("next/router", async() => (await import(".../workspace-test-helpers")).nextRouterMock)`. */
export const nextRouterMock = {
  useRouter: (): RouterSnapshot => useSyncExternalStore(subscribe, () => snapshot),
};

export type FakeWorker = SimWorkerClient & {
  sent: SimCommand[]
  emit: (message: SimWorkerMessage) => void
  terminated: boolean
};

export function createFakeWorker(): FakeWorker {
  const workerListeners = new Set<SimWorkerListener>();
  const worker: FakeWorker = {
    sent: [],
    terminated: false,
    send(command) {
      worker.sent.push(command);
    },
    subscribe(listener) {
      workerListeners.add(listener);

      return () => {
        workerListeners.delete(listener);
      };
    },
    terminate() {
      worker.terminated = true;
      workerListeners.clear();
    },
    emit(message) {
      workerListeners.forEach((listener) => listener(message));
    },
  };

  return worker;
}

export function buildFreshRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "s1",
    mode: "FREE",
    seed: 42,
    engineVersion: ENGINE_VERSION,
    timeMultiplier: 1,
    expiresAt: null,
    startedAt: null,
    engineCase: buildTestCase(),
    caseId: "case-1",
    fresh: true,
    ...overrides,
  };
}

export function createMemorySessionStore(records: readonly SessionRecord[] = []): SessionStore {
  const memory = new Map(records.map((record) => [record.id, record]));

  return {
    save: (record) => {
      memory.set(record.id, record);
    },
    read: (sessionId) => memory.get(sessionId) ?? null,
    forget: (sessionId) => {
      memory.delete(sessionId);
    },
  };
}

export type SessionHarness = {
  deps: SimSessionHostDeps
  workers: FakeWorker[]
  createWorker: ReturnType<typeof vi.fn>
  endSession: ReturnType<typeof vi.fn>
};

/** Session dependencies of a fresh FREE record per id: no HTTP, a claimed tab and a counting worker factory. */
export function createSessionHarness(records: readonly SessionRecord[] = [buildFreshRecord()]): SessionHarness {
  const workers: FakeWorker[] = [];
  const createWorker = vi.fn(() => {
    const worker = createFakeWorker();

    workers.push(worker);

    return worker;
  });
  const endSession = vi.fn(() => Promise.resolve());

  return {
    workers,
    createWorker,
    endSession,
    deps: {
      bootstrap: {
        store: createMemorySessionStore(records),
        fetchReplay: () => Promise.reject(new Error("no replay")),
        fetchState: (sessionId) => Promise.resolve({ id: sessionId, status: "ACTIVE", simTimeMs: 0, expiresAt: null }),
        fetchStartedAt: () => Promise.resolve(null),
      },
      session: {
        createWorker,
        endSession,
        sendEvents: () => Promise.resolve({ accepted: 1, duplicates: 0, lastSimTimeMs: 0 }),
        sendKeepalive: () => undefined,
        createEventId: () => "evt-1",
      },
      claimTab: () => Promise.resolve({ status: "claimed", release: () => undefined }),
    },
  };
}

const IDLE_LAB_CONNECTION = createLabConnectionValue();

/**
 * Body of the lab connection controller mock (W7): an idle lab (NO_RESERVATION) for tests that render the workspace
 * without session or socket providers:
 * `vi.mock(".../hooks/use-lab-connection-controller", async() => (await import(".../workspace-test-helpers")).labConnectionControllerMock)`.
 */
export const labConnectionControllerMock = {
  useLabConnectionController: () => IDLE_LAB_CONNECTION,
};
