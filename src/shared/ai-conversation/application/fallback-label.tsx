/*
* Funcionalidad: AiFallbackLabel
* Descripción: Discreet label "Respuesta automática (IA no disponible)" shown next to an answer that the backend produced without a language model (source DETERMINISTIC: no AI provider answered and a rule-based answer was sent instead). Visible text with a decorative info icon, so screen readers read the label with the answer; same muted tone as the "Retroalimentación automática" label of the evaluation feedback. Shared by the tutor answers (Profundizar, Preguntas), the AI assistant and the notes analyses. Depends on MUI icons and the AI conversation CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { cx } from "@shared/lib/class-names";
import styles from "../UI/conversation.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const AI_FALLBACK_LABEL = "Respuesta automática (IA no disponible)";

export type AiFallbackLabelProps = {
  label?: string | undefined
};

export function AiFallbackLabel({ label = AI_FALLBACK_LABEL }: AiFallbackLabelProps) {
  return (
    <p className={cx(styles.fallbackLabel)}>
      <InfoOutlinedIcon className={cx(styles.fallbackIcon)} aria-hidden="true" />
      {label}
    </p>
  );
}
