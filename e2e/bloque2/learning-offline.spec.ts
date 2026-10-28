/*
* Funcionalidad: E2E offline page progress (Bloque 2, scenario 6)
* Descripción: A brand-new student opens lesson 1 of the demo module, the browser goes offline (context.setOffline), "Siguiente" still opens page 2 (preloaded) and both page views stay in the progress outbox (localStorage progress.outbox.v1:<userId>) instead of being lost; back online, the outbox flushes by itself: the server reports the 2 pages viewed, the outbox is empty, and the XP total has no duplicates (2 page views × 5 + lesson 50 + the rewards of the achievements unlocked). Depends on @playwright/test and the learning e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import {
  contextFor,
  gamificationOf,
  LESSON_1,
  lessonPageUrl,
  pageNav,
  pagesOf,
  registerFreshStudent,
  viewedPagesOf,
  waitForLessonContent,
} from "../support/learning";

const PAGE_VIEW_XP = 5;
const LESSON_XP = 50;

test("(6) page views made offline are kept and sent once when the network comes back", async ({ browser, request, baseURL }) => {
  test.setTimeout(150_000);
  const student = await registerFreshStudent(request, "offline");
  const pages = await pagesOf(student.api, LESSON_1.id);
  const context = await contextFor(browser, baseURL ?? "http://localhost:3000", student);
  const page = await context.newPage();
  const outboxKey = `progress.outbox.v1:${student.user.id}`;
  const readOutbox = (): Promise<string[]> => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[], outboxKey);
  const acceptedViews: string[] = [];

  page.on("response", (response) => {
    if (response.request().method() === "POST" && /\/api\/progress\/pages\/[^/]+\/view$/.test(response.url()) && response.ok()) {
      acceptedViews.push(response.url());
    }
  });

  try {
    await page.goto(lessonPageUrl(LESSON_1.id, 1));
    await waitForLessonContent(page, pages[0]?.title);
    await expect(page.getByText("Página 1 de 2")).toBeVisible();
    // Let the next page preload once the content is painted.
    await page.waitForTimeout(1_500);

    await context.setOffline(true);
    await pageNav(page).getByRole("button", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(new RegExp(`${lessonPageUrl(LESSON_1.id, 2)}$`));
    await waitForLessonContent(page, pages[1]?.title);
    await expect(page.getByText("Página 2 de 2")).toBeVisible();

    // Page 1 (Siguiente) and page 2 (5 s timer) failed to send: both wait in the outbox.
    await expect.poll(async () => [...(await readOutbox())].sort(), { timeout: 20_000 }).toEqual([pages[0]?.id, pages[1]?.id].sort());
    expect(await viewedPagesOf(student.api, LESSON_1.id)).toBe(0);
    expect(acceptedViews).toEqual([]);

    await context.setOffline(false);
    await expect.poll(() => viewedPagesOf(student.api, LESSON_1.id), { timeout: 60_000 }).toBe(2);
    await expect.poll(readOutbox, { timeout: 30_000 }).toEqual([]);

    const stats = await gamificationOf(student.api);
    const achievements = await student.api.call<{ achievements: { xpReward: number }[] }>("GET", "/api/progress/achievements");
    const achievementXp = achievements.achievements.reduce((total, achievement) => total + achievement.xpReward, 0);

    expect(stats.xpTotal).toBe((2 * PAGE_VIEW_XP) + LESSON_XP + achievementXp);
    expect(new Set(acceptedViews).size).toBe(2);
  } finally {
    await context.close();
  }
});
