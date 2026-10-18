/*
* Funcionalidad: useRegister
* Descripción: Registration action of the register page: posts the new student account (`POST /api/auth/register`), then logs in with the same credentials and calls establishSession of @shared/session exactly like a local login, so usePostLoginRedirect navigates to the role home once the session is authenticated. A failed registration shows its Spanish message (getRegisterErrorMessage); when the account was created but the login that follows fails, the message says so and points to the login page. Ignores new attempts while one is pending. Depends on react, @shared/session, the auth service, mappers and error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { useSession } from "@shared/session";
import { toRegisteredCredentials, toSessionTokens } from "../../api/mappers/auth.mapper";
import { loginWithPassword, registerAccount } from "../../api/services/auth.service";
import { getAuthErrorMessage, getRegisterErrorMessage } from "../entities/auth-error-messages";
import type { RegistrationData } from "../entities/register.entity";

// TODO(i18n)
export const REGISTERED_LOGIN_FAILED_PREFIX = "Tu cuenta se creó, pero no se pudo iniciar sesión.";

export type UseRegisterResult = {
  pending: boolean
  error: string | null
  submitRegistration: (registration: RegistrationData) => Promise<void>
  clearError: () => void
};

export function useRegister(): UseRegisterResult {
  const { establishSession } = useSession();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRegistration = useCallback(async(registration: RegistrationData): Promise<void> => {
    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    setPending(true);
    setError(null);

    try {
      try {
        await registerAccount(registration);
      } catch (caught) {
        setError(getRegisterErrorMessage(caught));

        return;
      }

      try {
        const response = await loginWithPassword(toRegisteredCredentials(registration));

        await establishSession(toSessionTokens(response));
      } catch (caught) {
        setError(`${REGISTERED_LOGIN_FAILED_PREFIX} ${getAuthErrorMessage(caught)}`);
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [establishSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { pending, error, submitRegistration, clearError };
}
