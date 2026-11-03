/*
* Funcionalidad: useChangePassword
* Descripción: State and submit action of the change-password form: the draft (current, new, confirmation), the client validation with julio's messages (no request when invalid), `POST /api/auth/change-password` (the service stores the returned token pair with saveTokens, so this session stays signed in and other tabs pick it up), the backend failures mapped to a field error (wrong current password, same password) or one alert (Google account, 429 with the wait, network…), and a success notice after which the fields are cleared. Editing a field clears its error and the notices. Ignores a second submit while one is running. Depends on react, the password entity and the profile service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { changeMyPassword } from "../../api/services/profile.service";
import { EMPTY_PASSWORD_DRAFT, getChangePasswordError, validatePasswordDraft } from "../entities/password.entity";
import type { PasswordDraft, PasswordField, PasswordFieldErrors } from "../entities/password.entity";

export type UseChangePasswordResult = {
  draft: PasswordDraft
  fieldErrors: PasswordFieldErrors
  message: string | null
  changed: boolean
  submitting: boolean
  setField: (field: PasswordField, value: string) => void
  submit: () => Promise<void>
};

export function useChangePassword(): UseChangePasswordResult {
  const submittingRef = useRef(false);
  const [draft, setDraft] = useState<PasswordDraft>(EMPTY_PASSWORD_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback((field: PasswordField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setChanged(false);
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

  const submit = useCallback(async() => {
    if (submittingRef.current) {
      return;
    }

    const errors = validatePasswordDraft(draft);

    setFieldErrors(errors);
    setMessage(null);
    setChanged(false);

    if (Object.keys(errors).length > 0) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      await changeMyPassword({ currentPassword: draft.currentPassword, newPassword: draft.newPassword });
      setDraft(EMPTY_PASSWORD_DRAFT);
      setChanged(true);
    } catch (caught) {
      const failure = getChangePasswordError(caught);

      setFieldErrors(failure.fieldErrors);
      setMessage(failure.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [draft]);

  return { draft, fieldErrors, message, changed, submitting, setField, submit };
}
