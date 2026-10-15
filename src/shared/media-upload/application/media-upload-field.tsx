/*
* Funcionalidad: MediaUploadField
* Descripción: Upload control of a media slot (page editor IMAGE, FILE and VIDEO blocks, evaluation question statements and option images): the accepted formats and size limit, a file button ("Subir archivo", or "Reemplazar archivo" once the slot has media) restricted to the MIME types of the accepted kinds, a determinate progress bar with the percentage and "Cancelar subida" while uploading, "Quitar archivo" when the slot has media, and the upload or removal error as an alert (otherwise the caller's validation message). The file input is visually hidden inside the button label so the whole button opens the picker and keeps the accessible name. Depends on MUI, @shared/lib, the media upload entity, the uploader state type and the media upload field CSS Module. v1.1 (C6): the informational note of the upload state (e.g. a removed file kept in the library) as a status message. v1.2 (S1): moved from the content-editor feature to the shared media-upload module with its own CSS Module; it accepts one kind or several (kinds) and an optional copy override (button labels and the progress label), so several fields on one screen keep distinct accessible names. Defaults unchanged.
* Versión: 1.2 (S1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import type { ChangeEvent } from "react";
import { cx } from "@shared/lib/class-names";
import { mediaAccept, mediaHint } from "./media-upload.entity";
import type { MediaKinds } from "./media-upload.entity";
import type { MediaUploadState } from "./use-media-uploader";
import styles from "../UI/media-upload-field.module.css";

// TODO(i18n): move to a media namespace in src/i18n.
export const MEDIA_UPLOAD_COPY = {
  upload: "Subir archivo",
  replace: "Reemplazar archivo",
  remove: "Quitar archivo",
  cancel: "Cancelar subida",
  progress: "Progreso de la subida",
};

export type MediaUploadCopy = typeof MEDIA_UPLOAD_COPY;

const uploading = (percent: number) => `Subiendo… ${percent} %`;

export type MediaUploadFieldProps = {
  kind: MediaKinds
  hasMedia: boolean
  state: MediaUploadState
  validationError: string | null
  copy?: Partial<MediaUploadCopy>
  onSelect: (file: File) => void
  onCancel: () => void
  onRemove: () => void
};

export function MediaUploadField({ kind, hasMedia, state, validationError, copy, onSelect, onCancel, onRemove }: MediaUploadFieldProps) {
  const labels = { ...MEDIA_UPLOAD_COPY, ...copy };
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // Reset so choosing the same file again still fires a change.
    event.target.value = "";

    if (file) {
      onSelect(file);
    }
  };

  const percent = state.progress === null ? 0 : Math.round(state.progress * 100);

  return (
    <div className={cx(styles.uploadSlot)} data-slot="media-upload">
      <p className={cx(styles.note)}>{mediaHint(kind)}</p>
      {state.progress === null ? (
        <div className={cx(styles.uploadActions)}>
          <Button component="label" variant="outlined" size="small" disabled={state.removing}>
            {hasMedia ? labels.replace : labels.upload}
            <input type="file" accept={mediaAccept(kind)} className={cx(styles.fileInput)} onChange={onChange} />
          </Button>
          {hasMedia ? (
            <Button variant="text" color="error" size="small" disabled={state.removing} onClick={onRemove}>
              {labels.remove}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={cx(styles.uploadProgress)}>
          <LinearProgress variant="determinate" value={percent} aria-label={labels.progress} />
          <span className={cx(styles.note)}>{uploading(percent)}</span>
          <Button variant="text" size="small" onClick={onCancel}>{labels.cancel}</Button>
        </div>
      )}
      {state.error ? (
        <p role="alert" className={cx(styles.error)}>{state.error}</p>
      ) : validationError ? <p className={cx(styles.error)}>{validationError}</p> : null}
      {state.info ? <p role="status" className={cx(styles.note)}>{state.info}</p> : null}
    </div>
  );
}
