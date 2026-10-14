/*
* Funcionalidad: RequireAuth guard
* Descripción: Renders its children only for an authenticated backend session. While the session loads it shows SessionLoading; when unauthenticated it calls router.replace once with the login URL and a safe returnTo (the current asPath), waiting for router.isReady so dynamic routes carry their real path. Protected content never flashes. v1.1 (T9): after a voluntary sign-out (`signedOut`) it goes to a clean login without returnTo. Depends on next/router, use-session, routes.config and session-loading.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { buildLoginUrl, LOGIN_PATH } from "./routes.config";
import { SessionLoading } from "./session-loading";
import { useSession } from "./use-session";

export type RequireAuthProps = {
  children: ReactNode
};

export function RequireAuth({ children }: RequireAuthProps) {
  const { status, signedOut = false } = useSession();
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
    void router.replace(signedOut ? LOGIN_PATH : buildLoginUrl(router.asPath));
  }, [status, signedOut, router, router.isReady, router.asPath]);

  if (status !== "authenticated") {
    return <SessionLoading />;
  }

  return <>{children}</>;
}
