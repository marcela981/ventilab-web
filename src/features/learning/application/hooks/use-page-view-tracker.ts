/*
* Funcionalidad: usePageViewTracker
* Descripción: Registers a page view (`POST /api/progress/pages/{pageId}/view`) when the user stays on the page for 5 s OR presses "Siguiente" (markViewedNow), whichever comes first, exactly once per visit. A visit is the mount of the hook for a given pageId: a new pageId starts a new visit, unmounting before 5 s registers nothing, and coming back later is a new visit (the endpoint is idempotent). Preview mode (teacher/admin) never registers. After success the cached module progress takes the response values for that lesson (viewedPages, totalPages, and completion only when the response says so; percentages are never recalculated here) and the module, level, section and summary progress plus the curriculum tree (locks may open) are invalidated. markViewedNow never rejects: the Next button may await it or fire and forget. v1.1 (W2, Bloque 2): a failed view is no longer swallowed: a network error or a transient status puts it in the offline progress outbox (useProgressOutbox, per user), which retries it and invalidates the same progress queries when it gets through; a 403/404 is dropped with a console warning. Depends on SWR, @shared/api-client, @shared/session, the progress service, the progress outbox and usePreviewMode. v1.2 (W5, Bloque 2): markViewedNow resolves with the view result (null when nothing was registered or it failed) and the optional onViewed callback receives every successful result (timer or Siguiente), so the viewer can open the lesson completion dialog and the module card; the curriculum tree and the module progress are invalidated ONLY when the view completed a lesson (lessonJustCompleted, LESSON_COMPLETION_INVALIDATES), otherwise only the level, section and summary progress (PAGE_VIEW_INVALIDATES) and the cached module progress is patched; a view sent later by the outbox invalidates both lists (its result is not known).
* Versión: 1.2
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
import { useSession } from "@shared/session/use-session";
import type { ModuleProgressDTO, PageViewResultDTO } from "../../api/dtos/progress.dto";
import {
  LESSON_COMPLETION_INVALIDATES,
  MODULE_PROGRESS_PATH,
  PAGE_VIEW_INVALIDATES,
  recordPageView,
} from "../../api/services/progress.service";
import { useProgressOutbox } from "../session/progress-outbox";
import { usePreviewMode } from "./use-preview-mode";

export const PAGE_VIEW_DELAY_MS = 5_000;

export type UsePageViewTrackerOptions = {
  pageId: string | null
  moduleId: string | null
  delayMs?: number
  // Called with every successful registration (after the caches are updated).
  onViewed?: (result: PageViewResultDTO) => void
};

export type PageViewTracker = {
  markViewedNow: () => Promise<PageViewResultDTO | null>
};

type Visit = {
  pageId: string
  registration: Promise<PageViewResultDTO | null> | null
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

export function usePageViewTracker({ pageId, moduleId, delayMs = PAGE_VIEW_DELAY_MS, onViewed }: UsePageViewTrackerOptions): PageViewTracker {
  const isPreview = usePreviewMode();
  const { user } = useSession();
  const { mutate } = useSWRConfig();
  const invalidateProgress = useCallback(() => {
    void invalidateApiQueries(mutate, LESSON_COMPLETION_INVALIDATES);
  }, [mutate]);
  const outbox = useProgressOutbox(isPreview ? null : (user?.id ?? null), { onSent: invalidateProgress });
  const visitRef = useRef<Visit | null>(null);
  const moduleIdRef = useRef(moduleId);
  const onViewedRef = useRef(onViewed);
  const active = !isPreview && pageId !== null;

  useEffect(() => {
    moduleIdRef.current = moduleId;
    onViewedRef.current = onViewed;
  }, [moduleId, onViewed]);

  const register = useCallback((visit: Visit): Promise<PageViewResultDTO | null> => {
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

        await invalidateApiQueries(mutate, result.lessonJustCompleted ? LESSON_COMPLETION_INVALIDATES : PAGE_VIEW_INVALIDATES);
        onViewedRef.current?.(result);

        return result;
      })
      .catch((error: unknown) => {
        outbox.handleFailure(visit.pageId, error);

        return null;
      });

    return visit.registration;
  }, [mutate, outbox]);

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

  const markViewedNow = useCallback((): Promise<PageViewResultDTO | null> => {
    const visit = visitRef.current;

    return visit ? register(visit) : Promise.resolve(null);
  }, [register]);

  return { markViewedNow };
}
