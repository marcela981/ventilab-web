/*
* Funcionalidad: WorkspaceSessionRunner
* Descripción: Runs the active digital session of the /simulador workspace: a SimSessionHost of the simulator feature
*   plus a bridge that lifts the host value to the WorkspaceSessionProvider before paint. Lives in its own module so
*   the provider loads it through a dynamic import: the session runtime (worker host, console binding, console) stays
*   out of the initial /simulador chunk (DISENO_BLOQUE1 §2.5). Depends on React and the simulator session entry point.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useLayoutEffect } from "react";
import { SimSessionHost, useSimSessionHost } from "@features/simulator/session.entry";
import type { SimSessionHostDeps, SimSessionHostValue } from "@features/simulator/session.entry";

/** Reads the host context and lifts it before paint; renders nothing. */
function HostBridge({ onValue }: { onValue: (value: SimSessionHostValue | null) => void }) {
  const value = useSimSessionHost();

  useLayoutEffect(() => {
    onValue(value);
  }, [onValue, value]);

  useLayoutEffect(() => () => onValue(null), [onValue]);

  return null;
}

export type WorkspaceSessionRunnerProps = {
  sessionId: string
  onEnded: (sessionId: string) => void
  onValue: (value: SimSessionHostValue | null) => void
  deps?: SimSessionHostDeps | undefined
};

export function WorkspaceSessionRunner({ sessionId, onEnded, onValue, deps }: WorkspaceSessionRunnerProps) {
  return (
    <SimSessionHost sessionId={sessionId} onEnded={onEnded} deps={deps}>
      <HostBridge onValue={onValue} />
    </SimSessionHost>
  );
}
