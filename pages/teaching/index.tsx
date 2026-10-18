/*
* Funcionalidad: Legacy teaching hub redirect (/teaching)
* Descripción: The legacy teaching hub (TeachingModule) is gone. A legacy inline-lesson link (/teaching?moduleId=&lessonId=) redirects server-side to page 1 of the equivalent lesson of the learning feature; any other visit goes to the learning home (/learn). Temporary (307) until the redirects are centralised in next.config. v2.0 (B3.4, D1): replaces the hub page. Depends on next and @features/learning.
* Versión: 2.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
import type { GetServerSideProps } from "next";
import { LEARN_HOME_URL, resolveLegacyLessonUrl } from "@features/learning";

export const getServerSideProps: GetServerSideProps = async ({ query }) => ({
  redirect: { destination: resolveLegacyLessonUrl(query) ?? LEARN_HOME_URL, permanent: false },
});

export default function LegacyTeachingRedirect(): null {
  return null;
}
