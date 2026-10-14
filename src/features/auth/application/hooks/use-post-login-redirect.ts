/*
* Funcionalidad: usePostLoginRedirect
* Descripción: Once the backend session is authenticated (after a login, or when an already signed-in user opens the login page) and `ready` is true (router ready and, during a login, the NextAuth bridge finished; v1.1), navigates exactly once to the safe returnTo or the home of the user's role (resolvePostLoginRoute). Returns true while that redirect is pending so the page shows a loading state instead of the form. Depends on react, @shared/session and the navigation helper.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useRef } from "react";
import { resolvePostLoginRoute, useSession } from "@shared/session";
import { navigateTo } from "./navigation";

export function usePostLoginRedirect(returnTo: string | null, ready: boolean): boolean {
  const { status, role } = useSession();
  const redirectedRef = useRef(false);
  const authenticated = status === "authenticated" && role !== null;

  useEffect(() => {
    if (!authenticated || !ready || redirectedRef.current || role === null) {
      return;
    }

    redirectedRef.current = true;
    navigateTo(resolvePostLoginRoute(returnTo, role));
  }, [authenticated, ready, returnTo, role]);

  return authenticated;
}
