/*
* Funcionalidad: WorkspaceSessionProvider
* Descripción: Owner of the active digital session of the /simulador workspace, mounted ABOVE the tabs (DISENO_BLOQUE1
*   §2.4 and §3) so the session worker, its event outbox and its tab claim survive every tab switch. The active session
*   lives in the URL (`?session=<id>`, read once the router is ready). While there is one, a SimSessionHost of the
*   simulator feature runs it as a sibling of the panels (never around them, so starting or clearing a session never
*   remounts a panel) and a bridge lifts the host value into this context. `start(session)` (W8 "Enviar") sets
*   `?session=` and opens Monitoreo; a successful "Finalizar sesión" stays on /simulador and records the ended session
*   (`endedSessionId`) for the result dialog; `clear()` drops `?session=` and the ended mark. High-frequency data never
*   goes through this context (the console reads the session store). Depends on next/router, React and the simulator
*   session entry point.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SimSessionHost, useSimSessionHost } from "@features/simulator/session.entry";
import type { SimSessionHostDeps, SimSessionHostValue } from "@features/simulator/session.entry";
import type { WorkspaceTab } from "../entities/workspace-tab.entity";

const MONITORING_TAB: WorkspaceTab = "monitoreo";

/** What a start needs: the id of the session the server just created. */
export type WorkspaceSessionStart = { id: string };

export type WorkspaceSessionValue = {
  /** Active session (`?session=`); null without one or before the router is ready. */
  sessionId: string | null
  /** The running session host; null without a session (or for one render after it changes). */
  host: SimSessionHostValue | null
  /** The session that ended here and whose result is on screen; null otherwise. */
  endedSessionId: string | null
  /** Opens a just started session in Monitoreo (sets `?session=` and `?tab=monitoreo`). */
  start: (session: WorkspaceSessionStart) => void
  /** Drops the active session from the URL and closes its result. */
  clear: () => void
};

const WorkspaceSessionContext = createContext<WorkspaceSessionValue | null>(null);

export function useWorkspaceSession(): WorkspaceSessionValue {
  const value = useContext(WorkspaceSessionContext);

  if (value === null) {
    throw new Error("useWorkspaceSession must be used inside a WorkspaceSessionProvider");
  }

  return value;
}

/** Reads the host context and lifts it before paint; renders nothing. */
function HostBridge({ onValue }: { onValue: (value: SimSessionHostValue | null) => void }) {
  const value = useSimSessionHost();

  useLayoutEffect(() => {
    onValue(value);
  }, [onValue, value]);

  useLayoutEffect(() => () => onValue(null), [onValue]);

  return null;
}

function sessionOf(query: Record<string, string | string[] | undefined>): string | null {
  const value = query.session;

  return typeof value === "string" && value.length > 0 ? value : null;
}

export type WorkspaceSessionProviderProps = {
  /** Injectable session dependencies (tests: worker factory, HTTP calls, tab claim). */
  deps?: SimSessionHostDeps | undefined
  children: ReactNode
};

export function WorkspaceSessionProvider({ deps, children }: WorkspaceSessionProviderProps) {
  const router = useRouter();
  const sessionId = router.isReady ? sessionOf(router.query) : null;
  const [lifted, setLifted] = useState<SimSessionHostValue | null>(null);
  const [endedSessionId, setEndedSessionId] = useState<string | null>(null);
  // A value lifted by the host of a previous session is never shown for the current one.
  const host = lifted !== null && lifted.sessionId === sessionId ? lifted : null;

  const replaceQuery = useCallback((query: Record<string, string | string[] | undefined>) => {
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [router]);

  const start = useCallback((session: WorkspaceSessionStart) => {
    setEndedSessionId(null);
    replaceQuery({ ...router.query, session: session.id, tab: MONITORING_TAB });
  }, [replaceQuery, router.query]);

  const clear = useCallback(() => {
    const rest = Object.fromEntries(Object.entries(router.query).filter(([key]) => key !== "session"));

    setEndedSessionId(null);
    replaceQuery(rest);
  }, [replaceQuery, router.query]);

  // Replaces the host's navigation to the result page: the workspace shows the result in place.
  const onEnded = useCallback((ended: string) => {
    setEndedSessionId(ended);
  }, []);

  const value = useMemo<WorkspaceSessionValue>(() => ({
    sessionId,
    host,
    endedSessionId: endedSessionId !== null && endedSessionId === sessionId ? endedSessionId : null,
    start,
    clear,
  }), [clear, endedSessionId, host, sessionId, start]);

  return (
    <WorkspaceSessionContext.Provider value={value}>
      {sessionId ? (
        <SimSessionHost key={sessionId} sessionId={sessionId} onEnded={onEnded} deps={deps}>
          <HostBridge onValue={setLifted} />
        </SimSessionHost>
      ) : null}
      {children}
    </WorkspaceSessionContext.Provider>
  );
}
