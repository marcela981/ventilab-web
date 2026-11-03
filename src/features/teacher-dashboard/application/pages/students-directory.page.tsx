/*
* Funcionalidad: StudentsDirectoryPage
* Descripción: Page of /teacher/students, the students directory of the staff panel that replaces July's /panel/students (DISENO_BLOQUE4 §2.3: Directorio and Estadísticas tabs, "Todos" / "Mis grupos", search, paging, sorting and "Conformar grupo"). v1.0 (W1 Bloque 4): minimal placeholder with the page title, so the route, the panel item and the /panel/students redirect work; the directory itself comes in a later task. Depends on the design-system page header.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { PageHeader } from "@shared/design-system/components/page-header";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENTS_DIRECTORY_COPY = {
  title: "Estudiantes",
} as const;

export function StudentsDirectoryPage() {
  return <PageHeader title={STUDENTS_DIRECTORY_COPY.title} />;
}
