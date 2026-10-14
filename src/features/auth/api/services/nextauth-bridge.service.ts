/*
* Funcionalidad: NextAuth sign-in bridge
* Descripción: Coexistence bridge run after a successful backend LOCAL login: signs in to NextAuth with the same credentials (credentials provider of next-auth/react, no redirect, bounded by the shared short timeout) so legacy code that needs a NextAuth cookie session (pages/api/curriculum routes, legacy hooks) keeps working. Best effort: a failure or timeout is logged once and the NextAuth session is cleared, so a stale cookie of another user cannot survive; it never fails the backend login. Google sign-in is NOT bridged (the NextAuth Google provider is a redirect OAuth flow): clearNextAuthSession only drops a stale cookie. Depends on @shared/session (NextAuth bridge) and the auth mappers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { runNextAuthBestEffort, signOutOfNextAuth } from "@shared/session";
import type { LoginCredentials } from "../../application/entities/auth.entity";
import { toLoginRequest } from "../mappers/auth.mapper";

export async function bridgeNextAuthSignIn(credentials: LoginCredentials): Promise<void> {
  const { email, password } = toLoginRequest(credentials);
  const result = await runNextAuthBestEffort("sign-in", (client) =>
    client.signIn("credentials", { email, password, redirect: false }));

  if (result?.ok && !result.error) {
    return;
  }

  if (result) {
    console.warn("[auth] NextAuth sign-in bridge skipped:", result.error ?? `status ${result.status}`);
  }

  await signOutOfNextAuth();
}

export function clearNextAuthSession(): Promise<void> {
  return signOutOfNextAuth();
}
