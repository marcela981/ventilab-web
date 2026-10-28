/*
* Funcionalidad: Tab list keyboard navigation
* Descripción: Keyboard behaviour of an accessible tab list (WAI-ARIA tabs pattern), extracted from the Bloque 1
*   simulator bottom tabs so /learn reuses it (DISENO_BLOQUE2 §2.1). tabForKey is pure: ArrowRight / ArrowLeft move
*   to the next / previous tab (wrapping around), Home and End to the first and last one. useTabListKeyboard returns
*   the tablist onKeyDown handler (selects the target tab and focuses its button, roving tabindex) and a ref
*   registrar for each tab button. Styling stays in each feature. Depends on React.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRef } from "react";
import type { KeyboardEvent } from "react";

/** Tab reached from `active` with `key`, or null when the key does not navigate. */
export function tabForKey<T extends string>(tabs: readonly T[], active: T, key: string): T | null {
  const index = tabs.indexOf(active);
  const last = tabs.length - 1;
  const targets: Record<string, number> = {
    ArrowRight: index === last ? 0 : index + 1,
    ArrowLeft: index <= 0 ? last : index - 1,
    Home: 0,
    End: last,
  };
  const target = targets[key];

  return target === undefined ? null : (tabs[target] ?? null);
}

export type TabListKeyboard<T extends string> = {
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  registerTab: (tab: T) => (element: HTMLButtonElement | null) => void
};

export function useTabListKeyboard<T extends string>(
  tabs: readonly T[],
  active: T,
  onSelect: (tab: T) => void,
): TabListKeyboard<T> {
  const buttons = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    const next = tabForKey(tabs, active, event.key);

    if (next === null) {
      return;
    }

    event.preventDefault();
    onSelect(next);
    buttons.current[next]?.focus();
  };

  const registerTab = (tab: T) => (element: HTMLButtonElement | null): void => {
    buttons.current[tab] = element;
  };

  return { onKeyDown, registerTab };
}
