/*
* Funcionalidad: Edit clinical case route
* Descripción: Thin route for /simulator/cases/[id]/edit: composes the teacher layout (staff only: teachers and admins) with the CaseEditorPage of the case-editor feature for the case in the route (GET /definition, PUT on save). A different id remounts the editor, so no draft leaks between cases. v1.1 (T12): the editor tools (expert validation, server test run, local preview, delete → archive) in the editor slot. Depends on next/router, @features/case-editor and @shared/layouts/teacher-layout.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { CaseEditorPage, renderCaseEditorTools } from "@features/case-editor";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const EditClinicalCaseRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const caseId = typeof query.id === "string" ? query.id : null;

  return caseId ? <CaseEditorPage key={caseId} caseId={caseId} renderTools={renderCaseEditorTools} /> : null;
};

EditClinicalCaseRoute.getLayout = withTeacherLayout;

export default EditClinicalCaseRoute;
