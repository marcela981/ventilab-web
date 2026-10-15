/*
* Funcionalidad: Evaluations manage route
* Descripción: Thin route for /evaluations/manage: composes the teacher layout (staff only: teachers and admins) with the EvaluationsManagePage of the evaluation-authoring feature, which lists, filters, duplicates and archives the evaluations the caller can author (GET /api/evaluations). Depends on @features/evaluation-authoring and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { EvaluationsManagePage } from "@features/evaluation-authoring";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const EvaluationsManageRoute: NextPageWithLayout = () => <EvaluationsManagePage />;

EvaluationsManageRoute.getLayout = withTeacherLayout;

export default EvaluationsManageRoute;
