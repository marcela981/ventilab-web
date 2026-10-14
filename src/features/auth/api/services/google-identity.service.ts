/*
* Funcionalidad: Google Identity Services loader
* Descripción: Loads the Google Identity Services client script (`https://accounts.google.com/gsi/client`) on demand, once per page (a failed load can be retried), and returns its `google.accounts.id` API. v1.1 (T9 follow-up): the load is bounded by GOOGLE_IDENTITY_LOAD_TIMEOUT_MS (10 s), and on an error, a timeout or a load without the API the script tag is removed, so a retry appends exactly one new script; late events of an abandoned script are ignored. Declares the minimal typed subset of the GIS API the login page uses (initialize, renderButton, cancel). No npm dependency; browser only.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";

export const GOOGLE_IDENTITY_LOAD_TIMEOUT_MS = 10_000;

export type GoogleCredentialResponse = {
  credential: string
};

export type GoogleIdConfiguration = {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  ux_mode?: "popup" | "redirect"
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  context?: "signin" | "signup" | "use"
};

export type GoogleButtonConfiguration = {
  type?: "standard" | "icon"
  theme?: "outline" | "filled_blue" | "filled_black"
  size?: "large" | "medium" | "small"
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
  shape?: "rectangular" | "pill" | "circle" | "square"
  logo_alignment?: "left" | "center"
  width?: number
  locale?: string
};

export type GoogleAccountsId = {
  initialize: (config: GoogleIdConfiguration) => void
  renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void
  cancel: () => void
};

type GoogleWindow = Window & {
  google?: { accounts?: { id?: GoogleAccountsId } }
};

let pending: Promise<GoogleAccountsId> | null = null;

function currentApi(): GoogleAccountsId | null {
  return (window as GoogleWindow).google?.accounts?.id ?? null;
}

export function loadGoogleIdentity(timeoutMs: number = GOOGLE_IDENTITY_LOAD_TIMEOUT_MS): Promise<GoogleAccountsId> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services is only available in the browser"));
  }

  const loaded = currentApi();

  if (loaded) {
    return Promise.resolve(loaded);
  }

  if (pending) {
    return pending;
  }

  pending = new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;

    const settle = (outcome: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      outcome();
    };

    const fail = (message: string) => settle(() => {
      // Without the tag a retry can append a fresh script instead of a duplicate.
      script.remove();
      reject(new Error(message));
    });

    const timer = setTimeout(() => fail(`Google Identity Services timed out after ${timeoutMs} ms`), timeoutMs);

    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const api = currentApi();

      if (api) {
        settle(() => resolve(api));
      } else {
        fail("Google Identity Services did not initialize");
      }
    };
    script.onerror = () => fail("Google Identity Services could not be loaded");
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    pending = null;
    throw error;
  });

  return pending;
}
