/*
* Funcionalidad: RealtimeProvider behavior tests
* Descripción: Tests of the authenticated socket layer with a mocked socket.io-client (no network) and a stub session context: no connection without a backend session, handshake authentication, disconnect on sign-out, re-authentication on reconnect and after a token refresh on the SAME socket, one refresh then re-auth after auth_error (no loop), reconnect on identity change, useSocketEvent subscription lifecycle across socket replacement, and user:role-changed wiring to handleRoleChanged. Depends on vitest, Testing Library and the session/api-client modules.
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
import { clearTokens, saveTokens, setAccessToken } from "@shared/api-client/token-storage";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type { Role, RoleChangedEvent, SessionStatus, SessionUser } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { RealtimeProvider } from "./realtime-provider";
import type { RealtimeContextValue } from "./realtime-context";
import { useSocket } from "./use-socket";
import { useSocketEvent } from "./use-socket-event";

type Listener = (...args: unknown[]) => void;
type AuthCallback = (data: { token: string }) => void;
type SocketOptions = { autoConnect?: boolean, auth?: (callback: AuthCallback) => void };

const mocks = vi.hoisted(() => {
  class FakeSocket {
    public connected = false;
    public readonly url: string;
    public readonly options: SocketOptions;
    public readonly emitted: Array<[string, unknown]> = [];
    public connectCalls = 0;
    public disconnectCalls = 0;
    private readonly _listeners = new Map<string, Set<Listener>>();

    public constructor(url: string, options: SocketOptions) {
      this.url = url;
      this.options = options;
    }

    public on(event: string, listener: Listener): this {
      const set = this._listeners.get(event) ?? new Set<Listener>();

      set.add(listener);
      this._listeners.set(event, set);

      return this;
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
      this.connectCalls += 1;

      return this;
    }

    public disconnect(): this {
      this.disconnectCalls += 1;
      this.connected = false;

      return this;
    }

    public listenerCount(event: string): number {
      return this._listeners.get(event)?.size ?? 0;
    }

    public fire(event: string, ...args: unknown[]): void {
      if (event === "connect") {
        this.connected = true;
      }

      if (event === "disconnect") {
        this.connected = false;
      }

      [...(this._listeners.get(event) ?? [])].forEach((listener) => listener(...args));
    }

    public handshakeToken(): string | undefined {
      let token: string | undefined;

      this.options.auth?.((data) => {
        token = data.token;
      });

      return token;
    }
  }

  return {
    FakeSocket,
    sockets: [] as FakeSocket[],
    refreshAccessToken: vi.fn<() => Promise<string>>(),
  };
});

vi.mock("socket.io-client", () => ({
  io: (url: string, options: SocketOptions) => {
    const socket = new mocks.FakeSocket(url, options);

    mocks.sockets.push(socket);

    return socket;
  },
}));

vi.mock("@shared/api-client/token-refresh", () => ({
  refreshAccessToken: mocks.refreshAccessToken,
}));

const makeUser = (id: string, role: Role): SessionUser => ({
  id,
  email: `${id}@ventylab.demo`,
  name: id,
  image: null,
  role,
});

const handleRoleChanged = vi.fn<(event: RoleChangedEvent) => Promise<boolean>>();

function makeSession(status: SessionStatus, user: SessionUser | null): SessionContextValue {
  return {
    status,
    user,
    role: user?.role ?? null,
    permissions: [],
    error: null,
    hasRole: () => false,
    hasPermission: () => false,
    establishSession: () => Promise.reject(new Error("not used")),
    signOut: () => Promise.resolve(),
    reloadSession: () => Promise.resolve(null),
    handleRoleChanged,
  };
}

let realtime: RealtimeContextValue | null = null;

function Probe() {
  const value = useSocket();

  useLayoutEffect(() => {
    realtime = value;
  });

  return null;
}

function Tree({ session, children }: { session: SessionContextValue, children?: ReactNode }) {
  return (
    <SessionContext.Provider value={session}>
      <RealtimeProvider>
        <Probe />
        {children}
      </RealtimeProvider>
    </SessionContext.Provider>
  );
}

const authenticated = (user = makeUser("u1", "STUDENT")) => makeSession("authenticated", user);

async function currentSocket(count = 1) {
  await waitFor(() => expect(mocks.sockets).toHaveLength(count));

  const socket = mocks.sockets[count - 1];

  if (!socket) {
    throw new Error("socket not created");
  }

  await waitFor(() => expect(realtime?.socket).toBe(socket));

  return socket;
}

const flush = () => act(async () => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

beforeEach(() => {
  mocks.sockets.length = 0;
  mocks.refreshAccessToken.mockReset();
  handleRoleChanged.mockReset();
  handleRoleChanged.mockResolvedValue(true);
  realtime = null;
  saveTokens("access-1", "refresh-1");
});

afterEach(() => {
  clearTokens();
});

describe("RealtimeProvider connection lifecycle", () => {
  it("does not create a socket without a backend session", async () => {
    render(<Tree session={makeSession("unauthenticated", null)} />);
    await flush();

    expect(mocks.sockets).toHaveLength(0);
    expect(realtime?.socket).toBeNull();
    expect(realtime?.status).toBe("idle");
  });

  it("does not create a socket while the session is loading", async () => {
    render(<Tree session={makeSession("loading", null)} />);
    await flush();

    expect(mocks.sockets).toHaveLength(0);
  });

  it("connects to the backend origin and authenticates with the access token in the handshake", async () => {
    render(<Tree session={authenticated()} />);

    const socket = await currentSocket();

    expect(socket.url).toBe(BACKEND_ORIGIN);
    expect(socket.options.autoConnect).toBe(false);
    expect(socket.connectCalls).toBe(1);
    expect(socket.handshakeToken()).toBe("access-1");

    act(() => socket.fire("connect"));
    await waitFor(() => expect(realtime?.status).toBe("connecting"));

    act(() => socket.fire("authenticated", { userId: "u1" }));
    await waitFor(() => expect(realtime?.status).toBe("authenticated"));
  });

  it("disconnects and drops the socket when the session ends", async () => {
    const view = render(<Tree session={authenticated()} />);
    const socket = await currentSocket();

    act(() => socket.fire("connect"));
    view.rerender(<Tree session={makeSession("unauthenticated", null)} />);

    await waitFor(() => expect(realtime?.socket).toBeNull());
    expect(socket.disconnectCalls).toBeGreaterThanOrEqual(1);
    expect(realtime?.status).toBe("idle");
  });

  it("re-authenticates on reconnect with the latest token on the same socket", async () => {
    render(<Tree session={authenticated()} />);
    const socket = await currentSocket();

    act(() => socket.fire("connect"));
    act(() => socket.fire("disconnect", "transport close"));
    act(() => setAccessToken("access-2"));

    expect(socket.emitted).toEqual([]);
    expect(socket.handshakeToken()).toBe("access-2");

    act(() => socket.fire("connect"));
    act(() => socket.fire("authenticated", { userId: "u1" }));

    await waitFor(() => expect(realtime?.status).toBe("authenticated"));
    expect(mocks.sockets).toHaveLength(1);
  });

  it("re-authenticates a live socket after a token refresh without opening a second connection", async () => {
    render(<Tree session={authenticated()} />);
    const socket = await currentSocket();

    act(() => socket.fire("connect"));
    act(() => socket.fire("authenticated", { userId: "u1" }));
    act(() => setAccessToken("access-2"));

    expect(socket.emitted).toEqual([["authenticate", { token: "access-2" }]]);

    act(() => setAccessToken("access-2"));

    expect(socket.emitted).toHaveLength(1);
    expect(mocks.sockets).toHaveLength(1);
  });

  it("reconnects the same socket when the user identity or role changes", async () => {
    const view = render(<Tree session={authenticated()} />);
    const socket = await currentSocket();

    act(() => socket.fire("connect"));
    view.rerender(<Tree session={authenticated(makeUser("u1", "TEACHER"))} />);

    await waitFor(() => expect(socket.connectCalls).toBe(2));
    expect(socket.disconnectCalls).toBe(1);
    expect(mocks.sockets).toHaveLength(1);
  });
});

describe("RealtimeProvider auth errors", () => {
  it("refreshes once and reconnects with the new token after auth_error", async () => {
    mocks.refreshAccessToken.mockImplementation(() => {
      setAccessToken("access-2");

      return Promise.resolve("access-2");
    });
    render(<Tree session={authenticated()} />);
    const socket = await currentSocket();

    act(() => socket.fire("connect"));
    act(() => socket.fire("auth_error", { message: "Invalid token" }));
    act(() => socket.fire("disconnect", "io server disconnect"));

    await waitFor(() => expect(socket.connectCalls).toBe(2));
    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(socket.handshakeToken()).toBe("access-2");
    expect(socket.emitted).toEqual([]);
    expect(mocks.sockets).toHaveLength(1);

    act(() => socket.fire("connect"));
    act(() => socket.fire("authenticated", { userId: "u1" }));
    await waitFor(() => expect(realtime?.status).toBe("authenticated"));
  });

  it("gives up after a second auth_error without refreshing again", async () => {
    mocks.refreshAccessToken.mockResolvedValue("access-2");
    render(<Tree session={authenticated()} />);
    const socket = await currentSocket();

    act(() => socket.fire("connect"));
    act(() => socket.fire("auth_error", { message: "Invalid token" }));
    await waitFor(() => expect(socket.connectCalls).toBe(2));

    act(() => socket.fire("connect"));
    act(() => socket.fire("auth_error", { message: "Invalid token" }));
    await flush();

    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(socket.connectCalls).toBe(2);
    expect(realtime?.status).toBe("unauthorized");
  });

  it("stays unauthorized when the refresh fails", async () => {
    mocks.refreshAccessToken.mockRejectedValue(new Error("refresh failed"));
    render(<Tree session={authenticated()} />);
    const socket = await currentSocket();

    act(() => socket.fire("connect"));
    act(() => socket.fire("auth_error", { message: "Invalid token" }));

    await waitFor(() => expect(realtime?.status).toBe("unauthorized"));
    expect(socket.connectCalls).toBe(1);
  });

  it("retries once more when a new token arrives after giving up", async () => {
    mocks.refreshAccessToken.mockRejectedValue(new Error("refresh failed"));
    render(<Tree session={authenticated()} />);
    const socket = await currentSocket();

    act(() => socket.fire("connect"));
    act(() => socket.fire("auth_error", { message: "Invalid token" }));
    await waitFor(() => expect(realtime?.status).toBe("unauthorized"));

    act(() => setAccessToken("access-3"));

    expect(socket.connectCalls).toBe(2);
    expect(socket.handshakeToken()).toBe("access-3");
  });
});

describe("realtime events", () => {
  it("calls handleRoleChanged with the user:role-changed payload", async () => {
    render(<Tree session={authenticated()} />);
    const socket = await currentSocket();
    const payload = { userId: "u1", previousRole: "STUDENT", newRole: "TEACHER" };

    act(() => socket.fire("user:role-changed", payload));

    expect(handleRoleChanged).toHaveBeenCalledWith(payload);
  });

  it("useSocketEvent subscribes, uses the latest handler, unsubscribes and survives socket replacement", async () => {
    const first = vi.fn();
    const second = vi.fn();

    function Listener({ handler }: { handler: (payload: unknown) => void }) {
      useSocketEvent("grade:published", handler);

      return null;
    }

    const view = render(<Tree session={authenticated()}><Listener handler={first} /></Tree>);
    const socket = await currentSocket();

    await waitFor(() => expect(socket.listenerCount("grade:published")).toBe(1));
    view.rerender(<Tree session={authenticated()}><Listener handler={second} /></Tree>);
    act(() => socket.fire("grade:published", { attemptId: "a1" }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ attemptId: "a1" });
    expect(socket.listenerCount("grade:published")).toBe(1);

    view.rerender(<Tree session={makeSession("unauthenticated", null)}><Listener handler={second} /></Tree>);
    await waitFor(() => expect(socket.listenerCount("grade:published")).toBe(0));

    view.rerender(<Tree session={authenticated()}><Listener handler={second} /></Tree>);
    const replacement = await currentSocket(2);

    await waitFor(() => expect(replacement.listenerCount("grade:published")).toBe(1));
    act(() => replacement.fire("grade:published", { attemptId: "a2" }));
    expect(second).toHaveBeenLastCalledWith({ attemptId: "a2" });

    view.rerender(<Tree session={authenticated()} />);
    await waitFor(() => expect(replacement.listenerCount("grade:published")).toBe(0));
  });

  it("useSocket throws outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow("useSocket must be used inside RealtimeProvider");
    spy.mockRestore();
  });
});
