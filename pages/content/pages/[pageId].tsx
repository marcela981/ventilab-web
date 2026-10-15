/*
* Funcionalidad: Content page editor route
* Descripción: Thin route for /content/pages/[pageId]: composes the teacher layout (RequireRole TEACHER/ADMIN + AppShell) with the lazy PageEditorPage of the content-editor feature (block list, rich text, equations, video, explicit save, unsaved-changes guard). Reads pageId from the router query and renders nothing until it is known. Depends on next/router, @features/content-editor and @shared/layouts/teacher-layout.
* Versión: 1.0 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { PageEditorPage } from "@features/content-editor";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const ContentPageEditorRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const pageId = typeof query.pageId === "string" ? query.pageId : null;

  return pageId ? <PageEditorPage key={pageId} pageId={pageId} /> : null;
};

ContentPageEditorRoute.getLayout = withTeacherLayout;

export default ContentPageEditorRoute;
