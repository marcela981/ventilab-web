/*
* Funcionalidad: Lazy admin console pages
* Descripción: Lazy entry points of /admin/users (AdminUsersPage) and /admin/settings (AdminSettingsPage): each page module loads through React.lazy + retryImport inside RouteErrorBoundary and Suspense (skeleton fallback), so the feature barrel stays light. v1.1 (O4b): AdminAuditPage (/admin/audit), AdminAiAnalyticsPage (/admin/ai), AdminResearchPage (/admin/research) and SystemStatusPage (/admin/status), each lazy with its own skeleton. Depends on React, the design-system skeletons and route error boundary and @shared/lib/retry-import.
* Versión: 1.1
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

const LoadedAdminAuditPage = lazy(() =>
  retryImport(() => import("./admin-audit.page")).then((module) => ({ default: module.AdminAuditPage })),
);

const LoadedAdminAiAnalyticsPage = lazy(() =>
  retryImport(() => import("./admin-ai-analytics.page")).then((module) => ({ default: module.AdminAiAnalyticsPage })),
);

const LoadedAdminResearchPage = lazy(() =>
  retryImport(() => import("./admin-research.page")).then((module) => ({ default: module.AdminResearchPage })),
);

const LoadedSystemStatusPage = lazy(() =>
  retryImport(() => import("./system-status.page")).then((module) => ({ default: module.SystemStatusPage })),
);

// TODO(i18n): move to an admin-console namespace in src/i18n.
const LOADING_LABELS = {
  users: "Cargando los usuarios…",
  settings: "Cargando la configuración…",
  audit: "Cargando la auditoría…",
  ai: "Cargando la analítica de IA…",
  research: "Cargando la exportación para investigación…",
  status: "Cargando el estado del sistema…",
} as const;

export function AdminAuditPage() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<ListSkeleton rows={5} label={LOADING_LABELS.audit} />}>
        <LoadedAdminAuditPage />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function AdminAiAnalyticsPage() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABELS.ai} />}>
        <LoadedAdminAiAnalyticsPage />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function AdminResearchPage() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABELS.research} />}>
        <LoadedAdminResearchPage />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function SystemStatusPage() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABELS.status} />}>
        <LoadedSystemStatusPage />
      </Suspense>
    </RouteErrorBoundary>
  );
}

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
