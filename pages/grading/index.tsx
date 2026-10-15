/*
* Funcionalidad: Grading queue route
* Descripción: Thin route for /grading: composes the teacher layout (staff only: teachers and admins) with the GradingQueuePage of the grading feature, the queue of attempts waiting for review (GET /api/evaluation-grading/queue). Depends on @features/grading and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { GradingQueuePage } from "@features/grading";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const GradingQueueRoute: NextPageWithLayout = () => <GradingQueuePage />;

GradingQueueRoute.getLayout = withTeacherLayout;

export default GradingQueueRoute;
