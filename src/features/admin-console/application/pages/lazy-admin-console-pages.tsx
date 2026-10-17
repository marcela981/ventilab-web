/*
* Funcionalidad: Lazy admin console pages
* Descripción: Lazy entry points of /admin/users (AdminUsersPage) and /admin/settings (AdminSettingsPage): each page module loads through React.lazy + retryImport inside RouteErrorBoundary and Suspense (skeleton fallback), so the feature barrel stays light. Depends on React, the design-system skeletons and route error boundary and @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton, ListSkeleton } from "@shared/design-system/components/skeleton";
import { retryImport } from "@shared/lib/retry-import";

const LoadedAdminUsersPage = lazy(() =>
  retryImport(() => import("./admin-users.page")).then((module) => ({ default: module.AdminUsersPage })),
);

const LoadedAdminSettingsPage = lazy(() =>
  retryImport(() => import("./admin-settings.page")).then((module) => ({ default: module.AdminSettingsPage })),
);

// TODO(i18n): move to an admin-console namespace in src/i18n.
const LOADING_LABELS = {
  users: "Cargando los usuarios…",
  settings: "Cargando la configuración…",
} as const;

export function AdminUsersPage() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<ListSkeleton rows={5} label={LOADING_LABELS.users} />}>
        <LoadedAdminUsersPage />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function AdminSettingsPage() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABELS.settings} />}>
        <LoadedAdminSettingsPage />
      </Suspense>
    </RouteErrorBoundary>
  );
}
