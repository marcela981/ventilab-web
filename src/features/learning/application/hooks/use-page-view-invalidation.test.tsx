/*
* Funcionalidad: Page-view invalidation tests
* Descripción: Proves end to end (msw) that a successful page view really revalidates the cached module, level, section and summary progress and the curriculum tree: each mounted query is requested again after markViewedNow, and a failed registration revalidates nothing. Guards the key matching of invalidateApiQueries (path template vs. cached keys). Depends on vitest, Testing Library, msw and the learning test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  apiUrl,
  envelope,
  errorResponse,
  lessonProgressDto,
  moduleProgressDto,
  progressItem,
  SessionWrapper,
  treeDto,
} from "../pages/learning-test-helpers";
import { useCurriculumTree } from "./use-curriculum-tree";
import { usePageViewTracker } from "./use-page-view-tracker";
import { useLevelProgress, useModuleProgress, useProgressSummary, useSectionProgress } from "./use-progress";

const server = setupServer();
const counts = new Map<string, number>();

const count = (name: string) => {
  counts.set(name, (counts.get(name) ?? 0) + 1);
};

const viewResult = {
  pageId: "p1",
  lessonId: "l1",
  viewedPages: 1,
  totalPages: 1,
  lessonCompleted: true,
  lessonJustCompleted: true,
  firstViewedAt: "2026-10-14T00:00:00.000Z",
  lastVisitedAt: "2026-10-14T00:00:00.000Z",
};

const summary = {
  ...progressItem(10, 1, 10),
  sections: [],
  levels: [],
  modules: [],
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  counts.clear();
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => {
      count("tree");

      return HttpResponse.json(envelope(treeDto()));
    }),
    http.get(apiUrl("/api/progress/summary"), () => {
      count("summary");

      return HttpResponse.json(envelope(summary));
    }),
    http.get(apiUrl("/api/progress/sections/:sectionId"), () => {
      count("section");

      return HttpResponse.json(envelope({ sectionId: "s1", ...progressItem(10, 1, 10), levels: [] }));
    }),
    http.get(apiUrl("/api/progress/levels/:levelId"), () => {
      count("level");

      return HttpResponse.json(envelope({ levelId: "lv1", ...progressItem(10, 1, 10), modules: [] }));
    }),
    http.get(apiUrl("/api/progress/modules/:moduleId"), () => {
      count("module");

      return HttpResponse.json(envelope(moduleProgressDto("m1", 0, [lessonProgressDto("l1", 0, 1)])));
    }),
    http.post(apiUrl("/api/progress/pages/:pageId/view"), () => HttpResponse.json(envelope(viewResult))),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function Wrapper({ children }: { children: ReactNode }) {
  return <SessionWrapper role="STUDENT">{children}</SessionWrapper>;
}

function useEverything() {
  return {
    tree: useCurriculumTree(),
    summary: useProgressSummary(),
    section: useSectionProgress("s1"),
    level: useLevelProgress("lv1"),
    module: useModuleProgress("m1"),
    tracker: usePageViewTracker({ pageId: "p1", moduleId: "m1", delayMs: 60_000 }),
  };
}

const NAMES = ["tree", "summary", "section", "level", "module"];

async function renderLoaded() {
  const rendered = renderHook(() => useEverything(), { wrapper: Wrapper });

  await waitFor(() => {
    expect(NAMES.map((name) => counts.get(name) ?? 0)).toEqual([1, 1, 1, 1, 1]);
    expect(rendered.result.current.module.progress).not.toBeNull();
  });

  return rendered;
}

describe("page-view invalidation", () => {
  it("refetches the progress queries and the curriculum tree after a successful view", async() => {
    const { result } = await renderLoaded();

    await act(async() => {
      await result.current.tracker.markViewedNow();
    });

    await waitFor(() => {
      expect(NAMES.map((name) => counts.get(name) ?? 0)).toEqual([2, 2, 2, 2, 2]);
    });
  });

  it("revalidates nothing when the registration fails", async() => {
    server.use(http.post(apiUrl("/api/progress/pages/:pageId/view"), () => errorResponse("common.internal_error", 500)));
    const { result } = await renderLoaded();

    await act(async() => {
      await result.current.tracker.markViewedNow();
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    expect(NAMES.map((name) => counts.get(name) ?? 0)).toEqual([1, 1, 1, 1, 1]);
  });
});
