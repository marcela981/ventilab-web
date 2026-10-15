/*
* Funcionalidad: GradingPendingBadgeSync
* Descripción: Entry point of the pending-grading navigation badge, mounted once in pages/_app.js inside the NavBadgeProvider. Only an authenticated teacher or admin (backend session of @shared/session) loads GradingPendingBadgeLoader, through React.lazy + retryImport, so students and the app shell chunk never pull the api-client request layer; a chunk that still fails to load renders nothing (the badge is optional). Depends on React, @shared/session and @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { retryImport } from "@shared/lib/retry-import";
import { useSession } from "@shared/session/use-session";

function NoBadge() {
  return null;
}

const LoadedGradingPendingBadge = lazy(() =>
  retryImport(() => import("./grading-pending-badge-loader"))
    .then((module) => ({ default: module.GradingPendingBadgeLoader }))
    .catch(() => ({ default: NoBadge })),
);

export function GradingPendingBadgeSync() {
  const { status, hasRole } = useSession();

  if (status !== "authenticated" || !hasRole("TEACHER", "ADMIN")) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LoadedGradingPendingBadge />
    </Suspense>
  );
}
