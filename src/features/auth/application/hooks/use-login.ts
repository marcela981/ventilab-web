/*
* Funcionalidad: useLogin
* Descripción: Login actions of the login page: local login (email + password) and Google sign-in (ID token). Each one calls the auth service, then establishSession of @shared/session (stores both tokens and loads /me); the navigation happens in usePostLoginRedirect once the session is authenticated. v1.1 (T9 follow-up): after establishSession a local login runs the best-effort NextAuth sign-in bridge and a Google login clears any stale NextAuth session; `pending` stays true until that finishes and the page redirects only once it is false. Ignores new attempts while one is pending and exposes the Spanish error message of a failure. Depends on react, @shared/session, the auth service, mappers and error messages.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { useSession } from "@shared/session";
import type { LoginResponseDTO } from "../../api/dtos/auth.dto";
import { toSessionTokens } from "../../api/mappers/auth.mapper";
import { loginWithGoogle, loginWithPassword } from "../../api/services/auth.service";
import { bridgeNextAuthSignIn, clearNextAuthSession } from "../../api/services/nextauth-bridge.service";
import { getAuthErrorMessage } from "../entities/auth-error-messages";
import type { LoginCredentials } from "../entities/auth.entity";

export type UseLoginResult = {
  pending: boolean
  error: string | null
  submitCredentials: (credentials: LoginCredentials) => Promise<void>
  submitGoogleCredential: (idToken: string) => Promise<void>
  clearError: () => void
};

export function useLogin(): UseLoginResult {
  const { establishSession } = useSession();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async(
    request: () => Promise<LoginResponseDTO>,
    bridge: () => Promise<void>,
  ): Promise<void> => {
    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    setPending(true);
    setError(null);

    try {
      const response = await request();

      await establishSession(toSessionTokens(response));
    } catch (caught) {
      pendingRef.current = false;
      setPending(false);
      setError(getAuthErrorMessage(caught));

      return;
    }

    // Best effort and bounded: never rejects and never changes the error message.
    await bridge();
    pendingRef.current = false;
    setPending(false);
  }, [establishSession]);

  const submitCredentials = useCallback(
    (credentials: LoginCredentials) => run(() => loginWithPassword(credentials), () => bridgeNextAuthSignIn(credentials)),
    [run],
  );

  const submitGoogleCredential = useCallback(
    (idToken: string) => run(() => loginWithGoogle(idToken), clearNextAuthSession),
    [run],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { pending, error, submitCredentials, submitGoogleCredential, clearError };
}
