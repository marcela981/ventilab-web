/*
* Funcionalidad: E2E student flow of /learn and the lesson viewer (Bloque 2, scenarios 1 and 4)
* Descripción: A brand-new student with one page viewed in the demo module opens /learn (Currículo selected by default, "Mecánica respiratoria" open) and, from Inicio, "Continuar" lands on the resume point (lesson 1, page 2); "Siguiente" on the last page of the lesson opens the "¡Lección Completada!" dialog, whose "Continuar a la Siguiente Lección" opens lesson 2 page 1; back in Currículo the module card is "in progress" and its "Continuar" resumes in lesson 2 (the card only counts completed lessons); the next mid-lesson page does not re-fetch the curriculum tree and finishing the module shows the module card. Then Mi Progreso reflects that activity: XP > 0 equal to the server total, streak of 1 day and today's day (America/Bogota) marked in "Calendario de actividad". Depends on @playwright/test and the learning e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { type APIRequestContext, type BrowserContext, expect, type Page, request as apiRequest, test } from "@playwright/test";
import {
  bogotaToday,
  calendarDayLabel,
  contextFor,
  DEMO_MODULE_TITLE,
  type FreshStudent,
  gamificationOf,
  LESSON_1,
  LESSON_2,
  lessonPageUrl,
  pageNav,
  pagesOf,
  registerFreshStudent,
  viewedPagesOf,
  waitForLessonContent,
} from "../support/learning";

test.describe.configure({ mode: "serial" });

let student: FreshStudent;
let context: BrowserContext;
let page: Page;
let apiContext: APIRequestContext;

test.beforeAll(async ({ browser, baseURL }) => {
  test.setTimeout(120_000); // a sign-in may wait out the backend limit of 5 per minute
  // Own request context: the fixture of beforeAll cannot be reused inside the tests.
  apiContext = await apiRequest.newContext();
  student = await registerFreshStudent(apiContext, "student");
  // One page viewed: Inicio offers "Continuar" with the lesson 1 resume point.
  const [firstPage] = await pagesOf(student.api, LESSON_1.id);

  await student.api.call("POST", `/api/progress/pages/${firstPage?.id}/view`);
  context = await contextFor(browser, baseURL ?? "http://localhost:3000", student);
  page = await context.newPage();
});

test.afterAll(async () => {
  await context?.close();
  await apiContext?.dispose();
});

test("(1) student continues at the resume point, completes a lesson, continues to the next one and from the curriculum", async () => {
  test.setTimeout(120_000);

  await page.goto("/learn");
  await expect(page.getByRole("tab", { name: "Currículo" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Aprendizaje Mecánica respiratoria" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("article", { name: DEMO_MODULE_TITLE })).toBeVisible({ timeout: 30_000 });

  // Pages viewed but no lesson completed: the curriculum card still says "Comenzar" (the summary only counts lessons,
  // DISENO_BLOQUE2 §9), so the "Continuar" with a page resume point is the one of Inicio (lastAccessedLessonId).
  await page.getByRole("tab", { name: "Inicio" }).click();
  await page.getByRole("link", { name: `Continuar con la lección ${LESSON_1.title}` }).click();

  // Resolver → resume point: first unviewed page of the first unfinished lesson.
  await expect(page).toHaveURL(new RegExp(`${lessonPageUrl(LESSON_1.id, 2)}$`), { timeout: 30_000 });
  await waitForLessonContent(page);
  await expect(page.getByRole("heading", { level: 1, name: LESSON_1.title })).toBeVisible();
  await expect(page.getByText("Página 2 de 2")).toBeVisible();

  // Last page of the lesson → completion dialog (the view result decides it).
  await pageNav(page).getByRole("button", { name: "Siguiente" }).click();
  const dialog = page.getByRole("dialog", { name: "¡Lección Completada!" });

  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog).toContainText("Has completado exitosamente esta lección. ¡Felicidades!");
  await dialog.getByRole("button", { name: "Continuar a la Siguiente Lección" }).click();

  await expect(page).toHaveURL(new RegExp(`${lessonPageUrl(LESSON_2.id, 1)}$`), { timeout: 30_000 });
  await expect(dialog).toBeHidden();
  await waitForLessonContent(page);
  await expect(page.getByRole("heading", { level: 1, name: LESSON_2.title })).toBeVisible();
  await expect(page.getByText("Página 1 de 2")).toBeVisible();

  // Currículo: lesson 1 completed → the card is "in progress" and its "Continuar" resumes in lesson 2.
  await page.goto("/learn?tab=curriculo");
  const card = page.getByRole("article", { name: DEMO_MODULE_TITLE });

  await expect(card).toHaveAttribute("data-state", "in-progress", { timeout: 30_000 });
  const resumePage = (await viewedPagesOf(student.api, LESSON_2.id)) + 1;

  await card.getByRole("link", { name: `Continuar módulo: ${DEMO_MODULE_TITLE}` }).click();
  await expect(page).toHaveURL(new RegExp(`${lessonPageUrl(LESSON_2.id, resumePage)}$`), { timeout: 30_000 });
  await waitForLessonContent(page);

  if (resumePage === 2) {
    await page.goto(lessonPageUrl(LESSON_2.id, 1));
    await waitForLessonContent(page);
  }

  // Mid-lesson "Siguiente": the page view does not re-fetch the curriculum tree.
  const treeRequests: string[] = [];

  page.on("request", (request) => {
    if (request.url().includes("/api/curriculum/tree")) {
      treeRequests.push(request.url());
    }
  });
  await pageNav(page).getByRole("button", { name: "Siguiente" }).click();
  await expect(page).toHaveURL(new RegExp(`${lessonPageUrl(LESSON_2.id, 2)}$`));
  await waitForLessonContent(page);
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await expect.poll(() => viewedPagesOf(student.api, LESSON_2.id)).toBe(1);
  expect(treeRequests).toEqual([]);

  // Last page of the module: "Finalizar módulo" shows the module card inside the viewer.
  await pageNav(page).getByRole("button", { name: "Finalizar módulo" }).click();
  const completion = page.getByRole("region", { name: "¡Completaste el módulo!" });

  await expect(completion).toBeVisible({ timeout: 30_000 });
  await expect(completion).toContainText(`Terminaste todas las páginas de «${DEMO_MODULE_TITLE}».`);
  expect(await viewedPagesOf(student.api, LESSON_1.id)).toBe(2);
  expect(await viewedPagesOf(student.api, LESSON_2.id)).toBe(2);
});

test("(4) Mi Progreso reflects the activity: XP, streak and today's day in the calendar", async () => {
  const stats = await gamificationOf(student.api);

  expect(stats.xpTotal).toBeGreaterThan(0);
  expect(stats.xpToday).toBe(stats.xpTotal);
  expect(stats.streakDays).toBe(1);

  await page.goto("/learn?tab=progreso");
  await expect(page.getByRole("tab", { name: "Mi Progreso" })).toHaveAttribute("aria-selected", "true");

  const level = page.getByRole("region", { name: `Nivel ${stats.level}` });

  await expect(level).toContainText(`${stats.xpTotal.toLocaleString("es-CO")} XP`, { timeout: 30_000 });

  const streak = page.getByRole("region", { name: "Racha consecutiva" });

  await expect(streak).toContainText("1 día");

  const calendar = page.getByRole("region", { name: "Calendario de actividad" });
  const today = calendar.locator(`[role="img"][title^="${calendarDayLabel(bogotaToday())}:"]`);

  await expect(today).toHaveCount(1);
  await expect(today).not.toHaveAttribute("data-level", "0");
  await expect(today).toHaveAttribute("title", new RegExp(`\\d+ actividades? · ${stats.xpToday.toLocaleString("es-CO")} XP$`));
});
