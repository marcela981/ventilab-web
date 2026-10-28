/*
* Funcionalidad: useLessonAccess
* Descripción: Reads whether the signed-in student may open a lesson (`GET /api/lessons/{id}/access`, W5 Bloque 2) through useApiQuery with the learning cache config and maps it to a LessonLock (null when allowed). The viewer fires it in parallel with the lesson Pages, never before them: the content request does not wait for it (the server answers 403 progress.lesson_locked anyway). A null lessonId disables it (staff preview: the server always allows them). Depends on @shared/api-client and the curriculum mapper/service.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toLessonLock } from "../../api/mappers/curriculum.mapper";
import { LESSON_ACCESS_PATH } from "../../api/services/curriculum.service";
import type { LessonLock } from "../entities/lesson.entity";
import { LEARNING_QUERY_CONFIG } from "../entities/learning-query-config";

export type UseLessonAccessResult = {
  // undefined while unknown (loading, failed or disabled), null when allowed.
  lock: LessonLock | null | undefined
};

export function useLessonAccess(lessonId: string | null): UseLessonAccessResult {
  const { data } = useApiQuery(lessonId ? LESSON_ACCESS_PATH : null, { params: { id: lessonId ?? "" } }, LEARNING_QUERY_CONFIG);
  const lock = useMemo(() => (data ? toLessonLock(data.data) : undefined), [data]);

  return { lock };
}
