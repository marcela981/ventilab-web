/*
* Funcionalidad: useQuestionPager
* Descripción: Accessibility of the paginated attempt layouts (WORKSHOP and EXAM; DISENO_BLOQUE3 §2.12): moves the focus to the h2 of the question every time the current question changes (not on the first render) and handles Alt+← / Alt+→ on the window to go to the previous or next question, ignored inside text fields and at the ends. Returns the ref to attach to the question heading. Depends on React and the attempt layout rules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { pagerShortcut } from "../entities/attempt-layout";

export type UseQuestionPagerOptions = {
  index: number
  total: number
  onIndexChange: (index: number) => void
};

export function useQuestionPager({ index, total, onIndexChange }: UseQuestionPagerOptions): RefObject<HTMLHeadingElement | null> {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const previousIndex = useRef(index);

  useEffect(() => {
    if (previousIndex.current !== index) {
      previousIndex.current = index;
      headingRef.current?.focus();
    }
  }, [index]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = pagerShortcut(event);

      if (direction === null) {
        return;
      }

      const next = direction === "previous" ? index - 1 : index + 1;

      if (next < 0 || next >= total) {
        return;
      }

      event.preventDefault();
      onIndexChange(next);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [index, total, onIndexChange]);

  return headingRef;
}
