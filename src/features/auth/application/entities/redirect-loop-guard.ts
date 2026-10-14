/*
* Funcionalidad: Post-login redirect loop guard
* Descripción: Breaks redirect loops between the login page and pages whose (legacy) guard does not recognise the backend session yet and sends the user back to /auth/login. Every post-login redirect is recorded in sessionStorage for REDIRECT_BOUNCE_WINDOW_MS (10 s); a target that comes back within that window falls back to the role home, and when the role home bounced too the redirects stop (null) so the page can show an error instead of looping. Storage failures degrade to "no history". No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const REDIRECT_HISTORY_KEY = "ventilab_post_login_redirects";

export const REDIRECT_BOUNCE_WINDOW_MS = 10_000;

export type RedirectRecord = {
  target: string
  at: number
};

function isRecord(value: unknown): value is RedirectRecord {
  return typeof value === "object" && value !== null
    && typeof (value as RedirectRecord).target === "string"
    && typeof (value as RedirectRecord).at === "number";
}

export function readRedirectHistory(now: number = Date.now()): RedirectRecord[] {
  try {
    const raw = window.sessionStorage.getItem(REDIRECT_HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.filter(isRecord).filter((record) => now - record.at <= REDIRECT_BOUNCE_WINDOW_MS)
      : [];
  } catch {
    return [];
  }
}

export function recordRedirect(target: string, now: number = Date.now()): void {
  try {
    const history = [...readRedirectHistory(now), { target, at: now }];

    window.sessionStorage.setItem(REDIRECT_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Storage unavailable: loop detection is off, the redirect itself still happens.
  }
}

export function clearRedirectHistory(): void {
  try {
    window.sessionStorage.removeItem(REDIRECT_HISTORY_KEY);
  } catch {
    // Storage unavailable: nothing was recorded.
  }
}

// `history` holds only the redirects of the current bounce window (see readRedirectHistory).
export function choosePostLoginTarget(
  target: string,
  roleHome: string,
  history: readonly RedirectRecord[],
): string | null {
  const bounced = (path: string) => history.some((record) => record.target === path);

  if (!bounced(target)) {
    return target;
  }

  return bounced(roleHome) ? null : roleHome;
}
