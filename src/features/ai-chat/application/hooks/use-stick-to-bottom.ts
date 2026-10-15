/*
* Funcionalidad: useStickToBottom
* Descripción: Auto-scroll of a chat thread. While the reader is at the bottom (within STICK_THRESHOLD_PX) every change of the watched value (the streamed text, a new message) scrolls the container to its end; once the reader scrolls up the position is left alone and `isPinned` turns false, so the panel can offer "Ir al final" (scrollToBottom pins it again). Depends on React.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

// Distance from the end that still counts as "at the bottom".
export const STICK_THRESHOLD_PX = 48;

export type StickToBottom = {
  onScroll: () => void
  isPinned: boolean
  scrollToBottom: () => void
};

// `ref` is the scroll container; `watched` changes whenever the content grows.
export function useStickToBottom(ref: RefObject<HTMLElement | null>, watched: unknown): StickToBottom {
  const pinnedRef = useRef(true);
  const [isPinned, setIsPinned] = useState(true);

  const onScroll = useCallback(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= STICK_THRESHOLD_PX;

    pinnedRef.current = atBottom;
    setIsPinned(atBottom);
  }, [ref]);

  useLayoutEffect(() => {
    const element = ref.current;

    if (element && pinnedRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [ref, watched]);

  const scrollToBottom = useCallback(() => {
    const element = ref.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }

    pinnedRef.current = true;
    setIsPinned(true);
  }, [ref]);

  return { onScroll, isPinned, scrollToBottom };
}
