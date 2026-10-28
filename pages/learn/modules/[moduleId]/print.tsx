/*
* Funcionalidad: Learn module print route
* Descripción: Thin route for /learn/modules/[moduleId]/print (TEACHER, ADMIN): composes the learning print layout (RequireRole with the route roles and no app shell, so only the module is printed) with the ModulePrintPage of the learning feature for the moduleId of the URL (one GET /api/modules/{id}/full request, "Descargar PDF" = window.print()). Renders nothing until the router query is ready. Depends on next/router and @features/learning/print.entry. v1.1 (W3, Bloque 2): imports the print entry point instead of the feature barrel.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { ModulePrintPage, parseRouteId, withPrintLayout } from "@features/learning/print.entry";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";

const LearnModulePrintRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const moduleId = parseRouteId(query.moduleId);

  return moduleId ? <ModulePrintPage moduleId={moduleId} /> : null;
};

LearnModulePrintRoute.getLayout = withPrintLayout;

export default LearnModulePrintRoute;
