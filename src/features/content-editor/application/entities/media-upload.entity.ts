/*
* Funcionalidad: Media upload entity
* Descripción: Client rules of the files uploaded from the page editor. The API does not expose its upload limits (POST /api/media only answers 413/415 after the upload), so MEDIA_UPLOAD_LIMITS mirrors the backend media upload policy defaults (ventylab-server media-upload-policy.ts and env.validation.ts: MEDIA_MAX_IMAGE_BYTES 10 MB, MEDIA_MAX_FILE_BYTES 20 MB, MEDIA_MAX_VIDEO_BYTES 100 MB; MIME whitelist png/jpeg/webp/gif, mp4/webm, pdf) and must be updated with it; a deployment that changes those env values is still caught by the mapped 413/415. mediaKindOf maps a block type to its media kind, mediaAccept builds the file input accept list, validateMediaFile checks emptiness, MIME type (parameters and case ignored, as the backend normalizes it) and size before uploading, and mediaHint describes the formats and the limit. Pure logic, no dependencies.
* Versión: 1.0 (C5)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type MediaKind = "IMAGE" | "VIDEO" | "FILE";

export type MediaFileInfo = { type: string, size: number };

type MediaLimit = {
  maxBytes: number
  mimeTypes: readonly string[]
  formats: string
  // "el máximo para imágenes"
  plural: string
};

const MEGABYTE = 1024 * 1024;

// TODO(i18n): move to a content-editor namespace in src/i18n.
export const MEDIA_UPLOAD_LIMITS: Readonly<Record<MediaKind, MediaLimit>> = {
  IMAGE: { maxBytes: 10 * MEGABYTE, mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"], formats: "PNG, JPEG, WebP o GIF", plural: "imágenes" },
  VIDEO: { maxBytes: 100 * MEGABYTE, mimeTypes: ["video/mp4", "video/webm"], formats: "MP4 o WebM", plural: "videos" },
  FILE: { maxBytes: 20 * MEGABYTE, mimeTypes: ["application/pdf"], formats: "PDF", plural: "archivos" },
};

export function mediaKindOf(blockType: string): MediaKind | null {
  return blockType === "IMAGE" || blockType === "VIDEO" || blockType === "FILE" ? blockType : null;
}

export function mediaAccept(kind: MediaKind): string {
  return MEDIA_UPLOAD_LIMITS[kind].mimeTypes.join(",");
}

function formatMegabytes(bytes: number): string {
  return `${Number((bytes / MEGABYTE).toFixed(1))} MB`;
}

function normalizeMimeType(type: string): string {
  return (type.split(";")[0] ?? "").trim().toLowerCase();
}

export function validateMediaFile(file: MediaFileInfo, kind: MediaKind): string | null {
  const limit = MEDIA_UPLOAD_LIMITS[kind];

  if (!limit.mimeTypes.includes(normalizeMimeType(file.type))) {
    return `Formato no permitido. Usa ${limit.formats}.`;
  }

  if (file.size <= 0) {
    return "El archivo está vacío.";
  }

  if (file.size > limit.maxBytes) {
    return `El archivo pesa ${formatMegabytes(file.size)}; el máximo para ${limit.plural} es ${formatMegabytes(limit.maxBytes)}.`;
  }

  return null;
}

export function mediaHint(kind: MediaKind): string {
  const limit = MEDIA_UPLOAD_LIMITS[kind];

  return `${limit.formats}, hasta ${formatMegabytes(limit.maxBytes)}.`;
}
