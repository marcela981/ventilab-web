/*
* Funcionalidad: Live lab connection source
* Descripción: Lazily loaded half of LabConnectionProvider (W7-fix, Bloque 1): runs useLabConnectionController (the
*   reservation with relation, the operator control, the room join and the derived FSM), hands every new value to the
*   provider through `onChange` before paint, and renders the blocking modal of an own reservation that ended or was
*   displaced (so it shows on any tab). Living in its own chunk, the controller and what it reaches (the ventilator-lab
*   connection entry with its booking and preemption dialogs, the request layer and axios) stay out of the initial
*   /simulador chunk. Depends on React, the controller hook, the ventilator-lab revoked dialog and the connection
*   value type.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useLayoutEffect } from "react";
import { ControlRevokedDialog } from "@features/ventilator-lab/connection.entry";
import type { LabConnectionValue } from "../entities/lab-connection.entity";
import { useLabConnectionController } from "../hooks/use-lab-connection-controller";

export type LiveLabConnectionSourceProps = {
  /** Receives every new controller value (stable identity between changes). */
  onChange: (value: LabConnectionValue) => void
};

export function LiveLabConnectionSource({ onChange }: LiveLabConnectionSourceProps) {
  const value = useLabConnectionController();

  // Before paint: the tabs never show the placeholder value once the controller runs.
  useLayoutEffect(() => {
    onChange(value);
  }, [onChange, value]);

  return value.revocation ? (
    <ControlRevokedDialog open modal={value.revocation} pending={false} error={null} onAcknowledge={value.acknowledgeRevocation} />
  ) : null;
}
