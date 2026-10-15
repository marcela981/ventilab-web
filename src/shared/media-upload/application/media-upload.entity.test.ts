/*
* Funcionalidad: Media upload entity tests
* Descripción: Client validation of the uploaded files: media kind per type name, accepted MIME types per kind (MIME parameters and case ignored), empty files, the size limit of each kind (exactly at the limit is allowed) and the hint shown next to the upload button. Depends on vitest and the media upload entity. v1.1 (S1): moved to the shared media-upload module; fields accepting several kinds (kind picked by MIME type, combined accept list, hint and format error).
* Versión: 1.1 (S1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { matchMediaKind, MEDIA_UPLOAD_LIMITS, mediaAccept, mediaHint, mediaKindOf, validateMediaFile } from "./media-upload.entity";

const MB = 1024 * 1024;

describe("media upload validation", () => {
  it("maps the media block types to their kind", () => {
    expect(mediaKindOf("IMAGE")).toBe("IMAGE");
    expect(mediaKindOf("FILE")).toBe("FILE");
    expect(mediaKindOf("VIDEO")).toBe("VIDEO");
    expect(mediaKindOf("TEXT")).toBeNull();
  });

  it("mirrors the backend limits", () => {
    expect(MEDIA_UPLOAD_LIMITS.IMAGE.maxBytes).toBe(10 * MB);
    expect(MEDIA_UPLOAD_LIMITS.FILE.maxBytes).toBe(20 * MB);
    expect(MEDIA_UPLOAD_LIMITS.VIDEO.maxBytes).toBe(100 * MB);
    expect(mediaAccept("IMAGE")).toBe("image/png,image/jpeg,image/webp,image/gif");
    expect(mediaAccept("VIDEO")).toBe("video/mp4,video/webm");
    expect(mediaAccept("FILE")).toBe("application/pdf");
  });

  it("accepts an allowed type up to the size limit of its kind", () => {
    expect(validateMediaFile({ type: "image/png", size: 10 * MB }, "IMAGE")).toBeNull();
    expect(validateMediaFile({ type: "IMAGE/JPEG; charset=binary", size: 1 }, "IMAGE")).toBeNull();
    expect(validateMediaFile({ type: "video/webm", size: 100 * MB }, "VIDEO")).toBeNull();
    expect(validateMediaFile({ type: "application/pdf", size: 20 * MB }, "FILE")).toBeNull();
  });

  it("rejects a type of another kind or not allowed", () => {
    expect(validateMediaFile({ type: "application/pdf", size: 10 }, "IMAGE")).toBe("Formato no permitido. Usa PNG, JPEG, WebP o GIF.");
    expect(validateMediaFile({ type: "video/quicktime", size: 10 }, "VIDEO")).toBe("Formato no permitido. Usa MP4 o WebM.");
    expect(validateMediaFile({ type: "", size: 10 }, "FILE")).toBe("Formato no permitido. Usa PDF.");
  });

  it("rejects empty and oversized files", () => {
    expect(validateMediaFile({ type: "image/png", size: 0 }, "IMAGE")).toBe("El archivo está vacío.");
    expect(validateMediaFile({ type: "image/png", size: 10 * MB + 1 }, "IMAGE")).toBe("El archivo pesa 10 MB; el máximo para imágenes es 10 MB.");
    expect(validateMediaFile({ type: "application/pdf", size: 25.5 * MB }, "FILE")).toBe("El archivo pesa 25.5 MB; el máximo para archivos es 20 MB.");
  });

  it("describes the formats and the limit", () => {
    expect(mediaHint("VIDEO")).toBe("MP4 o WebM, hasta 100 MB.");
  });

  it("validates a field that accepts several kinds by the kind of the file", () => {
    const kinds = ["IMAGE", "VIDEO"] as const;

    expect(matchMediaKind("video/mp4", kinds)).toBe("VIDEO");
    expect(matchMediaKind("application/pdf", kinds)).toBeNull();
    expect(mediaAccept(kinds)).toBe("image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm");
    expect(mediaHint(kinds)).toBe("PNG, JPEG, WebP o GIF, hasta 10 MB. MP4 o WebM, hasta 100 MB.");
    expect(validateMediaFile({ type: "video/webm", size: 50 * MB }, kinds)).toBeNull();
    expect(validateMediaFile({ type: "image/png", size: 50 * MB }, kinds)).toBe("El archivo pesa 50 MB; el máximo para imágenes es 10 MB.");
    expect(validateMediaFile({ type: "application/pdf", size: 10 }, kinds)).toBe("Formato no permitido. Usa PNG, JPEG, WebP o GIF; o MP4 o WebM.");
  });
});
