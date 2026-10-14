/*
* Funcionalidad: Lazy staff groups pages
* Descripción: On-demand entry points of the staff groups pages exported by the groups barrel: GroupsPage (/groups) and GroupDetailPage (/groups/[groupId]) load their page module with React.lazy + retryImport (3 attempts with backoff) behind a LoadingState, inside a RouteErrorBoundary (a chunk that still fails shows "Recargar"). Because the barrel is shared by every groups route, this keeps the staff code (dialogs, tables, member search, supervisions) out of the student-only /my-group bundle. Same pattern as @shared/rich-content. Depends on React, @shared/design-system and @shared/lib.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { retryImport } from "@shared/lib/retry-import";
import type { GroupDetailPageProps } from "./group-detail.page";

const LoadedGroupsPage = lazy(() =>
  retryImport(() => import("./groups.page")).then((module) => ({ default: module.GroupsPage })),
);

const LoadedGroupDetailPage = lazy(() =>
  retryImport(() => import("./group-detail.page")).then((module) => ({ default: module.GroupDetailPage })),
);

// TODO(i18n): move to a groups namespace in src/i18n.
const LOADING_LABEL = "Cargando grupos…";

function StaffPageBoundary({ children }: { children: ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>{children}</Suspense>
    </RouteErrorBoundary>
  );
}

export function GroupsPage() {
  return (
    <StaffPageBoundary>
      <LoadedGroupsPage />
    </StaffPageBoundary>
  );
}

export function GroupDetailPage({ groupId }: GroupDetailPageProps) {
  return (
    <StaffPageBoundary>
      <LoadedGroupDetailPage groupId={groupId} />
    </StaffPageBoundary>
  );
}
