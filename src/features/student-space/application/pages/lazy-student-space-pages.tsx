/*
* Funcionalidad: Lazy student space pages
* Descripción: Lazy entry points of /me (StudentHomePage), /me/notes (MyNotesPage) and /me/grades (MyGradesPage): each page module loads through React.lazy + retryImport inside RouteErrorBoundary and Suspense (skeleton fallback), so the feature barrel stays light and /me/notes alone pulls the learning notes components. Depends on React, the design-system skeletons and route error boundary and @shared/lib/retry-import.
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
import type { StudentHomePageProps } from "./student-home.page";

const LoadedStudentHomePage = lazy(() =>
  retryImport(() => import("./student-home.page")).then((module) => ({ default: module.StudentHomePage })),
);

const LoadedMyNotesPage = lazy(() =>
  retryImport(() => import("./my-notes.page")).then((module) => ({ default: module.MyNotesPage })),
);

const LoadedMyGradesPage = lazy(() =>
  retryImport(() => import("./my-grades.page")).then((module) => ({ default: module.MyGradesPage })),
);

// TODO(i18n): move to a student-space namespace in src/i18n.
const LOADING_LABELS = {
  home: "Cargando tu espacio…",
  notes: "Cargando tus notas…",
  grades: "Cargando tus calificaciones…",
} as const;

export function StudentHomePage(props: StudentHomePageProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABELS.home} />}>
        <LoadedStudentHomePage {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function MyNotesPage() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<ListSkeleton rows={4} label={LOADING_LABELS.notes} />}>
        <LoadedMyNotesPage />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function MyGradesPage() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<ListSkeleton rows={4} label={LOADING_LABELS.grades} />}>
        <LoadedMyGradesPage />
      </Suspense>
    </RouteErrorBoundary>
  );
}
