/*
* Funcionalidad: useStudentTimeline
* Descripción: Reads one window of a student's activity timeline (`GET /api/analytics/students/{userId}/timeline?from&to`, at most 366 days, up to 200 entries per source; `truncated` tells when the API cut it) through useApiQuery. Every window of the page uses its own key, so the timeline list and the simulation sessions list share the same cached request. Depends on React, @shared/api-client and the teacher dashboard mapper, service and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toStudentTimeline } from "../../api/mappers/teacher-dashboard.mapper";
import { STUDENT_TIMELINE_PATH } from "../../api/services/teacher-dashboard.service";
import type { StudentTimeline, TimelineWindow } from "../entities/student-timeline.entity";

export type UseStudentTimelineResult = {
  timeline: StudentTimeline | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useStudentTimeline(userId: string, window: TimelineWindow): UseStudentTimelineResult {
  const { data, error, isLoading, mutate } = useApiQuery(STUDENT_TIMELINE_PATH, {
    params: { userId },
    query: { from: window.from, to: window.to },
  });
  const timeline = useMemo(() => (data ? toStudentTimeline(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { timeline, isLoading, error: error ?? null, reload };
}
