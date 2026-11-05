/*
* Funcionalidad: Password recovery hooks
* Descripción: useForgotPassword sends the recovery request once at a time and ends in the sent state (the same notice for every email; reset() goes back to the form); useResetPassword posts the new password with the link token and ends in done, or keeps the Spanish error (an invalid or expired link is flagged so the page offers a new one). Depends on React, the auth service and ./password-reset.entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { requestPasswordReset, resetPassword } from "../../api/services/auth.service";
import { getPasswordResetErrorMessage, isInvalidResetTokenError } from "../entities/password-reset.entity";

type RequestState = { pending: boolean, error: string | null, done: boolean };

const IDLE: RequestState = { pending: false, error: null, done: false };

function usePasswordRequest<A extends unknown[]>(send: (...args: A) => Promise<void>) {
  const pendingRef = useRef(false);
  const [state, setState] = useState<RequestState>(IDLE);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const submit = useCallback(async (...args: A): Promise<void> => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setState({ pending: true, error: null, done: false });
    try {
      await send(...args);
      setState({ pending: false, error: null, done: true });
    } catch (caught) {
      setTokenInvalid(isInvalidResetTokenError(caught));
      setState({ pending: false, error: getPasswordResetErrorMessage(caught), done: false });
    } finally {
      pendingRef.current = false;
    }
  }, [send]);

  const clearError = useCallback(() => setState((current) => (current.error ? { ...current, error: null } : current)), []);
  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, tokenInvalid, submit, clearError, reset };
}

export function useForgotPassword() {
  return usePasswordRequest(requestPasswordReset);
}

export function useResetPassword() {
  return usePasswordRequest(resetPassword);
}
