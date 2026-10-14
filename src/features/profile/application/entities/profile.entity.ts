/*
* Funcionalidad: Profile entity
* Descripción: Profile model of the own-profile page (id, email, name, avatar URL, role, active flag), the editable draft (name + avatar URL), the role labels, the initials fallback of the avatar and the client validation of the CHANGED fields: name required and at most 100 characters (backend UpdateMeDTO limits), avatar URL only http:// or https:// (the backend also accepts base64 data URLs, the page does not offer them). Spanish messages, TODO(i18n). Depends on @shared/session (Role type).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { Role } from "@shared/session";

export type Profile = {
  id: string
  email: string
  name: string | null
  image: string | null
  role: Role
  isActive: boolean
};

export type ProfileDraft = {
  name: string
  image: string
};

export type ProfileField = keyof ProfileDraft;

export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

export const PROFILE_NAME_MAX = 100;

// TODO(i18n): move to a profile namespace in src/i18n.
export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Estudiante",
  TEACHER: "Docente",
  ADMIN: "Administrador",
};

// TODO(i18n)
export const PROFILE_ERRORS = {
  nameRequired: "Ingresa tu nombre.",
  nameTooLong: `El nombre puede tener como máximo ${PROFILE_NAME_MAX} caracteres.`,
  imageInvalid: "Ingresa una URL que empiece por http:// o https://.",
} as const;

export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);

    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function toDraft(profile: Profile): ProfileDraft {
  return { name: profile.name ?? "", image: profile.image ?? "" };
}

export function isNameChanged(draft: ProfileDraft, profile: Profile): boolean {
  return draft.name.trim() !== (profile.name ?? "").trim();
}

export function isImageChanged(draft: ProfileDraft, profile: Profile): boolean {
  return draft.image.trim() !== (profile.image ?? "");
}

export function validateProfileDraft(draft: ProfileDraft, profile: Profile): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const name = draft.name.trim();
  const image = draft.image.trim();

  if (isNameChanged(draft, profile)) {
    if (name === "") {
      errors.name = PROFILE_ERRORS.nameRequired;
    } else if (name.length > PROFILE_NAME_MAX) {
      errors.name = PROFILE_ERRORS.nameTooLong;
    }
  }

  if (isImageChanged(draft, profile) && image !== "" && !isHttpUrl(image)) {
    errors.image = PROFILE_ERRORS.imageInvalid;
  }

  return errors;
}

export function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (words.length > 0) {
    return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");
  }

  const first = (email ?? "").trim().charAt(0);

  return first ? first.toUpperCase() : "?";
}
