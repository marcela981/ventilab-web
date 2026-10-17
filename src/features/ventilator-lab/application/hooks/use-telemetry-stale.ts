/*
* Funcionalidad: useTelemetryStale
* Descripción: Client-side stale timer of the live telemetry: while enabled (console open and socket authenticated) it reports true when no `ventilator:telemetry` batch arrived for `staleAfterMs` (the platform setting telemetry.staleAfterMs, vendored backend default 2000 ms; the backend uses the same value for its own `ventilator:disconnected {reason: device_stale}`, which may arrive later or be lost). A new batch or `ventilator:connected` clears it and re-arms the timer; disabling and enabling again starts over. One timeout re-armed per batch, no React render while fresh. Depends on React and the shared realtime events.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocketEvent } from "@shared/realtime";

export function useTelemetryStale(staleAfterMs: number, enabled: boolean): boolean {
  const [stale, setStale] = useState(false);
  const [seenEnabled, setSeenEnabled] = useState(enabled);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enabling again starts a fresh wait.
  if (seenEnabled !== enabled) {
    setSeenEnabled(enabled);
    setStale(false);
  }

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const arm = useCallback(() => {
    clear();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setStale(true);
    }, Math.max(0, staleAfterMs));
  }, [clear, staleAfterMs]);

  useEffect(() => {
    if (enabled) {
      arm();
    }

    return clear;
  }, [enabled, arm, clear]);

  const fresh = () => {
    if (enabled) {
      setStale(false);
      arm();
    }
  };

  useSocketEvent("ventilator:telemetry", fresh);
  useSocketEvent("ventilator:connected", fresh);

  return enabled && stale;
}
