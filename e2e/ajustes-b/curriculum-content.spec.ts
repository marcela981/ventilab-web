/*
* Funcionalidad: E2E of the imported curriculum (ajustes B, B3)
* Descripción: With the curriculum imported on the backend (skipped otherwise): no published lesson of the curriculum is left without pages and no page is empty (API, every module of the tree); a brand-new student walks a whole Principiante module page by page with "Siguiente" through the real viewer; staff walks one complete module of every other level (Prerequisitos, Intermedio, Avanzado, VentyLab). Every visited page shows its title and at least one rendered block, with no KaTeX error and no broken image. Depends on @playwright/test and the auth, backend-api, curriculum and learning e2e helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Page, test } from "@playwright/test";
import { TEACHER_STORAGE_STATE } from "../support/auth";
import { backendApiAs, type BackendApi } from "../support/backend-api";
import { curriculumImported, curriculumModuleIds, type LessonPages, lessonsOfModule, measureLessonPage, OPEN_MODULE_ID, SAMPLE_MODULES } from "../support/curriculum";
import { contextFor, lessonPageUrl, pageNav, registerFreshStudent, viewedPagesOf } from "../support/learning";

type ModuleFull = { lessons: { id: string, title: string, status?: string, pages: { id: string, title: string, status?: string, blocks: { id: string }[] }[] }[] };

async function staffApi(request: Parameters<typeof backendApiAs>[0]): Promise<BackendApi> {
  return backendApiAs(request, TEACHER_STORAGE_STATE);
}

/** Visits every page of a module from page 1 of its first lesson, moving with "Siguiente" inside each lesson. */
async function walkModule(page: Page, moduleId: string, lessons: LessonPages[], student?: BackendApi): Promise<number> {
  let visited = 0;

  for (const lesson of lessons) {
    await page.goto(lessonPageUrl(lesson.lessonId, 1, moduleId));

    for (const [index, lessonPage] of lesson.pages.entries()) {
      await expect(page.locator("#lesson-page-title")).toHaveText(lessonPage.title, { timeout: 30_000 });

      const report = await measureLessonPage(page);

      expect(report.blocks, `${lessonPage.title}: blocks`).toBeGreaterThan(0);
      expect(report.katexErrors, `${lessonPage.title}: KaTeX errors`).toBe(0);
      expect(report.brokenImages, `${lessonPage.title}: broken images`).toEqual([]);
      visited += 1;

      if (index === lesson.pages.length - 1 && student) {
        // The next lesson unlocks once the server counts the last page as viewed (after 5 s on the page).
        await expect.poll(() => viewedPagesOf(student, lesson.lessonId, moduleId), { timeout: 30_000 }).toBe(lesson.pages.length);
      }

      if (index < lesson.pages.length - 1) {
        await pageNav(page).getByRole("button", { name: /Siguiente/ }).or(pageNav(page).getByRole("link", { name: /Siguiente/ })).first().click();
      }
    }
  }

  return visited;
}

test.describe("imported curriculum", () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await curriculumImported(await staffApi(request))), "the backend under test has no imported curriculum (prisma/import-curriculum.ts)");
  });

  test("no lesson without pages and no empty page", async ({ request }) => {
    test.setTimeout(300_000);
    const api = await staffApi(request);
    const moduleIds = await curriculumModuleIds(api);
    const empty: string[] = [];
    let lessons = 0;

    // One call per module (GET /api/modules/:id/full brings every lesson with its pages and blocks) keeps the
    // check under the API rate limit.
    for (const moduleId of moduleIds) {
      const full = await api.call<ModuleFull>("GET", `/api/modules/${moduleId}/full`);

      for (const lesson of full.lessons.filter((entry) => (entry.status ?? "PUBLISHED") === "PUBLISHED")) {
        const pages = lesson.pages.filter((entry) => (entry.status ?? "PUBLISHED") === "PUBLISHED");

        lessons += 1;

        if (pages.length === 0) {
          empty.push(`lesson ${lesson.id} (${lesson.title}) has no pages`);
        }

        for (const lessonPage of pages) {
          if (lessonPage.blocks.length === 0) {
            empty.push(`page ${lessonPage.id} (${lessonPage.title}) has no blocks`);
          }
        }
      }
    }

    expect(lessons).toBeGreaterThanOrEqual(70);
    expect(empty).toEqual([]);
  });

  test("a new student walks a whole Principiante module", async ({ browser, request, baseURL }) => {
    test.setTimeout(300_000);
    const lessons = await lessonsOfModule(await staffApi(request), OPEN_MODULE_ID);
    const student = await registerFreshStudent(request, "curriculo");
    const context = await contextFor(browser, baseURL as string, student);
    const page = await context.newPage();

    expect(lessons.length).toBeGreaterThanOrEqual(3);
    expect(await walkModule(page, OPEN_MODULE_ID, lessons, student.api)).toBe(lessons.reduce((total, lesson) => total + lesson.pages.length, 0));
    await context.close();
  });

  for (const sample of SAMPLE_MODULES) {
    test(`staff walks a whole ${sample.level} module`, async ({ browser, request }) => {
      test.setTimeout(300_000);
      const lessons = await lessonsOfModule(await staffApi(request), sample.moduleId);
      const context = await browser.newContext({ storageState: TEACHER_STORAGE_STATE });
      const page = await context.newPage();

      expect(lessons.length).toBeGreaterThan(0);
      expect(lessons.every((lesson) => lesson.pages.length >= 3)).toBe(true);
      await walkModule(page, sample.moduleId, lessons);
      await context.close();
    });
  }
});
