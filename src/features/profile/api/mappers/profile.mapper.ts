/*
* Funcionalidad: Profile mappers
* Descripción: Maps the backend UserDTO to the Profile entity and builds the `PATCH /api/users/me` body from the edited draft with ONLY the changed fields: the trimmed name, and the trimmed avatar URL or `null` when it was cleared (the contract removes the image with null). Depends on the profile DTOs and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { isImageChanged, isNameChanged } from "../../application/entities/profile.entity";
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
  };
}

export function toUpdateMeRequest(draft: ProfileDraft, profile: Profile): UpdateMeRequestDTO {
  const request: UpdateMeRequestDTO = {};

  if (isNameChanged(draft, profile)) {
    request.name = draft.name.trim();
  }

  if (isImageChanged(draft, profile)) {
    const image = draft.image.trim();

    request.image = image === "" ? null : image;
  }

  return request;
}

export function hasProfileChanges(draft: ProfileDraft, profile: Profile): boolean {
  return Object.keys(toUpdateMeRequest(draft, profile)).length > 0;
}
