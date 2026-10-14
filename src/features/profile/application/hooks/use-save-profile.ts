/*
* Funcionalidad: useSaveProfile
* Descripción: Save action of the profile form: validates the changed fields on the client (no request when invalid or unchanged), PATCHes `/api/users/me` with only the changed fields, then revalidates the cached profile and reloads the session user (`/api/auth/me` through reloadSession of @shared/session) so the AppShell shows the new name. Failures are mapped to field errors and/or one Spanish alert message; a success sets a confirmation that the next edit clears. Ignores a second save while one is running. Depends on react, @shared/session and the profile entity, mappers, service and error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { useSession } from "@shared/session";
import { toUpdateMeRequest } from "../../api/mappers/profile.mapper";
import { updateMyProfile } from "../../api/services/profile.service";
import { getProfileSaveError } from "../entities/profile-error-messages";
import { validateProfileDraft } from "../entities/profile.entity";
import type { Profile, ProfileDraft, ProfileField, ProfileFieldErrors } from "../entities/profile.entity";

export type UseSaveProfileResult = {
  saving: boolean
  saved: boolean
  fieldErrors: ProfileFieldErrors
  message: string | null
  save: (draft: ProfileDraft) => Promise<void>
  clearField: (field: ProfileField) => void
};

export function useSaveProfile(profile: Profile, reloadProfile: () => Promise<void>): UseSaveProfileResult {
  const { reloadSession } = useSession();
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const save = useCallback(async(draft: ProfileDraft) => {
    if (savingRef.current) {
      return;
    }

    const errors = validateProfileDraft(draft, profile);
    const changes = toUpdateMeRequest(draft, profile);

    setFieldErrors(errors);
    setMessage(null);
    setSaved(false);

    if (Object.keys(errors).length > 0 || Object.keys(changes).length === 0) {
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      await updateMyProfile(changes);
    } catch (caught) {
      const failure = getProfileSaveError(caught);

      setFieldErrors(failure.fieldErrors);
      setMessage(failure.message);
      savingRef.current = false;
      setSaving(false);

      return;
    }

    // The change is saved; a failed refresh only leaves stale data on screen (never reported as a save error).
    await Promise.all([reloadProfile().catch(() => undefined), reloadSession()]);
    setSaved(true);
    savingRef.current = false;
    setSaving(false);
  }, [profile, reloadProfile, reloadSession]);

  const clearField = useCallback((field: ProfileField) => {
    setSaved(false);
    setMessage(null);
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };

      delete next[field];

      return next;
    });
  }, []);

  return { saving, saved, fieldErrors, message, save, clearField };
}
