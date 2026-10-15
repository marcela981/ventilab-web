/*
* Funcionalidad: QuestionMediaField
* Descripción: Media of a question statement in the builder: the attached media in order (images inline, videos and files as links; the backend resolves signed URLs; a media without a resolved URL is listed without preview), each with "Quitar multimedia N", and the shared upload field ("Agregar imagen o video", images and videos) while the question has fewer than 20 media. Uploaded and removed media change the local draft (`mediaIds` goes with the question PATCH on save). Depends on MUI, @shared/lib, @shared/media-upload, the builder entities, copy and CSS Module. v1.1 (S1): uploading and removing replace the read-only placeholder.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import { cx } from "@shared/lib/class-names";
import { MediaUploadField } from "@shared/media-upload";
import type { MediaKind, MediaUploadState } from "@shared/media-upload";
import { BUILDER_COPY } from "../../entities/builder-copy";
import type { BuilderMedia } from "../../entities/evaluation-builder.entity";
import styles from "../../../UI/builder.module.css";

export const STATEMENT_MEDIA_KINDS: readonly MediaKind[] = ["IMAGE", "VIDEO"];

export type QuestionMediaFieldProps = {
  mediaIds: readonly string[]
  media: readonly BuilderMedia[]
  canAdd: boolean
  state: MediaUploadState
  onSelect: (file: File) => void
  onCancel: () => void
  onRemove: (mediaId: string) => void
};

function MediaPreview({ item, position }: { item: BuilderMedia | undefined, position: number }) {
  if (!item || item.url === "") {
    return <span className={cx(styles.muted)}>{BUILDER_COPY.mediaNoPreview}</span>;
  }

  if (item.kind === "IMAGE") {
    // Signed storage URLs from the backend; next/image would need a remote host config.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cx(styles.mediaImage)} src={item.url} alt={BUILDER_COPY.mediaImage(position)} loading="lazy" />;
  }

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer">
      {item.kind === "VIDEO" ? BUILDER_COPY.mediaVideo : BUILDER_COPY.mediaFile}
    </a>
  );
}

export function QuestionMediaField({ mediaIds, media, canAdd, state, onSelect, onCancel, onRemove }: QuestionMediaFieldProps) {
  const byId = new Map(media.map((item) => [item.mediaId, item]));

  return (
    <div className={cx(styles.subsection)}>
      <span className={cx(styles.fieldLabel)}>{BUILDER_COPY.mediaTitle}</span>
      {mediaIds.length > 0 ? (
        <ul className={cx(styles.mediaList)}>
          {mediaIds.map((mediaId, index) => (
            <li key={mediaId} className={cx(styles.mediaItem)}>
              <MediaPreview item={byId.get(mediaId)} position={index + 1} />
              <Button variant="text" color="error" size="small" onClick={() => onRemove(mediaId)}>
                {BUILDER_COPY.mediaRemove(index + 1)}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {canAdd || state.progress !== null ? (
        <MediaUploadField
          kind={STATEMENT_MEDIA_KINDS}
          hasMedia={false}
          state={state}
          validationError={null}
          copy={{ upload: BUILDER_COPY.mediaUpload }}
          onSelect={onSelect}
          onCancel={onCancel}
          // Never shown: this field only adds media; each item has its own remove action.
          onRemove={() => undefined}
        />
      ) : <p className={cx(styles.muted)}>{BUILDER_COPY.mediaLimit}</p>}
    </div>
  );
}
