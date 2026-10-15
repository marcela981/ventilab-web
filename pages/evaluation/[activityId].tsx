/*
* Funcionalidad: Legacy /evaluation/[activityId] redirect
* Descripción: R1: the legacy /evaluation/[activityId] route (old Activity/Quiz/Submission screen) now only redirects to /evaluations with a history replace and no query string (legacy activity ids do not exist in the new evaluation model). Bare layout (no legacy shell); the destination page applies its own guards. Depends on @features/evaluations and @shared/layouts/get-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LegacyEvaluationRedirect } from "@features/evaluations";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";

const LegacyEvaluationActivityRedirect: NextPageWithLayout = () => <LegacyEvaluationRedirect from="/evaluation/[activityId]" />;

LegacyEvaluationActivityRedirect.getLayout = (page) => page;

export default LegacyEvaluationActivityRedirect;
