/*
* Funcionalidad: usePostLoginRedirect
* Descripción: Once the backend session is authenticated (after a login, or when an already signed-in user opens the login page) and `ready` is true (router ready and, during a login, the NextAuth bridge finished; v1.1), navigates exactly once to the safe returnTo or the home of the user's role (resolvePostLoginRoute; v1.2: a returnTo the role cannot open also falls back to the role home). v1.2 (T9 follow-up, redirect loop): pages whose legacy guard does not recognise the backend session send the user back here, which used to loop forever; every redirect is now recorded (redirect-loop-guard) and a target that bounces back within 10 s falls back to the role home, and when the role home bounced too the hook stops and returns "blocked" so the page shows an error. The history is cleared whenever the session is unauthenticated. Returns "redirecting" while a redirect is pending (the page shows a loading state instead of the form), "blocked" or "idle". Depends on react, @shared/session, the loop guard and the navigation helper.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useMemo, useRef } from "react";
import { DEFAULT_ROUTE_BY_ROLE, resolvePostLoginRoute, useSession } from "@shared/session";
import {
  choosePostLoginTarget,
  clearRedirectHistory,
  readRedirectHistory,
  recordRedirect,
} from "../entities/redirect-loop-guard";
import { navigateTo } from "./navigation";

export type PostLoginRedirectState = "idle" | "redirecting" | "blocked";

export function usePostLoginRedirect(returnTo: string | null, ready: boolean): PostLoginRedirectState {
  const { status, role } = useSession();
  const redirectedRef = useRef(false);
  const authenticated = status === "authenticated" && role !== null;

  // undefined = nothing to decide yet; null = every candidate target bounced back (loop).
  const target = useMemo((): string | null | undefined => {
    if (!authenticated || !ready || role === null) {
      return undefined;
    }

    return choosePostLoginTarget(resolvePostLoginRoute(returnTo, role), DEFAULT_ROUTE_BY_ROLE[role], readRedirectHistory());
  }, [authenticated, ready, returnTo, role]);

  useEffect(() => {
    if (status === "unauthenticated") {
      clearRedirectHistory();

      return;
    }

    if (!target || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    recordRedirect(target);
    navigateTo(target);
  }, [status, target]);

  if (target === null) {
    return "blocked";
  }

  return authenticated ? "redirecting" : "idle";
}
