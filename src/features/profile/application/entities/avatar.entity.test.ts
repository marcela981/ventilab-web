/*
* Funcionalidad: Avatar entity tests
* Descripción: Tests of the profile photo rules: accepted types and the 2 MB limit with julio's messages, the centered square crop at 512 px without upscaling, the output type, and the messages of failed uploads/removals (413, 415, 503, 429, offline, unknown). Depends on vitest and @shared/api-client api-error.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MESSAGES,
  avatarOutputType,
  centeredSquareCrop,
  getAvatarError,
  validateAvatarFile,
} from "./avatar.entity";

describe("validateAvatarFile", () => {
  it.each(["image/png", "image/jpeg", "image/webp"])("accepts %s up to 2 MB", (type) => {
    expect(validateAvatarFile({ type, size: AVATAR_MAX_BYTES })).toBeNull();
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", ""])("rejects the type %s", (type) => {
    expect(validateAvatarFile({ type, size: 10 })).toBe("Solo se permiten archivos PNG, JPG, JPEG o WEBP");
  });

  it("rejects a file over 2 MB", () => {
    expect(validateAvatarFile({ type: "image/png", size: AVATAR_MAX_BYTES + 1 })).toBe("La imagen no puede exceder 2 MB");
  });
});

describe("centeredSquareCrop", () => {
  it("takes the centered square of a landscape image and resizes it to 512 px", () => {
    expect(centeredSquareCrop(1600, 900)).toEqual({ sx: 350, sy: 0, side: 900, outputSize: 512 });
  });

  it("takes the centered square of a portrait image", () => {
    expect(centeredSquareCrop(600, 1001)).toEqual({ sx: 0, sy: 200, side: 600, outputSize: 512 });
  });

  it("never upscales a small image", () => {
    expect(centeredSquareCrop(300, 200)).toEqual({ sx: 50, sy: 0, side: 200, outputSize: 200 });
  });
});

describe("avatarOutputType", () => {
  it("keeps png and re-encodes the rest as jpeg", () => {
    expect(avatarOutputType("image/png")).toBe("image/png");
    expect(avatarOutputType("image/webp")).toBe("image/jpeg");
    expect(avatarOutputType("image/jpeg")).toBe("image/jpeg");
  });
});

describe("getAvatarError", () => {
  const httpError = (status: number, retryAfter?: number) =>
    new ApiError({ code: "x", message: "x", status, ...(retryAfter === undefined ? {} : { retryAfter }) });

  it.each([
    [413, AVATAR_MESSAGES.tooLarge],
    [415, AVATAR_MESSAGES.invalidType],
    [503, AVATAR_MESSAGES.storageUnavailable],
  ])("maps %s", (status, expected) => {
    expect(getAvatarError(httpError(status), "upload")).toBe(expected);
  });

  it("shows the wait of a 429", () => {
    expect(getAvatarError(httpError(429, 30), "remove")).toBe("Demasiados intentos. Inténtalo de nuevo en 30 segundos.");
  });

  it("shows the network message when offline", () => {
    expect(getAvatarError(new ApiError({ code: CLIENT_ERROR_CODES.networkUnavailable, message: "", status: 0 }), "upload"))
      .toMatch(/no se pudo conectar/i);
  });

  it("falls back to the action message", () => {
    expect(getAvatarError(httpError(400), "upload")).toBe(AVATAR_MESSAGES.uploadFailed);
    expect(getAvatarError(httpError(400), "remove")).toBe(AVATAR_MESSAGES.removeFailed);
  });
});
