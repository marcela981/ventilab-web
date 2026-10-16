/*
* Funcionalidad: useExamDeadline
* Descripción: Countdown to the exam attempt deadline in the EXAM console (T9). It reads the time left on the server
*   clock (client clock + the server offset measured when the practical part started) once per DEADLINE_TICK_MS and
*   calls `onExpire` exactly once when it reaches zero (also at once when the deadline has already passed). Returns
*   the milliseconds left, or null without a deadline. The clock is injectable for tests. Depends on React, the exam
*   entities and config.
*   v1.1 (review of eb3c21b): a background tab throttles the interval, so the hook also ticks when the tab becomes
*   visible (`visibilitychange`) and keeps one `setTimeout` armed for the exact time left (re-armed on every tick), so
*   the expiry does not wait for the next interval tick.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useRef, useState } from "react";
import { DEADLINE_TICK_MS } from "../config/sim-exam.config";
import { deadlineRemainingMs } from "../entities/sim-exam.entity";

export type UseExamDeadlineOptions = {
  /** ISO deadline; null (FREE, or unknown) disables the countdown. */
  deadline: string | null
  serverOffsetMs?: number | undefined
  onExpire: () => void
  now?: (() => number) | undefined
};

export function useExamDeadline({ deadline, serverOffsetMs = 0, onExpire, now }: UseExamDeadlineOptions): number | null {
  const [remaining, setRemaining] = useState<{ deadline: string, ms: number } | null>(null);
  const onExpireRef = useRef(onExpire);
  const nowRef = useRef(now);

  useEffect(() => {
    onExpireRef.current = onExpire;
    nowRef.current = now;
  });

  useEffect(() => {
    if (deadline === null) {
      return undefined;
    }

    let expired = false;
    let exact: ReturnType<typeof setTimeout> | null = null;

    const tick = (): void => {
      const ms = deadlineRemainingMs(deadline, (nowRef.current ?? Date.now)(), serverOffsetMs);

      if (ms === null) {
        return;
      }

      setRemaining({ deadline, ms });

      if (exact !== null) {
        clearTimeout(exact);
        exact = null;
      }

      if (ms <= 0) {
        if (!expired) {
          expired = true;
          onExpireRef.current();
        }

        return;
      }

      // One timer for the exact time left, so the expiry never waits for the next interval tick.
      exact = setTimeout(tick, ms);
    };

    const onVisibility = (): void => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };

    tick();

    const handle = setInterval(tick, DEADLINE_TICK_MS);

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(handle);

      if (exact !== null) {
        clearTimeout(exact);
      }

      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [deadline, serverOffsetMs]);

  return deadline !== null && remaining?.deadline === deadline ? remaining.ms : null;
}
