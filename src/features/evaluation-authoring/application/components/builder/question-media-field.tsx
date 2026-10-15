/*
* Funcionalidad: QuestionMediaField
* Descripción: Placeholder of the media of a question statement in the builder: shows the media already attached (images inline, videos and files as links; the backend resolves signed URLs) read-only, plus a note that uploading comes later. Task S1 plugs the shared media upload here and sends `mediaIds` with the question PATCH. Depends on @shared/lib, the builder entities, copy and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { BUILDER_COPY } from "../../entities/builder-copy";
import type { BuilderMedia } from "../../entities/evaluation-builder.entity";
import styles from "../../../UI/builder.module.css";

export type QuestionMediaFieldProps = {
  media: readonly BuilderMedia[]
};

export function QuestionMediaField({ media }: QuestionMediaFieldProps) {
  return (
    <div className={cx(styles.subsection)}>
      <span className={cx(styles.fieldLabel)}>{BUILDER_COPY.mediaTitle}</span>
      {media.length > 0 ? (
        <ul className={cx(styles.mediaList)}>
          {media.map((item, position) => (
            <li key={item.mediaId}>
              {item.kind === "IMAGE" ? (
                // Signed storage URLs from the backend; next/image would need a remote host config.
                // eslint-disable-next-line @next/next/no-img-element
                <img className={cx(styles.mediaImage)} src={item.url} alt={BUILDER_COPY.mediaImage(position + 1)} loading="lazy" />
              ) : (
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.kind === "VIDEO" ? BUILDER_COPY.mediaVideo : BUILDER_COPY.mediaFile}
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      <p className={cx(styles.muted)}>{BUILDER_COPY.mediaPending}</p>
    </div>
  );
}
