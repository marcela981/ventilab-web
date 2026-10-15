/*
* Funcionalidad: OptionLabel
* Descripción: Label of one choice option: its text and, when the option carries an image, the image with an alt text taken from the option text. Never shows correctness (that belongs to the result page). Depends on the evaluation entities and the questions CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import type { AttemptOption } from "../../entities/evaluation.entity";
import styles from "../../../UI/questions.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
const OPTION_IMAGE_ALT = (content: string) => (content.trim() === "" ? "Imagen de la opción" : `Imagen de la opción: ${content}`);

export function OptionLabel({ option }: { option: AttemptOption }) {
  return (
    <span className={cx(styles.optionLabel)}>
      {option.content ? <span>{option.content}</span> : null}
      {option.media?.kind === "IMAGE" ? (
        // Signed storage URLs from the backend; next/image would need a remote host config.
        // eslint-disable-next-line @next/next/no-img-element
        <img className={cx(styles.optionImage)} src={option.media.url} alt={OPTION_IMAGE_ALT(option.content)} loading="lazy" />
      ) : null}
    </span>
  );
}
