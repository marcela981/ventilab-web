/*
* Funcionalidad: EvaluationMediaList
* Descripción: Media attached to a question or a scenario: images render inline with an alt text, videos and files as a link that opens in a new tab (signed URLs from the backend). Renders nothing for an empty list. Depends on the evaluation entities and the questions CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import type { EvaluationMedia } from "../../entities/evaluation.entity";
import styles from "../../../UI/questions.module.css";

// TODO(i18n): move to an evaluations namespace in src/i18n.
const MEDIA_COPY = {
  image: (position: number) => `Imagen ${position} de la pregunta`,
  video: "Ver video adjunto",
  file: "Ver archivo adjunto",
} as const;

export type EvaluationMediaListProps = {
  media: readonly EvaluationMedia[]
  label?: string | undefined
};

export function EvaluationMediaList({ media, label }: EvaluationMediaListProps) {
  if (media.length === 0) {
    return null;
  }

  return (
    <ul className={cx(styles.mediaList)} aria-label={label}>
      {media.map((item, position) => (
        <li key={item.mediaId}>
          {item.kind === "IMAGE" ? (
            // Signed storage URLs from the backend; next/image would need a remote host config.
            // eslint-disable-next-line @next/next/no-img-element
            <img className={cx(styles.mediaImage)} src={item.url} alt={MEDIA_COPY.image(position + 1)} loading="lazy" />
          ) : (
            <a className={cx(styles.mediaLink)} href={item.url} target="_blank" rel="noopener noreferrer">
              {item.kind === "VIDEO" ? MEDIA_COPY.video : MEDIA_COPY.file}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
