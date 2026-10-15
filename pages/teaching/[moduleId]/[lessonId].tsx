/*
* Funcionalidad: Legacy lesson route redirect (/teaching/[moduleId]/[lessonId])
* Descripción: The legacy lesson viewer route (LearningProgressProvider + LessonViewerRouteAdapter) now redirects server-side to page 1 of the equivalent lesson in the learning feature (/learn/modules/[moduleId]/lessons/[lessonId]/1). Seeded module and lesson ids are identical in the legacy curriculum and the backend; the legacy viewer kept its page pointer in memory, so there is no page to carry over. Missing ids redirect to /learn. Temporary (307) so the target can still change while the legacy modules coexist. v2.0 (R1): replaces the legacy viewer page. Depends on next and @features/learning.
* Versión: 2.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
import type { GetServerSideProps } from "next";
import { LEARN_HOME_URL, resolveLegacyLessonUrl } from "@features/learning";

export const getServerSideProps: GetServerSideProps = async ({ params }) => ({
  redirect: { destination: resolveLegacyLessonUrl(params ?? {}) ?? LEARN_HOME_URL, permanent: false },
});

export default function LegacyLessonRedirect(): null {
  return null;
}
