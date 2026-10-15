/*
* Funcionalidad: GradingPendingBadgeSync
* Descripción: Entry point of the pending-grading navigation badge, mounted once in pages/_app.js inside the NavBadgeProvider. Only an authenticated teacher or admin (backend session of @shared/session) loads GradingPendingBadgeLoader, through React.lazy + retryImport, so students and the app shell chunk never pull the api-client request layer; a chunk that still fails to load renders nothing (the badge is optional). Depends on React, @shared/session and @shared/lib/retry-import. v1.1 (G1 review W2/S5/S6): the loader only mounts while a badge host (the AppShell) is on screen (useNavBadgesVisible of @shared/layouts/nav-badges), so legacy pages without the shell do not poll the queue (each queue read lazily closes expired attempts on the backend); a render error of the loader is caught by a local boundary that renders nothing. pages/_app.js imports this module by its direct path, not through the grading barrel. Also depends on @shared/layouts/nav-badges.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Component, lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { useNavBadgesVisible } from "@shared/layouts/nav-badges";
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

type BadgeBoundaryState = { failed: boolean };

// The badge is optional: a failure while rendering it must never break the app.
export class BadgeErrorBoundary extends Component<{ children: ReactNode }, BadgeBoundaryState> {
  override state: BadgeBoundaryState = { failed: false };

  static getDerivedStateFromError(): BadgeBoundaryState {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function GradingPendingBadgeSync() {
  const { status, hasRole } = useSession();
  const visible = useNavBadgesVisible();

  if (status !== "authenticated" || !hasRole("TEACHER", "ADMIN") || !visible) {
    return null;
  }

  return (
    <BadgeErrorBoundary>
      <Suspense fallback={null}>
        <LoadedGradingPendingBadge />
      </Suspense>
    </BadgeErrorBoundary>
  );
}
