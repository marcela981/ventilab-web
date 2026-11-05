/*
* Funcionalidad: July console auto apply scheduler
* Descripción: Pure scheduler of the automatic application of the July console edits (DISENO_AJUSTES_A §3.1, A-1, A-4). The per-console pending store stays as a debounce buffer: after every edit the console schedules the application with the kind of input that produced it. Discrete inputs (+/-, arrows, Home/End, the mode toggle, the "Más modos" menu) apply in the same tick (0 ms); continuous inputs (sliders and the wheel) apply AUTO_APPLY_DEBOUNCE_MS.continuous after the last change, so a drag emits one change. A discrete input also applies whatever a continuous one left debouncing. `flush` applies now what is still debouncing (Enter) and `cancel` drops the wait (Esc and unmount; the caller drops the edits). The delays are read at scheduling time, so a host can tune them per source (the real ventilator debounces on its own side). No React, no store: the caller passes the function that applies (it confirms the pending diff through the adapter). v0.1 (Ajustes A, A1): first version. Depends on nothing.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/** Delay between the last edit of each kind of input and its application, in ms (A-1). */
export const AUTO_APPLY_DEBOUNCE_MS = { discrete: 0, continuous: 300 } as const;

/** `discrete`: buttons, keys, the mode toggle and its menu; `continuous`: sliders and the wheel. */
export type AutoApplyInput = keyof typeof AUTO_APPLY_DEBOUNCE_MS;

/** `auto` (July default): edits apply on their own; `confirm`: they wait for Confirmar. */
export type ConsoleApplyMode = "auto" | "confirm";

export type AutoApplyDelays = Readonly<Record<AutoApplyInput, number>>;

export type AutoApplyScheduler = {
  /** An edit of this kind of input just entered the pending store. */
  schedule: (input: AutoApplyInput) => void
  /** Applies now what is still debouncing (Enter); false when nothing was waiting. */
  flush: () => boolean
  /** Drops the wait without applying (Esc); false when nothing was waiting. */
  cancel: () => boolean
  isScheduled: () => boolean
};

export type AutoApplyOptions = {
  /** Applies the pending edits (e.g. confirms the pending diff through the adapter). */
  apply: () => void
  /** Delays per kind of input, read when an edit is scheduled (default AUTO_APPLY_DEBOUNCE_MS). */
  delays?: () => AutoApplyDelays
};

export function createAutoApplyScheduler({ apply, delays = () => AUTO_APPLY_DEBOUNCE_MS }: AutoApplyOptions): AutoApplyScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = (): boolean => {
    if (timer === null) {
      return false;
    }

    clearTimeout(timer);
    timer = null;

    return true;
  };

  const run = (): void => {
    clear();
    apply();
  };

  return {
    schedule(input) {
      const delay = Math.max(0, delays()[input]);

      if (delay === 0) {
        run();

        return;
      }

      clear();
      timer = setTimeout(run, delay);
    },
    flush() {
      if (timer === null) {
        return false;
      }

      run();

      return true;
    },
    cancel: clear,
    isScheduled: () => timer !== null,
  };
}
