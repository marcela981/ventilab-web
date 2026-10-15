/*
* Funcionalidad: Media upload entity
* Descripción: Client rules of the files uploaded to the media library. The API does not expose its upload limits (POST /api/media only answers 413/415 after the upload), so MEDIA_UPLOAD_LIMITS mirrors the backend media upload policy defaults (ventylab-server media-upload-policy.ts and env.validation.ts: MEDIA_MAX_IMAGE_BYTES 10 MB, MEDIA_MAX_FILE_BYTES 20 MB, MEDIA_MAX_VIDEO_BYTES 100 MB; MIME whitelist png/jpeg/webp/gif, mp4/webm, pdf) and must be updated with it; a deployment that changes those env values is still caught by the mapped 413/415. mediaKindOf maps a type name (block type, media kind) to its media kind, mediaAccept builds the file input accept list, validateMediaFile checks emptiness, MIME type (parameters and case ignored, as the backend normalizes it) and size before uploading, and mediaHint describes the formats and the limit. Pure logic, no dependencies. v1.1 (S1): moved from the content-editor feature to the shared media-upload module; a field may accept several kinds (MediaKinds): matchMediaKind picks the kind of a file by its MIME type, and mediaAccept, mediaHint and validateMediaFile accept one kind or a list (a single kind behaves exactly as before).
* Versión: 1.1 (S1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type MediaKind = "IMAGE" | "VIDEO" | "FILE";

// One kind, or the kinds a field accepts (the file's MIME type picks one).
export type MediaKinds = MediaKind | readonly MediaKind[];

export type MediaFileInfo = { type: string, size: number };

type MediaLimit = {
  maxBytes: number
  mimeTypes: readonly string[]
  formats: string
  // "el máximo para imágenes"
  plural: string
};

const MEGABYTE = 1024 * 1024;

// TODO(i18n): move to a media namespace in src/i18n.
export const MEDIA_UPLOAD_LIMITS: Readonly<Record<MediaKind, MediaLimit>> = {
  IMAGE: { maxBytes: 10 * MEGABYTE, mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"], formats: "PNG, JPEG, WebP o GIF", plural: "imágenes" },
  VIDEO: { maxBytes: 100 * MEGABYTE, mimeTypes: ["video/mp4", "video/webm"], formats: "MP4 o WebM", plural: "videos" },
  FILE: { maxBytes: 20 * MEGABYTE, mimeTypes: ["application/pdf"], formats: "PDF", plural: "archivos" },
};

export function mediaKindOf(type: string): MediaKind | null {
  return type === "IMAGE" || type === "VIDEO" || type === "FILE" ? type : null;
}

function kindList(kinds: MediaKinds): readonly MediaKind[] {
  return typeof kinds === "string" ? [kinds] : kinds;
}

export function mediaAccept(kinds: MediaKinds): string {
  return kindList(kinds).flatMap((kind) => MEDIA_UPLOAD_LIMITS[kind].mimeTypes).join(",");
}

function formatMegabytes(bytes: number): string {
  return `${Number((bytes / MEGABYTE).toFixed(1))} MB`;
}

export function normalizeMimeType(type: string): string {
  return (type.split(";")[0] ?? "").trim().toLowerCase();
}

export function matchMediaKind(type: string, kinds: MediaKinds): MediaKind | null {
  const mimeType = normalizeMimeType(type);

  return kindList(kinds).find((kind) => MEDIA_UPLOAD_LIMITS[kind].mimeTypes.includes(mimeType)) ?? null;
}

export function validateMediaFile(file: MediaFileInfo, kinds: MediaKinds): string | null {
  const kind = matchMediaKind(file.type, kinds);

  if (kind === null) {
    return `Formato no permitido. Usa ${kindList(kinds).map((item) => MEDIA_UPLOAD_LIMITS[item].formats).join("; o ")}.`;
  }

  const limit = MEDIA_UPLOAD_LIMITS[kind];

  if (file.size <= 0) {
    return "El archivo está vacío.";
  }

  if (file.size > limit.maxBytes) {
    return `El archivo pesa ${formatMegabytes(file.size)}; el máximo para ${limit.plural} es ${formatMegabytes(limit.maxBytes)}.`;
  }

  return null;
}

export function mediaHint(kinds: MediaKinds): string {
  return kindList(kinds).map((kind) => {
    const limit = MEDIA_UPLOAD_LIMITS[kind];

    return `${limit.formats}, hasta ${formatMegabytes(limit.maxBytes)}.`;
  }).join(" ");
}
