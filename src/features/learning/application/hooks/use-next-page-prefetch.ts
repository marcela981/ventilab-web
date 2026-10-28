/*
* Funcionalidad: useNextPagePrefetch
* Descripción: Once the current Page is on screen (W5, Bloque 2; DISENO_BLOQUE2 §2.7), warms up the next step of the lesson viewer so "Siguiente" paints without waiting: router.prefetch of its URL plus its data loaded into the SWR cache, the Page itself (`GET /api/pages/{id}`) when the next step is inside the same lesson, or the Pages of the next lesson (`GET /api/pages?lessonId=`) when it crosses to another one (its Page id is not known yet, and the next lesson may still be locked for the student). The data goes through an idle useApiQuery with the learning cache config rather than SWR's global `preload`: it lands in the app's (scoped) cache and the 60 s dedupe makes the real navigation reuse it without a second request, and an unused prefetch never leaves a stale promise behind. Failures are ignored (the navigation requests again). Depends on next/router, @shared/api-client and the curriculum service.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { LESSON_PAGES_PATH, PAGE_PATH } from "../../api/services/curriculum.service";
import { LEARNING_QUERY_CONFIG } from "../entities/learning-query-config";

export type NextPageTarget = {
  href: string
  // Set when the next step is a Page of the same lesson.
  pageId: string | null
  // Set when the next step is page 1 of another lesson.
  lessonId: string | null
};

const ignore = (): undefined => undefined;

export function useNextPagePrefetch(visiblePageId: string | null, target: NextPageTarget | null): void {
  const router = useRouter();
  // The router object changes on every navigation; the prefetch belongs to the visible Page only.
  const routerRef = useRef(router);
  const ready = visiblePageId !== null && target !== null;
  const href = ready ? target.href : null;
  const pageId = ready ? target.pageId : null;
  const lessonId = ready ? target.lessonId : null;

  useApiQuery(pageId ? PAGE_PATH : null, { params: { id: pageId ?? "" } }, LEARNING_QUERY_CONFIG);
  useApiQuery(lessonId ? LESSON_PAGES_PATH : null, { query: { lessonId: lessonId ?? "" } }, LEARNING_QUERY_CONFIG);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (href !== null) {
      Promise.resolve(routerRef.current.prefetch(href)).catch(ignore);
    }
  }, [visiblePageId, href]);
}
