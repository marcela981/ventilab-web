/*
* Funcionalidad: media-upload public API
* Descripción: Public surface of the shared media upload module: the media library service (upload with progress, signed URL, delete), the client validation rules and limits, the keyed uploader hook, the upload field component and the media error messages.
* Versión: 1.0 (S1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { deleteMedia, getMediaUrl, isUploadCancelled, MEDIA_UPLOAD_TIMEOUT_MS, uploadMedia } from "./api/media.service";
export type { UploadMediaOptions } from "./api/media.service";
export {
  matchMediaKind,
  MEDIA_UPLOAD_LIMITS,
  mediaAccept,
  mediaHint,
  mediaKindOf,
  normalizeMimeType,
  validateMediaFile,
} from "./application/media-upload.entity";
export type { MediaFileInfo, MediaKind, MediaKinds } from "./application/media-upload.entity";
export { getMediaErrorMessage, isMediaInUse, MEDIA_ERROR_MESSAGES, MEDIA_FALLBACK_MESSAGES, MEDIA_IN_USE_CODE } from "./application/media-error-messages";
export { IDLE_MEDIA_UPLOAD, useMediaUploader } from "./application/use-media-uploader";
export type { MediaUploader, MediaUploadHandlers, MediaUploadState, UploadedMedia, UseMediaUploaderOptions } from "./application/use-media-uploader";
export { MEDIA_UPLOAD_COPY, MediaUploadField } from "./application/media-upload-field";
export type { MediaUploadCopy, MediaUploadFieldProps } from "./application/media-upload-field";
