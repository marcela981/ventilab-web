/*
* Funcionalidad: LabConnectionProvider
* Descripción: Connection to the physical ventilator shared by every tab of the /simulador workspace, mounted ABOVE
*   the tabs (DISENO_BLOQUE1 §2.4 and §3) so leaving Conexión never releases the control. v0.1 (W5) fixes the shape
*   the tabs read (`state` of the connection FSM with the July states, the local `intent`, the last `error` and the
*   `connected` shortcut) with a minimal implementation: there is no reservation source yet, so the state is always
*   NO_RESERVATION and connect/disconnect only record the intent. W7 derives the real state from the reservation, the
*   operator control and the intent (connection-fsm.ts). `value` injects a fixed state (tests, W6 real-mode guide).
*   Depends on React.
*   v0.2 (W7, Bloque 1): the live value comes from useLabConnectionController (reservation with relation, operator
*   control, room join with retry, derived FSM; see lab-connection.entity for the full shape); the blocking modal of an
*   own reservation that ended or was displaced is rendered here, so it shows on any tab. The states and value types
*   moved to connection-fsm and lab-connection.entity (re-exported). A fixed `value` skips every live source. Depends
*   on React, the controller hook, the ventilator-lab revoked dialog and the connection entities.
*   v0.3 (W7-fix, Bloque 1): the controller and the revoked modal moved to LiveLabConnectionSource, loaded lazily, so
*   the initial /simulador chunk no longer carries the ventilator-lab connection entry (booking and preemption
*   dialogs, MUI form fields and popper), the request layer or axios. Until it runs, the tabs read a placeholder value
*   (NO_RESERVATION, socket offline, every action disabled); a chunk that cannot be loaded keeps that placeholder.
*   Depends on React, retry-import, the lazy source and the connection entities.
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, lazy, Suspense, useContext, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { retryImport } from "@shared/lib/retry-import";
import { createLabConnectionValue } from "../entities/lab-connection.entity";
import type { LabConnectionValue } from "../entities/lab-connection.entity";
import type { LiveLabConnectionSourceProps } from "./live-lab-connection-source";

export { LAB_CONNECTION_STATES } from "../entities/connection-fsm";
export type { LabConnectionState } from "../entities/connection-fsm";
export { createLabConnectionValue } from "../entities/lab-connection.entity";
export type { LabConnectionIntent, LabConnectionValue } from "../entities/lab-connection.entity";

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

const NoSource: ComponentType<LiveLabConnectionSourceProps> = () => null;

// The controller (reservation, control, room, dialogs, request layer) loads in its own chunk. If the chunk cannot be
// loaded even after the retries, the workspace keeps working with the placeholder value (no connection actions).
const LiveLabConnectionSource = lazy<ComponentType<LiveLabConnectionSourceProps>>(() =>
  retryImport(() => import("./live-lab-connection-source"))
    .then((module) => ({ default: module.LiveLabConnectionSource }))
    .catch(() => ({ default: NoSource })),
);

// Until the controller runs: no reservation known and every connection action disabled.
const PLACEHOLDER = createLabConnectionValue();

function LiveLabConnection({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<LabConnectionValue | null>(null);

  return (
    <LabConnectionContext.Provider value={live ?? PLACEHOLDER}>
      {children}
      <Suspense fallback={null}>
        <LiveLabConnectionSource onChange={setLive} />
      </Suspense>
    </LabConnectionContext.Provider>
  );
}

export function LabConnectionProvider({ value: fixed, children }: LabConnectionProviderProps) {
  if (fixed) {
    return <LabConnectionContext.Provider value={fixed}>{children}</LabConnectionContext.Provider>;
  }

  return <LiveLabConnection>{children}</LiveLabConnection>;
}
