/*
* Funcionalidad: Content route
* Descripción: Thin route for /content: composes the teacher layout (RequireRole TEACHER/ADMIN + AppShell) with the ContentTreePage of the content-editor feature, the editor tree Sección > Nivel > Módulo > Lección > Página (create, edit, status, delete, reorder). Depends on @features/content-editor and @shared/layouts/teacher-layout. v1.1 (W6, Bloque 2): passes ?node= (level:<id> | module:<id>, the learning "Editar en el CMS" links) to the tree page.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { ContentTreePage } from "@features/content-editor";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const ContentRoute: NextPageWithLayout = () => {
  const { query } = useRouter();
  const node = typeof query.node === "string" ? query.node : null;

  return <ContentTreePage focusNode={node} />;
};

ContentRoute.getLayout = withTeacherLayout;

export default ContentRoute;
