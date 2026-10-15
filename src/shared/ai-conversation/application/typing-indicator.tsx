/*
* Funcionalidad: TypingIndicator
* Descripción: "Pensando…" status shown while an AI answer has not sent text yet: a role="status" line (announced once by screen readers) with three animated dots that stay static under prefers-reduced-motion. Depends on the conversation styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import styles from "../UI/conversation.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const TYPING_INDICATOR_LABEL = "Pensando…";

export type TypingIndicatorProps = {
  label?: string
};

export function TypingIndicator({ label = TYPING_INDICATOR_LABEL }: TypingIndicatorProps) {
  return (
    <p className={cx(styles.typing)} role="status">
      <span>{label}</span>
      <span className={cx(styles.dots)} aria-hidden="true">
        <span className={cx(styles.dot)} />
        <span className={cx(styles.dot)} />
        <span className={cx(styles.dot)} />
      </span>
    </p>
  );
}
