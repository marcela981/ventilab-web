/*
* Funcionalidad: ToastProvider
* Descripción: Global toast host, mounted once in pages/_app.js: provides the stable useToast API and renders ONE MUI Snackbar + filled Alert for the first message of a FIFO queue. Success/info are role="status" and hide after their duration (6 s by default); errors are role="alert" and stay until closed (close button or Escape; a click elsewhere never closes a toast) or until a newer toast arrives, which replaces the visible error (it closes and the newest message follows, so later feedback never waits behind a stale error). At most 3 messages wait behind the visible one (the oldest pending ones are dropped). The next message shows after the current one finished its exit transition. Depends on React, MUI Snackbar/Alert, use-toast and UI/toast.module.css.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { DEFAULT_AUTO_HIDE_MS, ToastContext } from "./use-toast";
import type { ToastApi, ToastOptions, ToastSeverity } from "./use-toast";
import styles from "./UI/toast.module.css";

type ToastItem = {
  id: number
  severity: ToastSeverity
  message: string
  autoHideMs: number | null
  // Set on a visible error when a newer toast arrives: the error closes and the newest one follows.
  replaced?: boolean
};

const MAX_PENDING_TOASTS = 3;

function enqueue(items: readonly ToastItem[], item: ToastItem): readonly ToastItem[] {
  const [head, ...pending] = items;

  if (!head) {
    return [item];
  }

  if (head.severity === "error") {
    return [{ ...head, replaced: true }, item];
  }

  return [head, ...[...pending, item].slice(-MAX_PENDING_TOASTS)];
}

export type ToastProviderProps = {
  children: ReactNode
};

let nextToastId = 0;

export function ToastProvider({ children }: ToastProviderProps) {
  const [queue, setQueue] = useState<readonly ToastItem[]>([]);
  const [closing, setClosing] = useState(false);
  const current = queue[0];

  const api = useMemo<ToastApi>(() => {
    const push = (severity: ToastSeverity) => (message: string, options: ToastOptions = {}) => {
      nextToastId += 1;

      const item: ToastItem = {
        id: nextToastId,
        severity,
        message,
        autoHideMs: options.autoHideMs === undefined ? DEFAULT_AUTO_HIDE_MS[severity] : options.autoHideMs,
      };

      setQueue((items) => enqueue(items, item));
    };

    return { success: push("success"), error: push("error"), info: push("info") };
  }, []);

  const close = () => setClosing(true);

  const showNext = () => {
    setQueue((items) => items.slice(1));
    setClosing(false);
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {current ? (
        <Snackbar
          key={current.id}
          open={!closing && !current.replaced}
          autoHideDuration={current.autoHideMs}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          onClose={(_event, reason) => {
            if (reason !== "clickaway") {
              close();
            }
          }}
          slotProps={{ transition: { onExited: showNext } }}
        >
          <Alert
            severity={current.severity}
            role={current.severity === "error" ? "alert" : "status"}
            variant="filled"
            onClose={close}
            className={cx(styles.alert)}
          >
            {current.message}
          </Alert>
        </Snackbar>
      ) : null}
    </ToastContext.Provider>
  );
}
