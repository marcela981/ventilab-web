/*
* Funcionalidad: HintToggle
* Descripción: July "Pista 💡" / "Ocultar pista" of a WORKSHOP question (DISENO_BLOQUE3 §2.3): a text button (aria-expanded, aria-controls) that shows or hides the hint written by the teacher. Renders nothing without a hint; never falls back to the explanation (in July that gave the answer away). The page hides it once the answer is revealed. Depends on React, MUI Button, the attempt layout copy and the questions CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import { useId, useState } from "react";
import { cx } from "@shared/lib/class-names";
import { FEEDBACK_COPY } from "../../entities/attempt-layout";
import styles from "../../../UI/questions.module.css";

export type HintToggleProps = {
  hint: string | null
};

export function HintToggle({ hint }: HintToggleProps) {
  const [open, setOpen] = useState(false);
  const hintId = useId();

  if (!hint) {
    return null;
  }

  return (
    <div className={cx(styles.hint)}>
      <Button variant="text" size="small" aria-expanded={open} aria-controls={hintId} onClick={() => setOpen((value) => !value)}>
        {open ? FEEDBACK_COPY.hintHide : FEEDBACK_COPY.hintShow}
      </Button>
      <p id={hintId} className={cx(styles.hintBox)} hidden={!open} aria-label={FEEDBACK_COPY.hintLabel}>
        {hint}
      </p>
    </div>
  );
}
