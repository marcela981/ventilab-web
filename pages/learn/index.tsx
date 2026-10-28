/*
* Funcionalidad: Learn route
* Descripción: Thin route for /learn: composes the student layout (RequireAuth + AppShell; any authenticated role, staff in preview mode) with the LearnWorkspace of the learning feature. v1.1 (W3, Bloque 2): /learn is the tabbed workspace (?tab=inicio|curriculo|progreso, default curriculo; staff only see Currículo); imports the learn entry point instead of the feature barrel. Depends on @features/learning/learn.entry and @shared/layouts/student-layout.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LearnWorkspace } from "@features/learning/learn.entry";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LearnRoute: NextPageWithLayout = () => <LearnWorkspace />;

LearnRoute.getLayout = withStudentLayout;

export default LearnRoute;
