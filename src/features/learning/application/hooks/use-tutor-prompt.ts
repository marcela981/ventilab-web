/*
* Funcionalidad: useTutorPrompt
* Descripción: React access to the viewer's TutorAI prompt store: TutorPromptContext (the lesson viewer provides one store per viewer), useTutorPromptStore (null outside a viewer, e.g. a panel rendered alone in a test) and useTutorPromptRequest(target), which returns the pending request for that target through useSyncExternalStore (null when there is none or it is for the other target) plus `consume(id)`. Depends on react and the prompt store.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { TutorPromptTarget } from "../entities/tutor-suggestions";
import type { TutorPromptRequest, TutorPromptStore } from "../session/tutor-prompt-store";

export const TutorPromptContext = createContext<TutorPromptStore | null>(null);

export function useTutorPromptStore(): TutorPromptStore | null {
  return useContext(TutorPromptContext);
}

const NO_SUBSCRIPTION = () => () => undefined;
const NO_REQUEST = () => null;

export type TutorPromptRequestState = {
  request: TutorPromptRequest | null
  consume: (id: number) => void
};

export function useTutorPromptRequest(target: TutorPromptTarget): TutorPromptRequestState {
  const store = useTutorPromptStore();
  const snapshot = useSyncExternalStore(store?.subscribe ?? NO_SUBSCRIPTION, store?.getSnapshot ?? NO_REQUEST, NO_REQUEST);
  const consume = useCallback((id: number) => store?.consume(id), [store]);

  return { request: snapshot?.target === target ? snapshot : null, consume };
}
