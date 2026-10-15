/*
* Funcionalidad: Content route
* Descripción: Thin route for /content: composes the teacher layout (RequireRole TEACHER/ADMIN + AppShell) with the ContentTreePage of the content-editor feature, the editor tree Sección > Nivel > Módulo > Lección > Página (create, edit, status, delete, reorder). Depends on @features/content-editor and @shared/layouts/teacher-layout.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ContentTreePage } from "@features/content-editor";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withTeacherLayout } from "@shared/layouts/teacher-layout";

const ContentRoute: NextPageWithLayout = () => <ContentTreePage />;

ContentRoute.getLayout = withTeacherLayout;

export default ContentRoute;
