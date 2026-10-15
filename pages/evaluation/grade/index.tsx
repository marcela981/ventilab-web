/*
* Funcionalidad: Legacy /evaluation/grade redirect
* Descripción: R1: the legacy /evaluation/grade route (old Activity/Quiz/Submission screen) now only redirects to /grading with a history replace and no query string. Bare layout (no legacy shell); the destination page applies its own guards. Depends on @features/evaluations and @shared/layouts/get-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LegacyEvaluationRedirect } from "@features/evaluations";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";

const LegacyEvaluationGradeRedirect: NextPageWithLayout = () => <LegacyEvaluationRedirect from="/evaluation/grade" />;

LegacyEvaluationGradeRedirect.getLayout = (page) => page;

export default LegacyEvaluationGradeRedirect;
