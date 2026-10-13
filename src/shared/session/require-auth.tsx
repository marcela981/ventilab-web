/*
* Funcionalidad: RequireAuth guard
* Descripción: Renders its children only for an authenticated backend session. While the session loads it shows SessionLoading; when unauthenticated it calls router.replace once with the login URL and a safe returnTo (the current asPath), waiting for router.isReady so dynamic routes carry their real path. Protected content never flashes. Depends on next/router, use-session, routes.config and session-loading.
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
import { buildLoginUrl } from "./routes.config";
import { SessionLoading } from "./session-loading";
import { useSession } from "./use-session";

export type RequireAuthProps = {
  children: ReactNode
};

export function RequireAuth({ children }: RequireAuthProps) {
  const { status } = useSession();
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (status !== "unauthenticated") {
      redirectedRef.current = false;

      return;
    }

    if (!router.isReady || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    void router.replace(buildLoginUrl(router.asPath));
  }, [status, router, router.isReady, router.asPath]);

  if (status !== "authenticated") {
    return <SessionLoading />;
  }

  return <>{children}</>;
}
