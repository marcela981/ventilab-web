/*
* Funcionalidad: NextAuth coexistence bridge
* Descripción: Best-effort calls into the next-auth/react library while legacy code still relies on a NextAuth cookie session (legacy useAuth and the Next API routes under pages/api/curriculum that use getServerSession). runNextAuthBestEffort loads the library lazily, bounds the call with a short timeout and turns any failure into `undefined` with one console.warn, so it never blocks or fails the backend session. signOutOfNextAuth clears the NextAuth cookie without a redirect. v1.1 (T9 follow-up): a timeout of 0 or less (an exhausted caller budget) skips the call (one warning, `undefined`), so callers can share one overall time cap across several calls. Remove when no legacy code reads NextAuth. Depends on next-auth/react (library, lazy import).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const NEXTAUTH_BRIDGE_TIMEOUT_MS = 5_000;

type NextAuthClient = typeof import("next-auth/react");

export async function runNextAuthBestEffort<T>(
  label: string,
  task: (client: NextAuthClient) => Promise<T>,
  timeoutMs: number = NEXTAUTH_BRIDGE_TIMEOUT_MS,
): Promise<T | undefined> {
  if (timeoutMs <= 0) {
    console.warn(`[session] NextAuth ${label} bridge skipped: no time left`);

    return undefined;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs);
  });

  try {
    const client = await Promise.race([import("next-auth/react"), timeout]);

    return await Promise.race([task(client), timeout]);
  } catch (error) {
    console.warn(`[session] NextAuth ${label} bridge skipped:`, error instanceof Error ? error.message : error);

    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export async function signOutOfNextAuth(): Promise<void> {
  await runNextAuthBestEffort("sign-out", (client) => client.signOut({ redirect: false }));
}
