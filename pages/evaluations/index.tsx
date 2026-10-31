/*
* Funcionalidad: Evaluations route
* Descripción: Thin route for /evaluations: composes the student layout (RequireAuth + AppShell; every authenticated role may open it) and decides by role (DISENO_BLOQUE3 §2.6). Students get the EvaluationsListPage (grouped list; `?moduleId=` narrows it to one curriculum module); teachers and admins get the StaffEvaluationsHub (Gestionar, Calificar, Resultados), loaded lazily with retryImport so its chunk is never downloaded by students. Imports the feature entry points (no barrel). v1.1 (Bloque 3, W5): role decision and staff hub.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { lazy, Suspense } from "react";
import { EvaluationsListPage } from "@features/evaluations/list.entry";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";
import { retryImport } from "@shared/lib/retry-import";
import { useSession } from "@shared/session/use-session";

const StaffEvaluationsHub = lazy(() =>
  retryImport(() => import("@features/evaluation-authoring/staff-hub.entry")).then((module) => ({ default: module.StaffEvaluationsHub })),
);

// TODO(i18n): move to an evaluations namespace in src/i18n.
const LOADING_LABEL = "Cargando evaluaciones…";

const EvaluationsRoute: NextPageWithLayout = () => {
  const { role } = useSession();
  const { query } = useRouter();

  if (role === "TEACHER" || role === "ADMIN") {
    return (
      <RouteErrorBoundary>
        <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
          <StaffEvaluationsHub />
        </Suspense>
      </RouteErrorBoundary>
    );
  }

  return role === null ? null : <EvaluationsListPage moduleId={typeof query.moduleId === "string" ? query.moduleId : null} />;
};

EvaluationsRoute.getLayout = withStudentLayout;

export default EvaluationsRoute;
