/*
* Funcionalidad: RoleHomeRedirect
* Descripción: Sends the visitor to their home once the session is known: authenticated → DEFAULT_ROUTE_BY_ROLE of the role (STUDENT /me, TEACHER and ADMIN /teacher); anonymous (or no role) → the login page. Shows the session loading state meanwhile and replaces the URL only once. Used by the role-aware entry pages (/ and the legacy /dashboard). Depends on React, next/router and the session context and route table.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import { DEFAULT_ROUTE_BY_ROLE, LOGIN_PATH } from "./routes.config";
import { SessionLoading } from "./session-loading";
import { useSession } from "./use-session";

export function RoleHomeRedirect() {
  const { status, role } = useSession();
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (status === "loading" || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    void router.replace(status === "authenticated" && role !== null ? DEFAULT_ROUTE_BY_ROLE[role] : LOGIN_PATH);
  }, [status, role, router]);

  return <SessionLoading />;
}
