/*
* Funcionalidad: E2E locks of the curriculum and the lesson viewer (Bloque 2, scenario 2)
* Descripción: For a brand-new student, the Currículo tab shows "Nivel Intermedio" locked with "Completa el nivel anterior para desbloquear" and no module cards; opening lesson 2 of the demo module by direct URL shows "Contenido bloqueado" listing the missing lesson 1 with its link, without the content or the TutorAI button; and the server enforces the order: GET /api/lessons/{id}/access answers allowed false with the missing lesson, GET /api/pages/{id} and POST /api/progress/pages/{id}/view answer 403 lesson_locked. Depends on @playwright/test and the learning e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { contextFor, LESSON_1, LESSON_2, lessonPageUrl, pagesOf, registerFreshStudent, statusOf } from "../support/learning";

test("(2) locked level and locked lesson: screen with the missing lessons and 403 from the server", async ({ browser, request, baseURL }) => {
  test.setTimeout(120_000);
  const student = await registerFreshStudent(request, "locks");
  const context = await contextFor(browser, baseURL ?? "http://localhost:3000", student);
  const page = await context.newPage();

  try {
    // Locked level in the curriculum: reason, no module cards.
    await page.goto("/learn?tab=curriculo");
    const level = page.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 4, name: "Nivel Intermedio", exact: true }) });

    await expect(level).toHaveAttribute("data-status", "locked", { timeout: 30_000 });
    await expect(level).toContainText("Bloqueado");
    await expect(level).toContainText("Completa el nivel anterior para desbloquear");
    await expect(page.getByRole("list", { name: "Módulos de Nivel Intermedio" })).toHaveCount(0);

    // Locked lesson by direct URL.
    await page.goto(lessonPageUrl(LESSON_2.id, 1));
    const locked = page.getByRole("region", { name: "Contenido bloqueado" });

    await expect(locked).toBeVisible({ timeout: 30_000 });
    await expect(locked).toContainText(`Para acceder a «${LESSON_2.title}» primero debes completar:`);
    const missing = locked.getByRole("list", { name: "Prerrequisitos pendientes" });

    await expect(missing.getByRole("listitem")).toHaveCount(1);
    await expect(missing.getByRole("link", { name: LESSON_1.title })).toHaveAttribute("href", lessonPageUrl(LESSON_1.id, 1));
    await expect(page.locator("article[aria-labelledby=\"lesson-page-title\"]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Abrir TutorAI" })).toHaveCount(0);

    // The server enforces the order, not only the UI.
    const access = await student.api.call<{ allowed: boolean, reason: string | null, missing: { lessonId: string }[] }>("GET", `/api/lessons/${LESSON_2.id}/access`);

    expect(access).toMatchObject({ allowed: false, reason: "previous_lesson_incomplete", missing: [{ lessonId: LESSON_1.id }] });
    const [lockedPage] = await pagesOf(student.api, LESSON_2.id);
    const read = await statusOf(request, student.accessToken, "GET", `/api/pages/${lockedPage?.id}`);
    const view = await statusOf(request, student.accessToken, "POST", `/api/progress/pages/${lockedPage?.id}/view`);

    expect(read.status).toBe(403);
    expect(read.code).toContain("lesson_locked");
    expect(view.status).toBe(403);
    expect(view.code).toContain("lesson_locked");
  } finally {
    await context.close();
  }
});
