/*
* Funcionalidad: Clinical cases route
* Descripción: Thin route for /simulator/cases: composes the teacher layout (staff only: teachers and admins) with the CaseListPage of the case-editor feature (filters, pagination, edit, duplicate, publish and archive). Depends on @features/case-editor and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CaseListPage } from "@features/case-editor";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const ClinicalCasesRoute: NextPageWithLayout = () => <CaseListPage />;

ClinicalCasesRoute.getLayout = withTeacherLayout;

export default ClinicalCasesRoute;
