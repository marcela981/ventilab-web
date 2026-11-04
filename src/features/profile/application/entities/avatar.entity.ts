/*
* Funcionalidad: Avatar entity
* Descripción: Rules of the profile photo uploaded from the device (DISENO_BLOQUE4 §2.8): accepted types png, jpeg and webp, at most 2 MB (julio limit, also enforced by `PUT /api/users/me/avatar`), the centered square crop geometry and the 512 px output side (never upscaled), plus the Spanish messages of the client checks (julio texts) and of the upload/remove failures (400, 413, 415, 503 and the common ones). Pure functions. Depends on @shared/api-client api-error and the profile error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import { getCommonRequestMessage } from "./profile-error-messages";

export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const AVATAR_ACCEPT = AVATAR_TYPES.join(",");

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const AVATAR_OUTPUT_SIZE = 512;

// TODO(i18n): move to a profile namespace in src/i18n. Type and size texts from julio (EditProfileForm.jsx).
export const AVATAR_MESSAGES = {
  invalidType: "Solo se permiten archivos PNG, JPG, JPEG o WEBP",
  tooLarge: "La imagen no puede exceder 2 MB",
  unreadable: "No se pudo procesar la imagen. Prueba con otro archivo.",
  storageUnavailable: "El almacenamiento de fotos no está disponible en este momento. Inténtalo más tarde.",
  uploadFailed: "No se pudo actualizar la foto de perfil. Inténtalo de nuevo.",
  removeFailed: "No se pudo quitar la foto de perfil. Inténtalo de nuevo.",
  uploaded: "Foto de perfil actualizada correctamente",
  removed: "Foto de perfil eliminada correctamente",
} as const;

export type AvatarFileInfo = {
  type: string
  size: number
};

/** Julio message of a file the backend would reject, or null when it can be cropped and uploaded. */
export function validateAvatarFile(file: AvatarFileInfo): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return AVATAR_MESSAGES.invalidType;
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return AVATAR_MESSAGES.tooLarge;
  }

  return null;
}

export type SquareCrop = {
  sx: number
  sy: number
  side: number
  outputSize: number
};

/** Largest centered square of a `width` × `height` image, drawn at AVATAR_OUTPUT_SIZE (smaller images are not upscaled). */
export function centeredSquareCrop(width: number, height: number): SquareCrop {
  const side = Math.min(width, height);

  return {
    sx: Math.floor((width - side) / 2),
    sy: Math.floor((height - side) / 2),
    side,
    outputSize: Math.min(side, AVATAR_OUTPUT_SIZE),
  };
}

/** PNG keeps its transparency; jpeg and webp are re-encoded as jpeg (every browser can encode it). */
export function avatarOutputType(type: string): "image/png" | "image/jpeg" {
  return type === "image/png" ? "image/png" : "image/jpeg";
}

export function getAvatarError(error: unknown, action: "upload" | "remove"): string {
  const apiError = toApiError(error);

  if (apiError.status === 413) {
    return AVATAR_MESSAGES.tooLarge;
  }

  if (apiError.status === 415) {
    return AVATAR_MESSAGES.invalidType;
  }

  if (apiError.status === 503) {
    return AVATAR_MESSAGES.storageUnavailable;
  }

  return getCommonRequestMessage(apiError) ?? (action === "upload" ? AVATAR_MESSAGES.uploadFailed : AVATAR_MESSAGES.removeFailed);
}
