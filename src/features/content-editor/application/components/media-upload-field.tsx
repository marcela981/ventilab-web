/*
* Funcionalidad: MediaUploadField
* Descripción: Upload control of the IMAGE, FILE and VIDEO blocks of the page editor: the accepted formats and size limit, a file button ("Subir archivo", or "Reemplazar archivo" once the block has media) restricted to the MIME types of the kind, a determinate progress bar with the percentage and "Cancelar subida" while uploading, "Quitar archivo" when the block has media, and the upload or removal error as an alert (otherwise the block validation message). The file input is visually hidden inside the button label so the whole button opens the picker and keeps the accessible name. Depends on MUI, @shared/lib, the media upload entity, the media uploads hook types and the page editor CSS Module.
* Versión: 1.0 (C5)
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
import { mediaAccept, mediaHint } from "../entities/media-upload.entity";
import type { MediaKind } from "../entities/media-upload.entity";
import type { MediaUploadState } from "../hooks/use-media-uploads";
import styles from "../../UI/page-editor.module.css";

// TODO(i18n): move to a content-editor namespace in src/i18n.
const COPY = {
  upload: "Subir archivo",
  replace: "Reemplazar archivo",
  remove: "Quitar archivo",
  cancel: "Cancelar subida",
  progress: "Progreso de la subida",
  uploading: (percent: number) => `Subiendo… ${percent} %`,
} as const;

export type MediaUploadFieldProps = {
  kind: MediaKind
  hasMedia: boolean
  state: MediaUploadState
  validationError: string | null
  onSelect: (file: File) => void
  onCancel: () => void
  onRemove: () => void
};

export function MediaUploadField({ kind, hasMedia, state, validationError, onSelect, onCancel, onRemove }: MediaUploadFieldProps) {
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
            {hasMedia ? COPY.replace : COPY.upload}
            <input type="file" accept={mediaAccept(kind)} className={cx(styles.fileInput)} onChange={onChange} />
          </Button>
          {hasMedia ? (
            <Button variant="text" color="error" size="small" disabled={state.removing} onClick={onRemove}>
              {COPY.remove}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={cx(styles.uploadProgress)}>
          <LinearProgress variant="determinate" value={percent} aria-label={COPY.progress} />
          <span className={cx(styles.note)}>{COPY.uploading(percent)}</span>
          <Button variant="text" size="small" onClick={onCancel}>{COPY.cancel}</Button>
        </div>
      )}
      {state.error ? (
        <p role="alert" className={cx(styles.fieldError)}>{state.error}</p>
      ) : validationError ? <p className={cx(styles.fieldError)}>{validationError}</p> : null}
    </div>
  );
}
