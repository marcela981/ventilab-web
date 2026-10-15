/*
* Funcionalidad: New evaluation route
* Descripción: Thin route for /evaluations/manage/new: composes the teacher layout (staff only: teachers and admins) with the EvaluationBuilderPage of the evaluation-authoring feature in creation mode; the first save posts the evaluation (POST /api/evaluations) and replaces the route with its editor. Depends on @features/evaluation-authoring and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { EvaluationBuilderPage } from "@features/evaluation-authoring";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const NewEvaluationRoute: NextPageWithLayout = () => <EvaluationBuilderPage evaluationId={null} />;

NewEvaluationRoute.getLayout = withTeacherLayout;

export default NewEvaluationRoute;
