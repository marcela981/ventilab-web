/*
* Funcionalidad: Session tab claim tests
* Descripción: Verifies the one-tab claim of a running simulation session: with an injected Web Locks manager a second
*   claimer of the same session gets "taken" until the first releases, other sessions are independent and the same
*   realm shares its claim (StrictMode remount); with an injected BroadcastChannel a new tab that gets an answer is
*   "taken" and one that gets none claims the session and answers later probes; without any mechanism the claim is
*   granted (fail open). Depends on vitest and the tab claim module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { createTabClaimer } from "./session-tab-claim";
import type { TabChannel, TabLockManager } from "./session-tab-claim";

/** In-memory Web Locks manager shared by several "tabs" (ifAvailable only). */
function createFakeLocks(): TabLockManager {
  const held = new Set<string>();

  return {
    request(name, _options, callback) {
      if (held.has(name)) {
        return Promise.resolve(callback(null));
      }

      held.add(name);

      return Promise.resolve(callback({ name })).finally(() => held.delete(name));
    },
  };
}

/** In-memory BroadcastChannel bus: messages reach every other channel of the same name. */
function createFakeChannelBus(): (name: string) => TabChannel {
  const channels = new Set<{ name: string, channel: TabChannel }>();

  return (name) => {
    const channel: TabChannel = {
      onmessage: null,
      postMessage(data) {
        channels.forEach((entry) => {
          if (entry.channel !== channel && entry.name === name) {
            queueMicrotask(() => entry.channel.onmessage?.({ data }));
          }
        });
      },
      close() {
        channels.forEach((entry) => {
          if (entry.channel === channel) {
            channels.delete(entry);
          }
        });
      },
    };

    channels.add({ name, channel });

    return channel;
  };
}

const immediateTimers = { setTimeout: (handler: () => void) => setTimeout(handler, 0), clearTimeout: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>) };

describe("session tab claim", () => {
  it("Web Locks: a second tab of the same session is refused until the first one releases it", async() => {
    const locks = createFakeLocks();
    const firstTab = createTabClaimer({ locks });
    const secondTab = createTabClaimer({ locks });

    const first = await firstTab.claim("s1");

    expect(first.status).toBe("claimed");
    expect((await secondTab.claim("s1")).status).toBe("taken");
    expect((await secondTab.claim("s2")).status).toBe("claimed");

    if (first.status === "claimed") {
      first.release();
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await secondTab.claim("s1")).status).toBe("claimed");
  });

  it("shares the claim inside the same tab (StrictMode remount) and releases the lock after the last holder", async() => {
    const locks = createFakeLocks();
    const tab = createTabClaimer({ locks });
    const other = createTabClaimer({ locks });

    const [a, b] = await Promise.all([tab.claim("s1"), tab.claim("s1")]);

    expect([a.status, b.status]).toEqual(["claimed", "claimed"]);

    if (a.status === "claimed") {
      a.release();
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await other.claim("s1")).status).toBe("taken");

    if (b.status === "claimed") {
      b.release();
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await other.claim("s1")).status).toBe("claimed");
  });

  it("BroadcastChannel fallback: a tab that gets an answer is refused, one that gets none claims the session", async() => {
    const createChannel = createFakeChannelBus();
    const firstTab = createTabClaimer({ locks: null, createChannel, timers: immediateTimers });
    const secondTab = createTabClaimer({ locks: null, createChannel, timers: immediateTimers });

    const first = await firstTab.claim("s1");

    expect(first.status).toBe("claimed");
    expect((await secondTab.claim("s1")).status).toBe("taken");

    if (first.status === "claimed") {
      first.release();
    }

    expect((await secondTab.claim("s1")).status).toBe("claimed");
  });

  it("grants the claim when the browser has neither mechanism", async() => {
    expect((await createTabClaimer({ locks: null, createChannel: null }).claim("s1")).status).toBe("claimed");
  });
});
