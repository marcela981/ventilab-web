/*
* Funcionalidad: LabConnectionProvider
* Descripción: Connection to the physical ventilator shared by every tab of the /simulador workspace, mounted ABOVE
*   the tabs (DISENO_BLOQUE1 §2.4 and §3) so leaving Conexión never releases the control. v0.1 (W5) fixes the shape
*   the tabs read (`state` of the connection FSM with the July states, the local `intent`, the last `error` and the
*   `connected` shortcut) with a minimal implementation: there is no reservation source yet, so the state is always
*   NO_RESERVATION and connect/disconnect only record the intent. W7 derives the real state from the reservation, the
*   operator control and the intent (connection-fsm.ts). `value` injects a fixed state (tests, W6 real-mode guide).
*   Depends on React.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

/** States of the July connection FSM (FLUJOS_JULIO b.4 and b.6). */
export const LAB_CONNECTION_STATES = [
  "NO_RESERVATION",
  "RESERVING",
  "RESERVED",
  "CONNECTING",
  "CONNECTED",
  "ERROR",
  "DISCONNECTED",
] as const;

export type LabConnectionState = (typeof LAB_CONNECTION_STATES)[number];

/** What the student asked for locally; the FSM state is derived from it and the server state. */
export type LabConnectionIntent = "idle" | "connect";

export type LabConnectionValue = {
  state: LabConnectionState
  intent: LabConnectionIntent
  /** Last connection error message (Spanish); null without one. */
  error: string | null
  /** Shortcut: the state is CONNECTED. */
  connected: boolean
  connect: () => void
  disconnect: () => void
};

const LabConnectionContext = createContext<LabConnectionValue | null>(null);

export function useLabConnection(): LabConnectionValue {
  const value = useContext(LabConnectionContext);

  if (value === null) {
    throw new Error("useLabConnection must be used inside a LabConnectionProvider");
  }

  return value;
}

export type LabConnectionProviderProps = {
  /** Fixed value (tests); omitted: the provider's own state. */
  value?: LabConnectionValue | undefined
  children: ReactNode
};

export function LabConnectionProvider({ value: fixed, children }: LabConnectionProviderProps) {
  const [intent, setIntent] = useState<LabConnectionIntent>("idle");
  const connect = useCallback(() => setIntent("connect"), []);
  const disconnect = useCallback(() => setIntent("idle"), []);

  const own = useMemo<LabConnectionValue>(() => {
    // No reservation source until W7: the state never leaves NO_RESERVATION.
    const state: LabConnectionState = "NO_RESERVATION";

    return { state, intent, error: null, connected: false, connect, disconnect };
  }, [connect, disconnect, intent]);

  return <LabConnectionContext.Provider value={fixed ?? own}>{children}</LabConnectionContext.Provider>;
}
