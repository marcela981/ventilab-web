/*
* Funcionalidad: TutorAI prompt store
* Descripción: Small viewer-level store that hands a prefilled prompt from the TutorAI popup suggestions to the deepen accordion of the page or to the Preguntas tab (DISENO_BLOQUE2 §2.10 and §3 "Dueños del estado"; replaces July's window CustomEvent 'aiExpansion:openWithPrompt'). One instance per lesson viewer, read with useSyncExternalStore: `request(target, prompt)` publishes a request with a new id, the consumer of that target applies it (prefill, open) and `consume(id)` clears it, so a request is applied once even if the consumer mounts later (lazy chunk). Depends on nothing but the suggestion target type.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { TutorPromptTarget } from "../entities/tutor-suggestions";

export type TutorPromptRequest = {
  id: number
  target: TutorPromptTarget
  prompt: string
};

export type TutorPromptStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => TutorPromptRequest | null
  request: (target: TutorPromptTarget, prompt: string) => void
  // Clears the request with this id (a newer request is kept).
  consume: (id: number) => void
};

export function createTutorPromptStore(): TutorPromptStore {
  const listeners = new Set<() => void>();
  let current: TutorPromptRequest | null = null;
  let nextId = 1;

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => current,
    request(target, prompt) {
      current = { id: nextId, target, prompt };
      nextId += 1;
      notify();
    },
    consume(id) {
      if (current?.id === id) {
        current = null;
        notify();
      }
    },
  };
}
