/*
* Funcionalidad: useFocusMode
* Descripción: Focus mode of the global toasts. While at least one mounted component calls useFocusMode(true) (an exam attempt, an EXAM simulation, the live ventilator console), ToastProvider drops the toasts queued with `{ notice: true }` (server notices such as a new notification); user-action toasts (errors, confirmations) still show. Reference-counted: nested or parallel callers each hold one claim and release it on unmount or when `active` turns false. Without a ToastProvider it does nothing. Depends on React.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useContext, useEffect } from "react";

export type FocusModeApi = {
  // Takes one focus claim; the returned function releases it (idempotent).
  acquire: () => () => void
};

export const FocusModeContext = createContext<FocusModeApi | null>(null);

export function useFocusMode(active: boolean = true): void {
  const acquire = useContext(FocusModeContext)?.acquire;

  useEffect(() => (active && acquire ? acquire() : undefined), [active, acquire]);
}
