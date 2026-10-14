/*
* Funcionalidad: usePageViewTracker
* Descripción: Registers a page view (`POST /api/progress/pages/{pageId}/view`) when the user stays on the page for 5 s OR presses "Siguiente" (markViewedNow), whichever comes first, exactly once per visit. A visit is the mount of the hook for a given pageId: a new pageId starts a new visit, unmounting before 5 s registers nothing, and coming back later is a new visit (the endpoint is idempotent). Preview mode (teacher/admin) never registers. After success the cached module progress takes the response values for that lesson (viewedPages, totalPages, and completion only when the response says so; percentages are never recalculated here) and the module, level, section and summary progress plus the curriculum tree (locks may open) are invalidated. markViewedNow never rejects: the Next button may await it or fire and forget; failures are swallowed because progress is retried on the next visit. Depends on SWR, @shared/api-client, the progress service and usePreviewMode.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import type { ApiResult } from "@shared/api-client/api-types";
import { apiQueryKey, invalidateApiQueries } from "@shared/api-client/use-api-query";
import type { ModuleProgressDTO, PageViewResultDTO } from "../../api/dtos/progress.dto";
import { MODULE_PROGRESS_PATH, PAGE_VIEW_INVALIDATES, recordPageView } from "../../api/services/progress.service";
import { usePreviewMode } from "./use-preview-mode";

export const PAGE_VIEW_DELAY_MS = 5_000;

export type UsePageViewTrackerOptions = {
  pageId: string | null
  moduleId: string | null
  delayMs?: number
};

export type PageViewTracker = {
  markViewedNow: () => Promise<void>
};

type Visit = {
  pageId: string
  registration: Promise<void> | null
};

type CachedModuleProgress = ApiResult<ModuleProgressDTO> | undefined;

export function applyPageViewResult(current: CachedModuleProgress, result: PageViewResultDTO): CachedModuleProgress {
  if (!current || !result.lessonId) {
    return current;
  }

  const lessons = current.data.lessons.map((lesson) => (lesson.lessonId === result.lessonId
    ? {
      ...lesson,
      viewedPages: result.viewedPages,
      totalPages: result.totalPages,
      completedByPages: lesson.completedByPages || result.lessonCompleted,
      completed: lesson.completed || result.lessonCompleted,
    }
    : lesson));

  return { ...current, data: { ...current.data, lessons } };
}

export function usePageViewTracker({ pageId, moduleId, delayMs = PAGE_VIEW_DELAY_MS }: UsePageViewTrackerOptions): PageViewTracker {
  const isPreview = usePreviewMode();
  const { mutate } = useSWRConfig();
  const visitRef = useRef<Visit | null>(null);
  const moduleIdRef = useRef(moduleId);
  const active = !isPreview && pageId !== null;

  useEffect(() => {
    moduleIdRef.current = moduleId;
  }, [moduleId]);

  const register = useCallback((visit: Visit): Promise<void> => {
    visit.registration ??= recordPageView(visit.pageId)
      .then(async(result) => {
        const currentModuleId = moduleIdRef.current;

        if (currentModuleId) {
          await mutate<CachedModuleProgress>(
            apiQueryKey(MODULE_PROGRESS_PATH, { params: { moduleId: currentModuleId } }),
            (current) => applyPageViewResult(current, result),
            { revalidate: false },
          );
        }

        await invalidateApiQueries(mutate, PAGE_VIEW_INVALIDATES);
      })
      .catch(() => undefined);

    return visit.registration;
  }, [mutate]);

  useEffect(() => {
    if (!active || pageId === null) {
      visitRef.current = null;

      return undefined;
    }

    const visit: Visit = { pageId, registration: null };
    const timer = setTimeout(() => {
      void register(visit);
    }, delayMs);

    visitRef.current = visit;

    return () => {
      clearTimeout(timer);

      if (visitRef.current === visit) {
        visitRef.current = null;
      }
    };
  }, [active, pageId, delayMs, register]);

  const markViewedNow = useCallback((): Promise<void> => {
    const visit = visitRef.current;

    return visit ? register(visit) : Promise.resolve();
  }, [register]);

  return { markViewedNow };
}
