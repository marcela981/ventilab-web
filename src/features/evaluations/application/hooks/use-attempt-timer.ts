/*
* Funcionalidad: useAttemptTimer
* Descripción: React binding of the attempt countdown. When the attempt has a deadline it starts startAttemptTimer with serverNow and the client clock read when the effect runs (right after the attempt response), exposes the remaining milliseconds for the header clock, shows one toast at 5 minutes and one at 1 minute (each once for the lifetime of the player, even if the timer restarts after a revalidation) and calls onExpire once at zero. Without a deadline it returns null and starts nothing. Depends on the attempt timer entity and the design-system toast. v1.1 (E2 review): the client clock paired with serverNow is the arrival time of the response that carried it (attempt response clock, keyed by attemptId and serverNow), falling back to the effect time only when unknown; a fresh response changes serverNow and restarts the timer with the new offset.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useRef, useState } from "react";
import { useToast } from "@shared/design-system/components/use-toast";
import { readAttemptResponseTime } from "../entities/attempt-response-clock";
import { MINUTE_MS, startAttemptTimer } from "../entities/attempt-timer";

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const TIMER_WARNINGS = {
  fiveMinutes: "Quedan 5 minutos para terminar el intento.",
  oneMinute: "Queda 1 minuto. Al llegar a cero el intento se enviará automáticamente.",
} as const;

export type UseAttemptTimerOptions = {
  attemptId: string
  deadlineAt: string | null
  serverNow: string
  onExpire: () => void
};

export function useAttemptTimer({ attemptId, deadlineAt, serverNow, onExpire }: UseAttemptTimerOptions): number | null {
  const toast = useToast();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const callbacks = useRef({ toast, onExpire });
  const warned = useRef(new Set<number>());
  const expired = useRef(false);

  useEffect(() => {
    callbacks.current = { toast, onExpire };
  });

  useEffect(() => {
    if (!deadlineAt) {
      return undefined;
    }

    const timer = startAttemptTimer({
      deadlineAt,
      serverNow,
      clientNowAtResponse: readAttemptResponseTime(attemptId, serverNow) ?? Date.now(),
      onTick: setRemainingMs,
      onWarning: (thresholdMs) => {
        if (warned.current.has(thresholdMs)) {
          return;
        }

        warned.current.add(thresholdMs);
        callbacks.current.toast.info(thresholdMs <= MINUTE_MS ? TIMER_WARNINGS.oneMinute : TIMER_WARNINGS.fiveMinutes);
      },
      onExpire: () => {
        if (!expired.current) {
          expired.current = true;
          callbacks.current.onExpire();
        }
      },
    });

    return () => {
      timer.stop();
    };
  }, [attemptId, deadlineAt, serverNow]);

  return deadlineAt ? remainingMs : null;
}
