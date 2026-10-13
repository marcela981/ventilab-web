/*
* Funcionalidad: AuthProvider (backend session)
* Descripción: Owns the backend session for new code. A backend session exists only when token-storage holds BOTH tokens (a lone `ventilab_auth_token` is the legacy NextAuth bridge token and is left alone). On mount it loads `GET /api/auth/me` (slow route) or settles as unauthenticated without a request. Exposes establishSession (store tokens + load /me), best-effort signOut (`POST /api/auth/logout`, then always clears both tokens and the typed SWR entries), reloadSession and handleRoleChanged (single-flight refresh + reload /me for the current user). Follows token-storage changes (including other tabs) and the api-client `session-expired` event; ending the session is idempotent and never navigates (guards redirect). The request layer and the refresh module are imported lazily so the app shell does not ship axios. Depends on react, swr and the api-client modules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useSWRConfig } from "swr";
import { ApiError, CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import { onAuthEvent } from "@shared/api-client/auth-events";
import { isApiQueryKey } from "@shared/api-client/swr-config";
import { clearTokens, getTokens, saveTokens, subscribeTokens } from "@shared/api-client/token-storage";
import type { TokenSnapshot } from "@shared/api-client/token-storage";
import type { Permission, Role, RoleChangedEvent, SessionStatus, SessionTokens, SessionUser } from "./session.entity";
import { SessionContext } from "./session-context";
import type { SessionContextValue } from "./session-context";

type SessionState = {
  status: SessionStatus
  user: SessionUser | null
  permissions: readonly Permission[]
  error: ApiError | null
};

type InFlightLoad = {
  loadId: number
  accessToken: string
  promise: Promise<SessionUser>
};

const LOADING: SessionState = { status: "loading", user: null, permissions: [], error: null };
const UNAUTHENTICATED: SessionState = { status: "unauthenticated", user: null, permissions: [], error: null };

// /me answers meaning the stored tokens no longer identify an active user.
const SESSION_REJECTED_STATUSES = new Set([401, 403, 404]);

function hasBackendSession(snapshot: TokenSnapshot): snapshot is { accessToken: string, refreshToken: string } {
  return Boolean(snapshot.accessToken && snapshot.refreshToken);
}

function noSessionError(): ApiError {
  return new ApiError({ code: CLIENT_ERROR_CODES.sessionExpired, message: "There is no active session", status: 401 });
}

export type AuthProviderProps = {
  children: ReactNode
};

export function AuthProvider({ children }: AuthProviderProps) {
  const { mutate } = useSWRConfig();
  const [state, setState] = useState<SessionState>(LOADING);
  const stateRef = useRef(state);
  const loadIdRef = useRef(0);
  const inFlightRef = useRef<InFlightLoad | null>(null);
  // Refresh token of the loaded session: a refresh keeps it, a new login (any tab) replaces it.
  const sessionRefreshTokenRef = useRef<string | null>(null);

  const commit = useCallback((next: SessionState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const clearSessionCache = useCallback(() => {
    void mutate(isApiQueryKey, undefined, { revalidate: false });
  }, [mutate]);

  const endSession = useCallback(() => {
    loadIdRef.current += 1;
    inFlightRef.current = null;
    sessionRefreshTokenRef.current = null;

    const current = stateRef.current;

    if (current.status === "unauthenticated" && current.error === null) {
      return;
    }

    commit(UNAUTHENTICATED);
    clearSessionCache();
  }, [commit, clearSessionCache]);

  const loadUser = useCallback((): Promise<SessionUser> => {
    const tokens = getTokens();

    if (!hasBackendSession(tokens)) {
      endSession();

      return Promise.reject(noSessionError());
    }

    if (inFlightRef.current?.accessToken === tokens.accessToken) {
      return inFlightRef.current.promise;
    }

    loadIdRef.current += 1;
    const loadId = loadIdRef.current;

    if (stateRef.current.status !== "authenticated" && stateRef.current !== LOADING) {
      commit(LOADING);
    }

    const promise = (async(): Promise<SessionUser> => {
      try {
        const { apiGet } = await import("@shared/api-client/api-request");
        const { data } = await apiGet("/api/auth/me");

        if (loadId === loadIdRef.current) {
          const previousUserId = stateRef.current.user?.id;

          sessionRefreshTokenRef.current = tokens.refreshToken;
          commit({ status: "authenticated", user: data.user, permissions: data.permissions, error: null });

          if (previousUserId && previousUserId !== data.user.id) {
            clearSessionCache();
          }
        }

        return data.user;
      } catch (caught) {
        const error = toApiError(caught);

        if (loadId === loadIdRef.current) {
          if (SESSION_REJECTED_STATUSES.has(error.status)) {
            clearTokens();
            commit({ ...UNAUTHENTICATED, error });
          } else if (stateRef.current.status !== "authenticated") {
            // Server or network failure (e.g. backend cold start): keep the tokens for a later reload.
            commit({ ...UNAUTHENTICATED, error });
          }
        }

        throw error;
      } finally {
        if (inFlightRef.current?.loadId === loadId) {
          inFlightRef.current = null;
        }
      }
    })();

    inFlightRef.current = { loadId, accessToken: tokens.accessToken, promise };

    return promise;
  }, [commit, clearSessionCache, endSession]);

  useEffect(() => {
    const handleTokens = (snapshot: TokenSnapshot) => {
      if (!hasBackendSession(snapshot)) {
        endSession();

        return;
      }

      const isSameLogin = snapshot.refreshToken === sessionRefreshTokenRef.current;

      if (stateRef.current.status === "authenticated" && isSameLogin) {
        return;
      }

      loadUser().catch(() => undefined);
    };

    const unsubscribeTokens = subscribeTokens(handleTokens);
    const unsubscribeEvents = onAuthEvent((event) => {
      if (event.type === "session-expired") {
        endSession();
      }
    });

    if (hasBackendSession(getTokens())) {
      loadUser().catch(() => undefined);
    } else {
      endSession();
    }

    return () => {
      unsubscribeTokens();
      unsubscribeEvents();
    };
  }, [endSession, loadUser]);

  const establishSession = useCallback((tokens: SessionTokens): Promise<SessionUser> => {
    saveTokens(tokens.accessToken, tokens.refreshToken);

    return loadUser();
  }, [loadUser]);

  const signOut = useCallback(async(): Promise<void> => {
    if (hasBackendSession(getTokens())) {
      try {
        const { apiPost } = await import("@shared/api-client/api-request");

        await apiPost("/api/auth/logout");
      } catch {
        // Best effort: tokens are stateless, so discarding them locally is the actual logout.
      }
    }

    clearTokens();
    endSession();
  }, [endSession]);

  const reloadSession = useCallback(
    (): Promise<SessionUser | null> => loadUser().catch(() => null),
    [loadUser],
  );

  const handleRoleChanged = useCallback(async(event: RoleChangedEvent): Promise<boolean> => {
    if (stateRef.current.user?.id !== event.userId) {
      return false;
    }

    try {
      const { refreshAccessToken } = await import("@shared/api-client/token-refresh");

      await refreshAccessToken();
      await loadUser();

      return true;
    } catch {
      return false;
    }
  }, [loadUser]);

  const value = useMemo<SessionContextValue>(() => {
    const role = state.user?.role ?? null;

    return {
      status: state.status,
      user: state.user,
      role,
      permissions: state.permissions,
      error: state.error,
      hasRole: (...roles: Role[]) => role !== null && roles.includes(role),
      hasPermission: (permission: Permission) => state.permissions.includes(permission),
      establishSession,
      signOut,
      reloadSession,
      handleRoleChanged,
    };
  }, [state, establishSession, signOut, reloadSession, handleRoleChanged]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
