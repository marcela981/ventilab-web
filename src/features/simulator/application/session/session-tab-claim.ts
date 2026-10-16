/*
* Funcionalidad: Session tab claim
* Descripción: Makes sure a running simulation session is driven by one browser tab only (a duplicated tab copies the
*   sessionStorage of the session, so two workers would send diverging events). The claim uses the Web Locks API
*   (`navigator.locks.request(name, { ifAvailable: true })`, held until released or the tab closes); without it, a
*   BroadcastChannel fallback: the new tab asks "is anyone driving this session?" and claims it when no tab answers
*   within TAB_CLAIM_PROBE_MS (best effort: two tabs probing at the same instant can both claim). Without either
*   mechanism the claim is granted (fail open: the console must keep working on old browsers). Claims of the same
*   session inside one tab are shared and counted, so a StrictMode remount never refuses itself. Mechanisms and timers
*   are injectable (jsdom has neither). No React. Depends on the console config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { TAB_CLAIM_PROBE_MS } from "../config/sim-console.config";

export type TabClaimResult = { status: "claimed", release: () => void } | { status: "taken" };

/** The subset of the Web Locks LockManager the claim uses. */
export type TabLockManager = {
  request: (name: string, options: { ifAvailable: true }, callback: (lock: unknown) => Promise<void> | void) => Promise<unknown>
};

/** The subset of BroadcastChannel the fallback uses. */
export type TabChannel = {
  postMessage: (data: unknown) => void
  close: () => void
  onmessage: ((event: { data: unknown }) => void) | null
};

export type TabClaimTimers = {
  setTimeout: (handler: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
};

export type TabClaimDeps = {
  /** null: no Web Locks. undefined: read from the browser. */
  locks?: TabLockManager | null | undefined
  /** null: no BroadcastChannel. undefined: read from the browser. */
  createChannel?: ((name: string) => TabChannel) | null | undefined
  timers?: TabClaimTimers | undefined
  probeMs?: number | undefined
};

export type TabClaimer = {
  claim: (sessionId: string) => Promise<TabClaimResult>
};

type Lease = { release: () => void };

const PROBE = "ventylab-sim-probe";
const TAKEN = "ventylab-sim-taken";

const defaultTimers: TabClaimTimers = {
  setTimeout: (handler, ms) => globalThis.setTimeout(handler, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>),
};

function browserLocks(): TabLockManager | null {
  try {
    const locks = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { locks?: TabLockManager }).locks;

    return locks && typeof locks.request === "function" ? locks : null;
  } catch {
    return null;
  }
}

function browserChannel(): ((name: string) => TabChannel) | null {
  return typeof BroadcastChannel === "function" ? (name) => new BroadcastChannel(name) as unknown as TabChannel : null;
}

function lockName(sessionId: string): string {
  return `ventylab.simulator.session-tab.${sessionId}`;
}

/** Web Locks: held until `release` (the callback promise settles); null when another tab holds it. */
function acquireWithLocks(locks: TabLockManager, name: string): Promise<Lease | null> {
  return new Promise((resolve) => {
    let releaseLock: () => void = () => undefined;
    const held = new Promise<void>((done) => {
      releaseLock = done;
    });

    locks.request(name, { ifAvailable: true }, (lock) => {
      if (lock === null) {
        resolve(null);

        return undefined;
      }

      resolve({ release: () => releaseLock() });

      return held;
    }).catch(() => {
      // A lock manager failure must not block the student: fail open.
      resolve({ release: () => undefined });
    });
  });
}

/** BroadcastChannel: probe; an answer means another tab drives the session. The holder answers later probes. */
function acquireWithChannel(createChannel: (name: string) => TabChannel, name: string, timers: TabClaimTimers, probeMs: number): Promise<Lease | null> {
  return new Promise((resolve) => {
    let channel: TabChannel;

    try {
      channel = createChannel(name);
    } catch {
      resolve({ release: () => undefined });

      return;
    }

    let holding = false;
    let settled = false;
    const handle = timers.setTimeout(() => {
      settled = true;
      holding = true;
      resolve({ release: () => channel.close() });
    }, probeMs);

    channel.onmessage = (event) => {
      if (event.data === PROBE && holding) {
        channel.postMessage(TAKEN);
      } else if (event.data === TAKEN && !settled) {
        settled = true;
        timers.clearTimeout(handle);
        channel.close();
        resolve(null);
      }
    };
    channel.postMessage(PROBE);
  });
}

export function createTabClaimer(deps: TabClaimDeps = {}): TabClaimer {
  const timers = deps.timers ?? defaultTimers;
  const probeMs = deps.probeMs ?? TAB_CLAIM_PROBE_MS;
  // Claims of this tab, shared by every holder of the same session.
  const leases = new Map<string, { holders: number, lease: Promise<Lease | null> }>();

  function acquire(name: string): Promise<Lease | null> {
    const locks = deps.locks === undefined ? browserLocks() : deps.locks;

    if (locks) {
      return acquireWithLocks(locks, name);
    }

    const createChannel = deps.createChannel === undefined ? browserChannel() : deps.createChannel;

    return createChannel ? acquireWithChannel(createChannel, name, timers, probeMs) : Promise.resolve({ release: () => undefined });
  }

  return {
    async claim(sessionId) {
      const name = lockName(sessionId);
      let entry = leases.get(name);

      if (!entry) {
        entry = { holders: 0, lease: acquire(name) };
        leases.set(name, entry);
      }

      const current = entry;

      current.holders += 1;

      const lease = await current.lease;

      if (lease === null) {
        current.holders -= 1;

        if (leases.get(name) === current) {
          leases.delete(name);
        }

        return { status: "taken" };
      }

      let released = false;

      return {
        status: "claimed",
        release: () => {
          if (released) {
            return;
          }

          released = true;
          current.holders -= 1;

          if (current.holders === 0 && leases.get(name) === current) {
            leases.delete(name);
            lease.release();
          }
        },
      };
    },
  };
}

/** The claimer of this browser tab. */
export const sessionTabClaimer: TabClaimer = createTabClaimer();
