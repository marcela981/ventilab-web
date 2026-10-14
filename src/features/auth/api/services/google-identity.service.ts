/*
* Funcionalidad: Google Identity Services loader
* Descripción: Loads the Google Identity Services client script (`https://accounts.google.com/gsi/client`) on demand, once per page (a failed load can be retried), and returns its `google.accounts.id` API. Declares the minimal typed subset of the GIS API the login page uses (initialize, renderButton, cancel). No npm dependency; browser only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";

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

export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
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

    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const api = currentApi();

      if (api) {
        resolve(api);
      } else {
        reject(new Error("Google Identity Services did not initialize"));
      }
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("Google Identity Services could not be loaded"));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    pending = null;
    throw error;
  });

  return pending;
}
