/*
* Funcionalidad: Legacy SocketContext coexistence tests
* Descripción: Tests of the legacy SocketProvider as a 1:1 adapter over the new RealtimeProvider: with a backend session (both tokens) the legacy context exposes the realtime socket and its status as socket/isConnected/isAuthenticated and creates no io() connection of its own; with only the NextAuth bridge token it keeps today's legacy socket (connect + `authenticate` emit); a login on a live legacy socket tears it down and switches to the realtime socket. socket.io-client and next-auth/react are mocked (no network). Depends on vitest, Testing Library and the realtime/api-client modules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, render, waitFor } from "@testing-library/react";
import { useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTokens, saveTokens } from "@shared/api-client/token-storage";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import type { RealtimeContextValue } from "@shared/realtime/realtime-context";
import type { RealtimeSocket } from "@shared/realtime/realtime.entity";
import { SocketProvider, useSocket } from "@/shared/contexts/SocketContext";
import type { SocketContextValue } from "@/shared/contexts/SocketContext";

type Listener = (...args: unknown[]) => void;

const mocks = vi.hoisted(() => {
  class FakeSocket {
    public connected = false;
    public readonly emitted: Array<[string, unknown]> = [];
    public disconnectCalls = 0;
    private readonly _listeners = new Map<string, Set<Listener>>();

    public on(event: string, listener: Listener): this {
      const set = this._listeners.get(event) ?? new Set<Listener>();

      set.add(listener);
      this._listeners.set(event, set);

      return this;
    }

    public once(event: string, listener: Listener): this {
      const wrapper: Listener = (...args) => {
        this.off(event, wrapper);
        listener(...args);
      };

      return this.on(event, wrapper);
    }

    public off(event: string, listener: Listener): this {
      this._listeners.get(event)?.delete(listener);

      return this;
    }

    public emit(event: string, payload: unknown): this {
      this.emitted.push([event, payload]);

      return this;
    }

    public connect(): this {
      this.connected = true;
      this.fire("connect");

      return this;
    }

    public disconnect(): this {
      this.disconnectCalls += 1;

      if (this.connected) {
        this.connected = false;
        this.fire("disconnect");
      }

      return this;
    }

    public fire(event: string, ...args: unknown[]): void {
      [...(this._listeners.get(event) ?? [])].forEach((listener) => listener(...args));
    }
  }

  const sockets: FakeSocket[] = [];
  const io = vi.fn(() => {
    const socket = new FakeSocket();

    sockets.push(socket);

    return socket;
  });

  return { FakeSocket, sockets, io };
});

vi.mock("socket.io-client", () => ({ io: mocks.io }));
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(() => Promise.resolve(undefined)),
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

const latest: { value: SocketContextValue | null } = { value: null };

function Probe() {
  const value = useSocket();

  useLayoutEffect(() => {
    latest.value = value;
  });

  return null;
}

function renderWithRealtime(realtime: RealtimeContextValue) {
  const tree = (value: RealtimeContextValue): ReactNode => (
    <RealtimeContext.Provider value={value}>
      <SocketProvider>
        <Probe />
      </SocketProvider>
    </RealtimeContext.Provider>
  );
  const view = render(tree(realtime));

  return { ...view, rerenderWith: (value: RealtimeContextValue) => view.rerender(tree(value)) };
}

function realtimeSocket(): RealtimeSocket {
  return new mocks.FakeSocket() as unknown as RealtimeSocket;
}

describe("legacy SocketProvider coexistence", () => {
  beforeEach(() => {
    mocks.io.mockClear();
    mocks.sockets.length = 0;
    latest.value = null;
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("exposes the realtime socket and creates no io() connection when a backend session exists", async () => {
    saveTokens("access-token", "refresh-token");
    const shared = realtimeSocket();

    renderWithRealtime({ socket: shared, status: "authenticated" });

    await waitFor(() => expect(latest.value?.socket).toBe(shared));
    expect(latest.value?.isConnected).toBe(true);
    expect(latest.value?.isAuthenticated).toBe(true);
    expect(mocks.io).not.toHaveBeenCalled();
  });

  it("maps the realtime status to isConnected/isAuthenticated", async () => {
    saveTokens("access-token", "refresh-token");
    const shared = realtimeSocket();
    const view = renderWithRealtime({ socket: shared, status: "connecting" });

    await waitFor(() => expect(latest.value?.socket).toBe(shared));
    expect(latest.value?.isConnected).toBe(true);
    expect(latest.value?.isAuthenticated).toBe(false);

    view.rerenderWith({ socket: null, status: "idle" });

    await waitFor(() => expect(latest.value?.socket).toBeNull());
    expect(latest.value?.isConnected).toBe(false);
    expect(latest.value?.isAuthenticated).toBe(false);
    expect(mocks.io).not.toHaveBeenCalled();
  });

  it("keeps the legacy socket when only the NextAuth bridge token exists", async () => {
    window.localStorage.setItem("ventilab_auth_token", "bridge-token");

    renderWithRealtime({ socket: null, status: "idle" });

    await waitFor(() => expect(latest.value?.isConnected).toBe(true));
    expect(mocks.io).toHaveBeenCalledTimes(1);
    const legacy = mocks.sockets[0];

    expect(latest.value?.socket).toBe(legacy);
    expect(legacy?.emitted).toContainEqual(["authenticate", "bridge-token"]);
  });

  it("tears the legacy socket down and switches to the realtime socket after a backend login", async () => {
    window.localStorage.setItem("ventilab_auth_token", "bridge-token");
    const view = renderWithRealtime({ socket: null, status: "idle" });

    await waitFor(() => expect(latest.value?.isConnected).toBe(true));
    const legacy = mocks.sockets[0];
    const shared = realtimeSocket();

    act(() => {
      saveTokens("access-token", "refresh-token");
    });
    view.rerenderWith({ socket: shared, status: "authenticated" });

    await waitFor(() => expect(latest.value?.socket).toBe(shared));
    expect(legacy?.connected).toBe(false);
    expect(mocks.io).toHaveBeenCalledTimes(1);

    act(() => {
      clearTokens();
    });
    view.rerenderWith({ socket: null, status: "idle" });

    // Signed out with no NextAuth session and no token: a fresh idle legacy socket, never connected.
    await waitFor(() => expect(mocks.io).toHaveBeenCalledTimes(2));
    expect(mocks.sockets[1]?.connected).toBe(false);
    expect(latest.value?.isConnected).toBe(false);
  });
});
