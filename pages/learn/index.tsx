/*
* Funcionalidad: Learn route
* Descripción: Thin route for /learn: composes the student layout (RequireAuth + AppShell; any authenticated role, staff in preview mode) with the LearnHomePage of the learning feature (sections with progress and "Continuar donde quedé"). Depends on @features/learning and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LearnHomePage } from "@features/learning";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const LearnRoute: NextPageWithLayout = () => <LearnHomePage />;

LearnRoute.getLayout = withStudentLayout;

export default LearnRoute;
