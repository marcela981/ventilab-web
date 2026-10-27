/*
* Funcionalidad: ReserveNowDialog
* Descripción: "Reservar ahora" of the Conexión tab (W7, Bloque 1): the lab booking dialog in immediate mode (duration
*   15/30/45/60 min, 30 by default; optional purpose; "Para": Para mí, Para mi grupo when the caller leads or supervises
*   a group, Para otro usuario with the user search for an admin; the July reminder to release it). A 409 overlap the
*   staff caller may preempt opens the lab preemption dialog ("Desplazar y reservar"), which resends the immediate
*   request with confirmPreempt. The lab connection hears the request (RESERVING), its success (RESERVED) and its
*   failure (ERROR with the backend message). Mounted only while open, so every field starts fresh. Depends on React,
*   the ventilator-lab connection entry point (dialogs, settings, durations) and the workspace lab connection.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useState } from "react";
import {
  CreateReservationDialog,
  DEFAULT_IMMEDIATE_DURATION,
  IMMEDIATE_DURATIONS,
  PreemptReservationDialog,
  useLabSettings,
} from "@features/ventilator-lab/connection.entry";
import type { CreateReservationRequest, ReservationConflict } from "@features/ventilator-lab/connection.entry";
import { useLabConnection } from "../lab-connection-provider";

type Preemption = { conflict: ReservationConflict, request: CreateReservationRequest };

export type ReserveNowDialogProps = {
  onClose: () => void
};

export function ReserveNowDialog({ onClose }: ReserveNowDialogProps) {
  const { onReserveStart, onReserved, onReserveFailed } = useLabConnection();
  const { settings } = useLabSettings();
  const [preemption, setPreemption] = useState<Preemption | null>(null);

  const created = (reservationId: string | null) => {
    onReserved(reservationId);
    onClose();
  };

  if (preemption) {
    return (
      <PreemptReservationDialog
        open
        conflict={preemption.conflict}
        request={preemption.request}
        settings={settings}
        onClose={onClose}
        onCreated={created}
      />
    );
  }

  return (
    <CreateReservationDialog
      open
      timing="now"
      slotStart={null}
      durations={IMMEDIATE_DURATIONS}
      defaultDuration={DEFAULT_IMMEDIATE_DURATION}
      settings={settings}
      onClose={onClose}
      onCreated={created}
      onSubmitStart={onReserveStart}
      onFailed={onReserveFailed}
      onConflict={(conflict, request) => {
        setPreemption({ conflict, request });

        return true;
      }}
    />
  );
}
