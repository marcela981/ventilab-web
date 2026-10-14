/*
* Funcionalidad: useGoogleIdentity
* Descripción: Loads Google Identity Services on demand (only when a client ID is configured), initializes it with the client ID and a callback that forwards the ID token, and renders the official Google button into the given container. Status: unconfigured, loading, ready or error. The latest credential handler is kept in a ref so re-renders do not re-initialize GIS. Depends on react and the GIS loader service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { loadGoogleIdentity } from "../../api/services/google-identity.service";

export type GoogleIdentityStatus = "unconfigured" | "loading" | "ready" | "error";

export type UseGoogleIdentityOptions = {
  clientId: string
  containerRef: RefObject<HTMLDivElement | null>
  onCredential: (idToken: string) => void
};

// GIS accepts a button width between 200 and 400 px.
const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400;

function buttonWidth(container: HTMLElement): number {
  const width = Math.round(container.getBoundingClientRect().width);

  return width > 0 ? Math.min(MAX_BUTTON_WIDTH, Math.max(MIN_BUTTON_WIDTH, width)) : MAX_BUTTON_WIDTH;
}

export function useGoogleIdentity({ clientId, containerRef, onCredential }: UseGoogleIdentityOptions): GoogleIdentityStatus {
  // Outcome of the last load, keyed by client ID; "loading" and "unconfigured" are derived.
  const [outcome, setOutcome] = useState<{ clientId: string, status: "ready" | "error" } | null>(null);
  const onCredentialRef = useRef(onCredential);

  useLayoutEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) {
      return undefined;
    }

    let active = true;

    loadGoogleIdentity()
      .then((google) => {
        const container = containerRef.current;

        if (!active || !container) {
          return;
        }

        google.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onCredentialRef.current(response.credential);
            }
          },
          ux_mode: "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
        });
        google.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: buttonWidth(container),
          locale: "es",
        });
        setOutcome({ clientId, status: "ready" });
      })
      .catch(() => {
        if (active) {
          setOutcome({ clientId, status: "error" });
        }
      });

    return () => {
      active = false;
    };
  }, [clientId, containerRef]);

  if (!clientId) {
    return "unconfigured";
  }

  return outcome?.clientId === clientId ? outcome.status : "loading";
}
