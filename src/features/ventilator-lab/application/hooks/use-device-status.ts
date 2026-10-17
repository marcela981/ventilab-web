/*
* Funcionalidad: useDeviceStatus
* Descripción: Online / "sin datos" state of the physical ventilator from the realtime events, without joining the ventilator room: `ventilator:connected` and `ventilator:disconnected` (with reason device_stale or broker_disconnected) are broadcast to every socket by the backend (device-staleness.service), and a `ventilator:telemetry` batch (received only by room members and staff) also proves the device is online. The backend broadcasts only transitions, so before the first event the state is unknown ("sin datos"), except for callers holding system:status (TEACHER, ADMIN), whose initial state comes from the ventilator component of GET /api/system/status, revalidated after a socket reconnect. While the socket is not authenticated, or after it reconnects, events may have been missed, so the state falls back to unknown. v1.1 (T0+T1 review fix): after the socket leaves the authenticated state the seed read before is not trusted (unknown) until its revalidation completes, and a failed revalidation keeps it untrusted. v1.2 (T3 review fix S1): a seed read while the socket was not yet authenticated starts untrusted too. Depends on the session, the shared realtime hooks, the api-client query hook and the lab status service.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useState } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { useSocket, useSocketEvent } from "@shared/realtime";
import type { RealtimeStatus, VentilatorConnectionEvent, VentilatorDisconnectedReason } from "@shared/realtime";
import { useSession } from "@shared/session/use-session";
import { SYSTEM_STATUS_PATH, SYSTEM_STATUS_PERMISSION, ventilatorStatusOf } from "../../api/services/lab-status.service";

export type DeviceNoDataReason = VentilatorDisconnectedReason | "unknown" | "realtime_offline";

export type DeviceStatus =
  | { kind: "online", since: number | null }
  | { kind: "no-data", reason: DeviceNoDataReason, since: number | null };

const UNKNOWN: DeviceStatus = { kind: "no-data", reason: "unknown", since: null };
const REALTIME_OFFLINE: DeviceStatus = { kind: "no-data", reason: "realtime_offline", since: null };

export function useDeviceStatus(): DeviceStatus {
  const { hasPermission } = useSession();
  const { status: realtimeStatus } = useSocket();
  const canSeed = hasPermission(SYSTEM_STATUS_PERMISSION);
  const seed = useApiQuery(canSeed ? SYSTEM_STATUS_PATH : null);
  const [fromEvent, setFromEvent] = useState<DeviceStatus | null>(null);
  const [seenStatus, setSeenStatus] = useState<RealtimeStatus>(realtimeStatus);
  // The seed read before a disconnect may be stale: it is only trusted again after a revalidation completes.
  // A seed read before the first authentication is not trusted either (T3 review fix S1).
  const [seedTrusted, setSeedTrusted] = useState(realtimeStatus === "authenticated");

  // A socket that is not authenticated (or reconnects) may have missed transitions: forget the last event.
  if (seenStatus !== realtimeStatus) {
    setSeenStatus(realtimeStatus);

    if (realtimeStatus !== "authenticated") {
      setFromEvent(null);
      setSeedTrusted(false);
    }
  }

  const { mutate: revalidateSeed } = seed;

  useEffect(() => {
    // Without the permission there is no seed to trust.
    if (realtimeStatus !== "authenticated" || seedTrusted || !canSeed) {
      return;
    }

    let cancelled = false;

    revalidateSeed().then(
      () => {
        if (!cancelled) {
          setSeedTrusted(true);
        }
      },
      () => undefined,
    );

    return () => {
      cancelled = true;
    };
  }, [realtimeStatus, seedTrusted, canSeed, revalidateSeed]);

  const markOnline = useCallback((at: number | null) => {
    setFromEvent((previous) => (previous?.kind === "online" ? previous : { kind: "online", since: at }));
  }, []);

  useSocketEvent("ventilator:connected", (event: VentilatorConnectionEvent) => markOnline(event.at));
  useSocketEvent("ventilator:disconnected", (event: VentilatorConnectionEvent) => {
    setFromEvent({ kind: "no-data", reason: event.reason ?? "unknown", since: event.at });
  });
  useSocketEvent("ventilator:telemetry", (batch) => markOnline(batch.serverTs));

  let status: DeviceStatus;

  if (realtimeStatus !== "authenticated") {
    status = REALTIME_OFFLINE;
  } else if (fromEvent) {
    status = fromEvent;
  } else if (seed.data && seedTrusted && !seed.error) {
    status = ventilatorStatusOf(seed.data.data).online ? { kind: "online", since: null } : UNKNOWN;
  } else {
    status = UNKNOWN;
  }

  return status;
}
