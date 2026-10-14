/*
* Funcionalidad: RealtimeProvider
* Descripción: Owns the authenticated Socket.io connection for new code. A socket exists only while the backend session (useSession) is authenticated and is disconnected when it ends. Authentication follows asyncapi.yaml: the access token travels in the handshake (`auth.token`, read on every connect and reconnect from token-storage) and, when the token rotates on a live socket, it is re-sent with the `authenticate` message on the same socket. On `auth_error` (the server disconnects the socket) it runs the shared single-flight refresh once and reconnects; a second failure leaves the status `unauthorized` until a new token arrives (no loops). A user or role change reconnects the same socket so the server rebuilds the user/role rooms. `user:role-changed` is forwarded to the session's handleRoleChanged. socket.io-client and the refresh module are imported lazily. Depends on react, the session and api-client modules, and socket.io-client.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getAccessToken, subscribeTokens } from "@shared/api-client/token-storage";
import type { TokenSnapshot } from "@shared/api-client/token-storage";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type { RoleChangedEvent } from "@shared/session/session.entity";
import { useSession } from "@shared/session/use-session";
import type { RealtimeSocket, RealtimeStatus } from "./realtime.entity";
import { RealtimeContext } from "./realtime-context";
import type { RealtimeContextValue } from "./realtime-context";

type SocketIOModule = typeof import("socket.io-client");

type SocketCallbacks = {
  onStatus: (status: RealtimeStatus) => void
  onRoleChanged: (event: RoleChangedEvent) => void
};

type ManagedSocket = {
  socket: RealtimeSocket
  teardown: () => void
};

function createManagedSocket(io: SocketIOModule["io"], callbacks: SocketCallbacks): ManagedSocket {
  let lastToken = getAccessToken();
  let refreshAttempted = false;
  let refreshing = false;
  let gaveUp = false;
  let disposed = false;

  const socket: RealtimeSocket = io(BACKEND_ORIGIN, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    // Evaluated on every connect and reconnect, so a reconnect always carries the latest token.
    auth: (callback) => {
      lastToken = getAccessToken();
      callback({ token: lastToken ?? "" });
    },
  });

  const reconnect = (): void => {
    socket.disconnect();
    socket.connect();
  };

  const giveUp = (): void => {
    gaveUp = true;
    socket.disconnect();
    callbacks.onStatus("unauthorized");
  };

  const onConnect = (): void => callbacks.onStatus("connecting");

  const onAuthenticated = (): void => {
    refreshAttempted = false;
    gaveUp = false;
    callbacks.onStatus("authenticated");
  };

  const onDisconnect = (): void => {
    if (!gaveUp) {
      callbacks.onStatus("disconnected");
    }
  };

  const onAuthError = (): void => {
    if (refreshing) {
      return;
    }

    if (refreshAttempted) {
      giveUp();

      return;
    }

    refreshAttempted = true;
    refreshing = true;

    void import("@shared/api-client/token-refresh")
      .then(({ refreshAccessToken }) => refreshAccessToken())
      .then(() => {
        refreshing = false;

        if (!disposed) {
          lastToken = getAccessToken();
          reconnect();
        }
      })
      .catch(() => {
        refreshing = false;

        if (!disposed) {
          giveUp();
        }
      });
  };

  const onRoleChanged = (event: RoleChangedEvent): void => callbacks.onRoleChanged(event);

  const onTokens = (snapshot: TokenSnapshot): void => {
    const token = snapshot.accessToken;

    if (!token || token === lastToken) {
      return;
    }

    lastToken = token;

    // The auth_error path reconnects by itself once its refresh settles.
    if (refreshing) {
      return;
    }

    if (gaveUp) {
      gaveUp = false;
      socket.connect();

      return;
    }

    if (socket.connected) {
      socket.emit("authenticate", { token });
    }
  };

  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  socket.on("authenticated", onAuthenticated);
  socket.on("auth_error", onAuthError);
  socket.on("user:role-changed", onRoleChanged);

  const unsubscribeTokens = subscribeTokens(onTokens);

  const teardown = (): void => {
    disposed = true;
    unsubscribeTokens();
    socket.off("connect", onConnect);
    socket.off("disconnect", onDisconnect);
    socket.off("authenticated", onAuthenticated);
    socket.off("auth_error", onAuthError);
    socket.off("user:role-changed", onRoleChanged);
    socket.disconnect();
  };

  return { socket, teardown };
}

export type RealtimeProviderProps = {
  children: ReactNode
};

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { status: sessionStatus, user, handleRoleChanged } = useSession();
  const [socket, setSocket] = useState<RealtimeSocket | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const roleChangedRef = useRef(handleRoleChanged);
  const active = sessionStatus === "authenticated";
  const identity = user ? `${user.id}:${user.role}` : null;
  const identityRef = useRef(identity);

  useLayoutEffect(() => {
    roleChangedRef.current = handleRoleChanged;
  });

  useEffect(() => {
    if (!active) {
      return;
    }

    let disposed = false;
    let managed: ManagedSocket | null = null;

    void import("socket.io-client")
      .then(({ io }) => {
        if (disposed) {
          return;
        }

        managed = createManagedSocket(io, {
          onStatus: setStatus,
          onRoleChanged: (event) => {
            void roleChangedRef.current(event);
          },
        });
        setSocket(managed.socket);
        managed.socket.connect();
      })
      .catch(() => {
        if (!disposed) {
          setStatus("disconnected");
        }
      });

    return () => {
      disposed = true;
      managed?.teardown();
      setSocket(null);
      setStatus("idle");
    };
  }, [active]);

  useEffect(() => {
    if (identityRef.current === identity) {
      return;
    }

    identityRef.current = identity;

    // The server only adds rooms on authenticate; a fresh connection drops the previous user/role rooms.
    if (socket?.connected) {
      socket.disconnect();
      socket.connect();
    }
  }, [identity, socket]);

  const value = useMemo<RealtimeContextValue>(() => ({ socket, status }), [socket, status]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
