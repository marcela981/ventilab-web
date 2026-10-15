/*
* Funcionalidad: CopyMessageButton
* Descripción: "Copiar" action of a complete assistant answer: writes the answer text to the clipboard (navigator.clipboard.writeText) and confirms with "Copiado" for a few seconds (or "No se pudo copiar" when the clipboard is unavailable or refused); the label change is announced through a polite live region. Depends on React, MUI and the chat panel CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Button from "@mui/material/Button";
import { useEffect, useRef, useState } from "react";
import { cx } from "@shared/lib/class-names";
import styles from "../../UI/chat-panel.module.css";

// TODO(i18n): move to an ai-chat namespace in src/i18n.
export const COPY_BUTTON_COPY = {
  copy: "Copiar",
  copied: "Copiado",
  failed: "No se pudo copiar",
} as const;

const FEEDBACK_MS = 2000;

type CopyState = "idle" | "copied" | "failed";

export type CopyMessageButtonProps = {
  text: string
};

export function CopyMessageButton({ text }: CopyMessageButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const copy = async() => {
    let next: CopyState = "failed";

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        next = "copied";
      }
    } catch {
      next = "failed";
    }

    setState(next);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => setState("idle"), FEEDBACK_MS);
  };

  const label = state === "copied" ? COPY_BUTTON_COPY.copied : COPY_BUTTON_COPY.copy;

  return (
    <>
      <Button
        size="small"
        color="inherit"
        startIcon={state === "copied" ? <CheckIcon /> : <ContentCopyIcon />}
        onClick={() => void copy()}
      >
        {label}
      </Button>
      <span className={cx(styles.visuallyHidden)} aria-live="polite">
        {state === "idle" ? "" : (state === "copied" ? COPY_BUTTON_COPY.copied : COPY_BUTTON_COPY.failed)}
      </span>
      {state === "failed" ? <span className={cx(styles.copyError)}>{COPY_BUTTON_COPY.failed}</span> : null}
    </>
  );
}
