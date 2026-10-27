/*
* Funcionalidad: useVentilatorRoom
* Descripción: Joins the ventilator room of the backend for the live console: emits `ventilator:join` (payload ignored by the backend) through the shared useEmitOnAuthenticated on every authenticated connection (first one and every reconnect, since rooms belong to the connection) and again when the reservation changes. The backend joins the holder (user or group member) to the `ventilator` room, lets teachers and admins receive through their role room, and answers anyone else with `ventilator:join-rejected {reason}`; the rejection of the current reservation and connection is returned (cleared by a new reservation or a reconnect). Disabled → nothing is emitted (callers that may not see the console never join). v1.1 (T6 review fix W3): a rejection is attributed to the reservation of the last join actually SENT (recorded by the shared onEmit), not to the reservation of the current render, so a late rejection of reservation A never marks reservation B; the payload carries no reservation id, so a rejection of A arriving after the join of B was sent cannot be told apart (socket.io keeps the order, which makes it unlikely). Depends on React and the shared realtime hooks.
*   v1.2 (W7, Bloque 1): `attempt` re-sends the join for the same reservation (the /simulador Conexión tab retries a join rejected right after reserving, while the backend refreshes the holders); the rejection carries when it arrived (rejectedAt).
* Versión: 1.2
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
  /** W7: retry counter; a new value re-sends the join for the same reservation (default 0). */
  attempt?: number
};

export type VentilatorRoomState = {
  /** Backend reason of the last rejection for this reservation and connection, or null. */
  rejectedReason: string | null
  /** W7: when that rejection arrived (epoch ms, browser clock), or null. */
  rejectedAt: number | null
};

type Rejection = { joinKey: string, reason: string, at: number };

export function useVentilatorRoom({ enabled, reservationId, attempt = 0 }: UseVentilatorRoomOptions): VentilatorRoomState {
  const { status } = useSocket();
  const [rejection, setRejection] = useState<Rejection | null>(null);
  const [seenStatus, setSeenStatus] = useState<RealtimeStatus>(status);

  // A new connection re-sends the join: a rejection of the previous one no longer applies.
  if (seenStatus !== status) {
    setSeenStatus(status);
    setRejection(null);
  }

  // The reservation and attempt of a join: a new key re-sends it.
  const joinKey = `${reservationId ?? ""}#${attempt}`;
  // Key of the last join sent on this connection (undefined: none sent yet).
  const sentForRef = useRef<string | undefined>(undefined);

  useEmitOnAuthenticated("ventilator:join", {
    enabled,
    trigger: joinKey,
    onEmit: () => {
      sentForRef.current = joinKey;
    },
  });

  useSocketEvent("ventilator:join-rejected", (event) => {
    if (enabled && sentForRef.current !== undefined) {
      setRejection({ joinKey: sentForRef.current, reason: event.reason, at: Date.now() });
    }
  });

  const current = enabled && rejection?.joinKey === joinKey ? rejection : null;

  return { rejectedReason: current?.reason ?? null, rejectedAt: current?.at ?? null };
}
