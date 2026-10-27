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
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { ControlRevokedDialog } from "@features/ventilator-lab/connection.entry";
import type { LabConnectionValue } from "../entities/lab-connection.entity";
import { useLabConnectionController } from "../hooks/use-lab-connection-controller";

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

function LiveLabConnection({ children }: { children: ReactNode }) {
  const value = useLabConnectionController();

  return (
    <LabConnectionContext.Provider value={value}>
      {children}
      {value.revocation ? (
        <ControlRevokedDialog open modal={value.revocation} pending={false} error={null} onAcknowledge={value.acknowledgeRevocation} />
      ) : null}
    </LabConnectionContext.Provider>
  );
}

export function LabConnectionProvider({ value: fixed, children }: LabConnectionProviderProps) {
  if (fixed) {
    return <LabConnectionContext.Provider value={fixed}>{children}</LabConnectionContext.Provider>;
  }

  return <LiveLabConnection>{children}</LiveLabConnection>;
}
