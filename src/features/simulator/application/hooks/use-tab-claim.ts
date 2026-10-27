/*
* Funcionalidad: useTabClaim
* Descripción: Claims a simulation session for this browser tab while the host is mounted (W2, Bloque 1: moved
*   unchanged out of the session console page so any session host can use it). "pending" until the claim resolves; a
*   failing claim fails open ("claimed"). A page that may enter the back/forward cache (`pagehide` with `persisted`)
*   releases the claim, since a held Web Lock blocks the cache, and claims it again when it is restored (`pageshow`
*   with `persisted`); the status stays until that new claim resolves. A superseded claim is released at once.
*   Depends on React and the session tab claim.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useRef, useState } from "react";
import { sessionTabClaimer } from "../session/session-tab-claim";
import type { TabClaimResult } from "../session/session-tab-claim";

export type ClaimFn = (sessionId: string) => Promise<TabClaimResult>;

export type TabClaimStatus = "pending" | "claimed" | "taken";

export const defaultClaim: ClaimFn = (sessionId) => sessionTabClaimer.claim(sessionId);

type TabClaimState = { sessionId: string, status: "claimed" | "taken" } | null;

export function useTabClaim(sessionId: string, claim: ClaimFn): TabClaimStatus {
  const [state, setState] = useState<TabClaimState>(null);
  const claimRef = useRef(claim);

  useEffect(() => {
    claimRef.current = claim;
  });

  useEffect(() => {
    let active = true;
    // Bumped by every claim and release, so the result of a superseded claim is released at once.
    let generation = 0;
    const held: { release: (() => void) | null } = { release: null };

    const releaseHeld = (): void => {
      generation += 1;
      held.release?.();
      held.release = null;
    };

    const acquire = (): void => {
      const own = generation;

      void claimRef.current(sessionId).then((result) => {
        if (result.status === "claimed") {
          if (!active || own !== generation) {
            result.release();

            return;
          }

          held.release = result.release;
        }

        if (active && own === generation) {
          setState({ sessionId, status: result.status });
        }
      }, () => {
        // A failing claim must not block the student: fail open.
        if (active && own === generation) {
          setState({ sessionId, status: "claimed" });
        }
      });
    };

    const onPageHide = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        releaseHeld();
      }
    };
    const onPageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        releaseHeld();
        acquire();
      }
    };

    acquire();
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      active = false;
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      releaseHeld();
    };
  }, [sessionId]);

  return state?.sessionId === sessionId ? state.status : "pending";
}
