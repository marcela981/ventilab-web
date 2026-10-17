/*
 * Funcionalidad: Legacy /panel/students/[id] redirect
 * Descripción: v2.0 (O6 operation): the legacy student detail is replaced by the teacher student page: this route only redirects, on the server, to /teacher/students/[id] with the same student user id (temporary redirect, legacyStudentDetailRedirect of @shared/session; no id → /teacher). Before v2.0 it rendered PanelLayout > PanelStudentDetail behind withTeacherAuth. The legacy components under src/features/admin/components/panel stay in the code until the closure (removal only with the author's approval).
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { legacyStudentDetailRedirect } from '@shared/session/legacy-redirects';

export const getServerSideProps = async ({ params }) => legacyStudentDetailRedirect(params?.id);

export default function LegacyPanelStudentDetailRedirect() {
  return null;
}
