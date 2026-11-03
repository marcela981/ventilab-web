/*
* Funcionalidad: Profile entity
* Descripción: Profile model of the own-profile page (id, email, name, photo URL, role, active flag, whether the account has a local password), the editable draft (name), the role labels, the initials fallback of the avatar and the client validation of the changed name: required and at most 100 characters (backend UpdateMeDTO limits). The photo is no longer an editable URL: it is uploaded from the device (avatar entity). Spanish messages, TODO(i18n). Depends on @shared/session (Role type). v1.1 (Bloque 4, W7): avatar URL field removed, `hasPassword` added.
* Versión: 1.1
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
  /** Signed URL of the uploaded photo or the Google picture; it expires, so it is always read again (never stored). */
  image: string | null
  role: Role
  isActive: boolean
  /** false for Google sign-in accounts, whose password is managed by Google. */
  hasPassword: boolean
};

export type ProfileDraft = {
  name: string
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
} as const;

export function toDraft(profile: Profile): ProfileDraft {
  return { name: profile.name ?? "" };
}

export function isNameChanged(draft: ProfileDraft, profile: Profile): boolean {
  return draft.name.trim() !== (profile.name ?? "").trim();
}

export function validateProfileDraft(draft: ProfileDraft, profile: Profile): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const name = draft.name.trim();

  if (isNameChanged(draft, profile)) {
    if (name === "") {
      errors.name = PROFILE_ERRORS.nameRequired;
    } else if (name.length > PROFILE_NAME_MAX) {
      errors.name = PROFILE_ERRORS.nameTooLong;
    }
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
