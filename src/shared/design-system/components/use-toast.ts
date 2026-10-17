/*
* Funcionalidad: useToast
* Descripción: Global toast API of the new code: `toast.success | error | info(message, { autoHideMs })` queues a message on the single Snackbar mounted by ToastProvider (pages/_app.js). Success and info hide after 6 s by default, errors stay until the user closes them (`autoHideMs: null`). Holds the React context shared with ToastProvider; useToast throws outside the provider. Depends on React. v1.1 (O1): `notice: true` marks a server notice (for example a new notification); ToastProvider drops it while focus mode is active (useFocusMode), user-action toasts are never dropped.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useContext } from "react";

export type ToastSeverity = "success" | "error" | "info";

export type ToastOptions = {
  // Milliseconds before the toast hides; null keeps it until the user closes it.
  autoHideMs?: number | null
  // A server notice, not the result of a user action: dropped while focus mode is active.
  notice?: boolean
};

export type ToastApi = {
  success: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
  info: (message: string, options?: ToastOptions) => void
};

export const DEFAULT_AUTO_HIDE_MS: Readonly<Record<ToastSeverity, number | null>> = {
  success: 6000,
  info: 6000,
  error: null,
};

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);

  if (!api) {
    throw new Error("useToast must be used inside a ToastProvider.");
  }

  return api;
}
