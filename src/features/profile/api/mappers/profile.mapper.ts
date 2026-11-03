/*
* Funcionalidad: Profile mappers
* Descripción: Maps the backend UserDTO to the Profile entity and builds the `PATCH /api/users/me` body from the edited draft with ONLY the changed fields (the trimmed name). The photo is uploaded and removed through its own endpoints, never through PATCH. Depends on the profile DTOs and entity. v1.1 (Bloque 4, W7): avatar URL removed, `hasPassword` mapped.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { isNameChanged } from "../../application/entities/profile.entity";
import type { Profile, ProfileDraft } from "../../application/entities/profile.entity";
import type { UpdateMeRequestDTO, UserDTO } from "../dtos/profile.dto";

export function toProfile(user: UserDTO): Profile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    isActive: user.isActive,
    hasPassword: user.hasPassword,
  };
}

export function toUpdateMeRequest(draft: ProfileDraft, profile: Profile): UpdateMeRequestDTO {
  return isNameChanged(draft, profile) ? { name: draft.name.trim() } : {};
}

export function hasProfileChanges(draft: ProfileDraft, profile: Profile): boolean {
  return Object.keys(toUpdateMeRequest(draft, profile)).length > 0;
}
