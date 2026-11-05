/*
* Funcionalidad: E2E helpers for the imported curriculum (ajustes B)
* Descripción: Reads the imported curriculum through the API (curriculum tree, pages of a module grouped by lesson with their viewer page numbers), tells whether the import ran on the backend under test (the specs skip themselves otherwise, e.g. while the server PR is not merged) and measures a rendered lesson page in the browser: elements that stick out of the lesson article outside a scroll container, KaTeX errors, images that did not load, tables without their scroll region and empty pages. Depends on @playwright/test and the backend-api and learning helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { Page } from "@playwright/test";
import type { BackendApi } from "./backend-api";

/** One module per level of the curriculum (ids of _coord/curriculo-ids.md; new modules have deterministic UUIDs). */
export const SAMPLE_MODULES = [
  { level: "Prerequisitos", moduleId: "ventilation-principles" },
  { level: "Principiante", moduleId: "module-02-ecuacion-movimiento" },
  { level: "Intermedio", moduleId: "module-05-graficas-fine-tuning" },
  { level: "Avanzado", moduleId: "module-02-monitorizacion-alto-nivel" },
  { level: "VentyLab", moduleId: "ventylab-module-03-programacion-modos" },
] as const;

/** First Principiante module: no prerequisites, so a brand-new student can walk it. */
export const OPEN_MODULE_ID = "module-01-inversion-fisiologica";

export type CurriculumPage = { id: string, title: string, order: number, lessonId: string };

export type LessonPages = { lessonId: string, pages: CurriculumPage[] };

type ModulePage = { id: string, title: string, order: number, lessonId: string | null, status?: string };

type TreeModule = { id: string, status?: string };
type TreeLevel = { id: string, modules: TreeModule[] };
type TreeSection = { levels: TreeLevel[] };

/** Published pages of a module grouped by lesson in viewer order (page numbers are 1-based inside the lesson). */
export async function lessonsOfModule(api: BackendApi, moduleId: string): Promise<LessonPages[]> {
  const raw = await api.call<ModulePage[] | { items: ModulePage[] }>("GET", `/api/pages/by-module/${moduleId}`);
  const pages = (Array.isArray(raw) ? raw : raw.items).filter((page) => page.lessonId !== null && (page.status ?? "PUBLISHED") === "PUBLISHED");
  const byLesson = new Map<string, CurriculumPage[]>();

  for (const page of [...pages].sort((a, b) => a.order - b.order)) {
    const list = byLesson.get(page.lessonId as string) ?? [];

    list.push({ id: page.id, title: page.title, order: page.order, lessonId: page.lessonId as string });
    byLesson.set(page.lessonId as string, list);
  }

  return [...byLesson].map(([lessonId, list]) => ({ lessonId, pages: list }));
}

/** Every published module id of the curriculum tree. */
export async function curriculumModuleIds(api: BackendApi): Promise<string[]> {
  const tree = await api.call<{ sections: TreeSection[] }>("GET", "/api/curriculum/tree");

  return tree.sections.flatMap((section) => section.levels.flatMap((level) => level.modules.filter((entry) => (entry.status ?? "PUBLISHED") === "PUBLISHED").map((entry) => entry.id)));
}

/** True when the backend has the imported curriculum (the Principiante module of the equation of motion has its three lessons with pages). */
export async function curriculumImported(api: BackendApi): Promise<boolean> {
  try {
    return (await lessonsOfModule(api, "module-02-ecuacion-movimiento")).length >= 3;
  } catch {
    return false;
  }
}

export type RenderReport = {
  blocks: number
  overflowing: string[]
  katexErrors: number
  brokenImages: string[]
  tablesWithoutScroll: number
  documentOverflow: boolean
};

/** Scrolls through the lesson article (lazy images), then measures what the B2 audit checks. */
export async function measureLessonPage(page: Page): Promise<RenderReport> {
  const article = page.locator("article[aria-labelledby=\"lesson-page-title\"]");

  await article.locator("section[data-block-type]").first().waitFor({ state: "visible", timeout: 30_000 });
  // Lazy chunks (KaTeX, markdown) and lazy images: wait until no block shows the loading fallback, then visit every image.
  await page.waitForFunction(() => document.querySelectorAll("article [role=\"status\"]").length === 0, undefined, { timeout: 30_000 });

  for (const image of await article.locator("img").all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element: HTMLImageElement) => (element.complete ? undefined : new Promise((done) => {
      element.addEventListener("load", done, { once: true });
      element.addEventListener("error", done, { once: true });
    })));
  }

  return article.evaluate((root): RenderReport => {
    const box = root.getBoundingClientRect();
    const scrolls = (element: Element): boolean => ["auto", "scroll", "hidden", "clip"].includes(getComputedStyle(element).overflowX);
    const insideScroller = (element: Element): boolean => {
      for (let parent = element.parentElement; parent && parent !== root; parent = parent.parentElement) {
        if (scrolls(parent)) {
          return true;
        }
      }

      return false;
    };
    const overflowing: string[] = [];

    for (const element of Array.from(root.querySelectorAll("*"))) {
      const rect = element.getBoundingClientRect();

      if (rect.width === 0 || insideScroller(element)) {
        continue;
      }

      if (rect.right > box.right + 2 || rect.left < box.left - 2) {
        overflowing.push(`${element.tagName.toLowerCase()}.${(element.getAttribute("class") ?? "").split(" ")[0]} (${Math.round(rect.width)}px)`);
      }
    }

    return {
      blocks: root.querySelectorAll("section[data-block-type]").length,
      overflowing: [...new Set(overflowing)].slice(0, 10),
      katexErrors: root.querySelectorAll(".katex-error").length,
      brokenImages: Array.from(root.querySelectorAll("img")).filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute("src") ?? ""),
      tablesWithoutScroll: Array.from(root.querySelectorAll("table")).filter((table) => table.closest("[role=\"region\"]") === null).length,
      documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

/** Light or dark scheme on the whole app (the same attribute the theme provider sets). */
export async function applyColorScheme(page: Page, scheme: "light" | "dark"): Promise<void> {
  await page.emulateMedia({ colorScheme: scheme });
  await page.evaluate((value) => document.documentElement.setAttribute("data-mui-color-scheme", value), scheme);
}
