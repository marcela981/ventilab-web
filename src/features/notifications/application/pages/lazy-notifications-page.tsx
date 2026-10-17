/*
* Funcionalidad: Lazy NotificationsPage
* Descripción: Lazy entry point of the /notifications page: loads notifications.page through React.lazy + retryImport inside RouteErrorBoundary and Suspense (list skeleton fallback), so the feature barrel stays light for pages/_app.js. Depends on React, the design-system skeleton and route error boundary and @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { retryImport } from "@shared/lib/retry-import";
import type { NotificationsPageProps } from "./notifications.page";

const LoadedNotificationsPage = lazy(() =>
  retryImport(() => import("./notifications.page")).then((module) => ({ default: module.NotificationsPage })),
);

// TODO(i18n): move to a notifications namespace in src/i18n.
const LOADING_LABEL = "Cargando notificaciones…";

export function NotificationsPage(props: NotificationsPageProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<ListSkeleton rows={4} label={LOADING_LABEL} />}>
        <LoadedNotificationsPage {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
