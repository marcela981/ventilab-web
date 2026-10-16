/*
* Funcionalidad: useSessionBootstrap
* Descripción: Loads what the console needs to run a session: the session store record of this tab (fresh start) or
*   the server replay + state (reload, other tab), through bootstrapSession. Exposes a loading / ready / ended /
*   unavailable state and a retry. A result that arrives after the session id changed or the component unmounted is
*   ignored, and the in-flight request is reused when the effect re-runs for the same key (React StrictMode), so a
*   fresh record is booted once. The fetchers and the store are injectable for tests. Depends on the session bootstrap, the session store
*   and the sessions service. v1.1: also passes the history `startedAt` reader, the event outbox mirror and the
*   wall clock (wall-clock resume, unsent events after a reload).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSessionReplay, fetchSessionStartedAt, fetchSessionState } from "../../api/services/simulation-sessions.service";
import { eventOutbox } from "../session/event-outbox";
import { bootstrapSession } from "../session/session-bootstrap";
import type { BootstrapDeps, BootstrapResult } from "../session/session-bootstrap";
import { sessionStore } from "../session/session-store";

export type SessionBootstrapState = { status: "loading" } | BootstrapResult;

export type UseSessionBootstrapResult = {
  state: SessionBootstrapState
  retry: () => void
};

type Loaded = { key: string, result: BootstrapResult };

export function useSessionBootstrap(sessionId: string | null, deps?: Partial<BootstrapDeps> | undefined): UseSessionBootstrapResult {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const depsRef = useRef(deps);
  const pendingRef = useRef<{ key: string, promise: Promise<BootstrapResult> } | null>(null);
  const key = sessionId ? `${sessionId}#${attempt}` : null;

  useEffect(() => {
    depsRef.current = deps;
  });

  useEffect(() => {
    if (!sessionId || !key) {
      return undefined;
    }

    let active = true;
    const injected = depsRef.current ?? {};

    if (pendingRef.current?.key !== key) {
      pendingRef.current = {
        key,
        promise: bootstrapSession(sessionId, {
          store: injected.store ?? sessionStore,
          fetchReplay: injected.fetchReplay ?? fetchSessionReplay,
          fetchState: injected.fetchState ?? fetchSessionState,
          fetchStartedAt: injected.fetchStartedAt ?? fetchSessionStartedAt,
          outbox: injected.outbox ?? eventOutbox,
          now: injected.now ?? Date.now,
        }),
      };
    }

    void pendingRef.current.promise.then((result) => {
      if (active) {
        setLoaded({ key, result });
      }
    });

    return () => {
      active = false;
    };
  }, [key, sessionId]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const state: SessionBootstrapState = loaded && loaded.key === key ? loaded.result : { status: "loading" };

  return { state, retry };
}
