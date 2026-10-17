/*
* Funcionalidad: useVentilatorRoom
* Descripción: Joins the ventilator room of the backend for the live console: emits `ventilator:join` (payload ignored by the backend) through the shared useEmitOnAuthenticated on every authenticated connection (first one and every reconnect, since rooms belong to the connection) and again when the reservation changes. The backend joins the holder (user or group member) to the `ventilator` room, lets teachers and admins receive through their role room, and answers anyone else with `ventilator:join-rejected {reason}`; the rejection of the current reservation and connection is returned (cleared by a new reservation or a reconnect). Disabled → nothing is emitted (callers that may not see the console never join). v1.1 (T6 review fix W3): a rejection is attributed to the reservation of the last join actually SENT (recorded by the shared onEmit), not to the reservation of the current render, so a late rejection of reservation A never marks reservation B; the payload carries no reservation id, so a rejection of A arriving after the join of B was sent cannot be told apart (socket.io keeps the order, which makes it unlikely). Depends on React and the shared realtime hooks.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRef, useState } from "react";
import { useEmitOnAuthenticated, useSocket, useSocketEvent } from "@shared/realtime";
import type { RealtimeStatus } from "@shared/realtime";

export type UseVentilatorRoomOptions = {
  enabled: boolean
  /** The active reservation: a new one re-sends the join. */
  reservationId: string | null
};

export type VentilatorRoomState = {
  /** Backend reason of the last rejection for this reservation and connection, or null. */
  rejectedReason: string | null
};

type Rejection = { reservationId: string | null, reason: string };

export function useVentilatorRoom({ enabled, reservationId }: UseVentilatorRoomOptions): VentilatorRoomState {
  const { status } = useSocket();
  const [rejection, setRejection] = useState<Rejection | null>(null);
  const [seenStatus, setSeenStatus] = useState<RealtimeStatus>(status);

  // A new connection re-sends the join: a rejection of the previous one no longer applies.
  if (seenStatus !== status) {
    setSeenStatus(status);
    setRejection(null);
  }

  // Reservation of the last join sent on this connection (undefined: none sent yet).
  const sentForRef = useRef<string | null | undefined>(undefined);

  useEmitOnAuthenticated("ventilator:join", {
    enabled,
    trigger: reservationId,
    onEmit: () => {
      sentForRef.current = reservationId;
    },
  });

  useSocketEvent("ventilator:join-rejected", (event) => {
    if (enabled && sentForRef.current !== undefined) {
      setRejection({ reservationId: sentForRef.current, reason: event.reason });
    }
  });

  return { rejectedReason: enabled && rejection?.reservationId === reservationId ? rejection.reason : null };
}
