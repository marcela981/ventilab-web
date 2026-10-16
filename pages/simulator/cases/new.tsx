/*
* Funcionalidad: New clinical case route
* Descripción: Thin route for /simulator/cases/new: composes the teacher layout (staff only: teachers and admins) with the CaseEditorPage of the case-editor feature in creation mode; the first save posts the case (POST /api/clinical-cases) and replaces the route with its editor. Depends on @features/case-editor and @shared/layouts/teacher-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CaseEditorPage } from "@features/case-editor";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const NewClinicalCaseRoute: NextPageWithLayout = () => <CaseEditorPage caseId={null} />;

NewClinicalCaseRoute.getLayout = withTeacherLayout;

export default NewClinicalCaseRoute;
