/*
* Funcionalidad: Legacy /evaluation/manage/[activityId]/edit redirect
* Descripción: R1: the legacy /evaluation/manage/[activityId]/edit route (old Activity/Quiz/Submission screen) now only redirects to /evaluations/manage with a history replace and no query string (legacy activity ids do not exist in the new evaluation model). Bare layout (no legacy shell); the destination page applies its own guards. Depends on @features/evaluations and @shared/layouts/get-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LegacyEvaluationRedirect } from "@features/evaluations";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";

const LegacyEvaluationEditRedirect: NextPageWithLayout = () => <LegacyEvaluationRedirect from="/evaluation/manage/[activityId]/edit" />;

LegacyEvaluationEditRedirect.getLayout = (page) => page;

export default LegacyEvaluationEditRedirect;
