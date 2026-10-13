/*
* Funcionalidad: RequireRole guard
* Descripción: Wraps RequireAuth and renders its children only when the session role is one of `roles`. A wrong role is redirected once (router.replace) to that role's default landing route from routes.config instead of a forbidden view (simpler; every landing route is reachable by its own role, which the route-table tests assert). Content never flashes while redirecting. Depends on next/router, require-auth, use-session, routes.config and session-loading.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { RequireAuth } from "./require-auth";
import { DEFAULT_ROUTE_BY_ROLE } from "./routes.config";
import type { Role } from "./session.entity";
import { SessionLoading } from "./session-loading";
import { useSession } from "./use-session";

export type RequireRoleProps = {
  roles: readonly Role[]
  children: ReactNode
};

function RoleCheck({ roles, children }: RequireRoleProps) {
  const { role } = useSession();
  const router = useRouter();
  const redirectedRef = useRef(false);
  const allowed = role !== null && roles.includes(role);

  useEffect(() => {
    if (allowed || role === null) {
      redirectedRef.current = false;

      return;
    }

    if (redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    void router.replace(DEFAULT_ROUTE_BY_ROLE[role]);
  }, [allowed, role, router]);

  if (!allowed) {
    return <SessionLoading />;
  }

  return <>{children}</>;
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  return (
    <RequireAuth>
      <RoleCheck roles={roles}>{children}</RoleCheck>
    </RequireAuth>
  );
}
