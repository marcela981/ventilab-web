/*
* Funcionalidad: NextAuth sign-in bridge
* Descripción: Coexistence bridge run after a successful backend login, so legacy code that reads the NextAuth cookie session (legacy useAuth, pages/api/curriculum routes) can never act as a different user than the backend session. A LOCAL login signs in to NextAuth with the same credentials (credentials provider of next-auth/react, no redirect); a Google login drops any NextAuth cookie (the NextAuth Google provider is a redirect OAuth flow, so it is not bridged). v1.1 (T9 follow-up): both then verify the NextAuth session user (getSession): none or the same email -> "synced"; another user -> one more sign-out and a re-check; still another user, or a check that could not run -> "mismatch" (the caller must sign out of the backend and not open legacy pages). Every NextAuth call shares ONE overall time cap (NEXTAUTH_SYNC_BUDGET_MS, 5 s; the sign-in may use at most 3 s of it so the verification always gets time). Depends on @shared/session (NextAuth bridge) and the auth mappers.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { runNextAuthBestEffort } from "@shared/session";
import type { LoginCredentials } from "../../application/entities/auth.entity";
import { toLoginRequest } from "../mappers/auth.mapper";

export const NEXTAUTH_SYNC_BUDGET_MS = 5_000;

// The sign-in may not consume the whole budget: the session check after it is what protects legacy pages.
const SIGN_IN_MAX_MS = 3_000;

export type NextAuthSyncResult = "synced" | "mismatch";

type RemainingTime = () => number;

function startBudget(totalMs: number): RemainingTime {
  const deadline = Date.now() + totalMs;

  return () => Math.max(0, deadline - Date.now());
}

// null = no NextAuth session; undefined = the check could not run; string = email of the NextAuth user.
async function readNextAuthEmail(remaining: RemainingTime): Promise<string | null | undefined> {
  const session = await runNextAuthBestEffort("session check", (client) => client.getSession(), remaining());

  if (session === undefined) {
    return undefined;
  }

  return session?.user ? (session.user.email ?? "") : null;
}

function isSameUser(nextAuthEmail: string | null | undefined, backendEmail: string): boolean {
  if (nextAuthEmail === null) {
    return true;
  }

  return nextAuthEmail !== undefined && nextAuthEmail.trim().toLowerCase() === backendEmail.trim().toLowerCase();
}

async function signOutWithin(remaining: RemainingTime): Promise<void> {
  await runNextAuthBestEffort("sign-out", (client) => client.signOut({ redirect: false }), remaining());
}

async function ensureNoOtherNextAuthUser(backendEmail: string, remaining: RemainingTime): Promise<NextAuthSyncResult> {
  if (isSameUser(await readNextAuthEmail(remaining), backendEmail)) {
    return "synced";
  }

  await signOutWithin(remaining);

  if (isSameUser(await readNextAuthEmail(remaining), backendEmail)) {
    return "synced";
  }

  console.warn("[auth] A NextAuth session of another user could not be cleared (or could not be checked).");

  return "mismatch";
}

export async function syncNextAuthAfterPasswordLogin(
  credentials: LoginCredentials,
  backendEmail: string,
  budgetMs: number = NEXTAUTH_SYNC_BUDGET_MS,
): Promise<NextAuthSyncResult> {
  const remaining = startBudget(budgetMs);
  const { email, password } = toLoginRequest(credentials);
  const result = await runNextAuthBestEffort(
    "sign-in",
    (client) => client.signIn("credentials", { email, password, redirect: false }),
    Math.min(SIGN_IN_MAX_MS, remaining()),
  );

  if (!result?.ok || result.error) {
    if (result) {
      console.warn("[auth] NextAuth sign-in bridge skipped:", result.error ?? `status ${result.status}`);
    }

    await signOutWithin(remaining);
  }

  return ensureNoOtherNextAuthUser(backendEmail, remaining);
}

export async function syncNextAuthAfterGoogleLogin(
  backendEmail: string,
  budgetMs: number = NEXTAUTH_SYNC_BUDGET_MS,
): Promise<NextAuthSyncResult> {
  const remaining = startBudget(budgetMs);

  await signOutWithin(remaining);

  return ensureNoOtherNextAuthUser(backendEmail, remaining);
}
