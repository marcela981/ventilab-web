/*
* Funcionalidad: Lazy teacher dashboard pages
* Descripción: Lazy entry points of /teacher (TeacherDashboardPage) and /teacher/students/[userId] (StudentDetailPage): each page module loads through React.lazy + retryImport inside RouteErrorBoundary and Suspense (skeleton fallback), so the feature barrel stays light. Depends on React, the design-system skeletons and route error boundary and @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { retryImport } from "@shared/lib/retry-import";
import type { StudentDetailPageProps } from "./student-detail.page";

const LoadedTeacherDashboardPage = lazy(() =>
  retryImport(() => import("./teacher-dashboard.page")).then((module) => ({ default: module.TeacherDashboardPage })),
);

const LoadedStudentDetailPage = lazy(() =>
  retryImport(() => import("./student-detail.page")).then((module) => ({ default: module.StudentDetailPage })),
);

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
const LOADING_LABELS = {
  dashboard: "Cargando el panel docente…",
  student: "Cargando el estudiante…",
} as const;

export function TeacherDashboardPage() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABELS.dashboard} />}>
        <LoadedTeacherDashboardPage />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function StudentDetailPage(props: StudentDetailPageProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABELS.student} />}>
        <LoadedStudentDetailPage {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
