/*
* Funcionalidad: Screenshots of Block 2 (documentation)
* Descripción: Only with E2E_CAPTURES=1: writes PNG screenshots to docs/bloque2/capturas/ (E2E_CAPTURES_DIR overrides): the three /learn tabs of a student with progress (estudiante01, saved session), the curriculum of the teacher with "Modo edición" on, the lesson viewer at desktop and mobile width, the "¡Lección Completada!" dialog of a brand-new student, the TutorAI popup tabs and the deepen accordion with an answer (fake LLM provider, see scripts/e2e/README.md). It asserts only what it needs to frame each capture. Depends on @playwright/test and the auth and learning e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { TEACHER_STORAGE_STATE } from "../support/auth";
import { contextFor, LESSON_1, lessonPageUrl, pageNav, pagesOf, registerFreshStudent, waitForLessonContent } from "../support/learning";

const OUT_DIR = process.env.E2E_CAPTURES_DIR ?? "docs/bloque2/capturas";
// Viewport captures: the app shell scrolls inside its own container, so a full-page capture adds blank space.
const DESKTOP = { width: 1440, height: 1100 };
const MOBILE = { width: 390, height: 844 };

test.skip(process.env.E2E_CAPTURES !== "1", "screenshots only with E2E_CAPTURES=1");
test.describe.configure({ mode: "serial" });
test.use({ viewport: DESKTOP });

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: false, animations: "disabled" });
}

test("student /learn tabs", async ({ page }) => {
  await page.goto("/learn?tab=inicio");
  await expect(page.getByRole("region", { name: "XP Hoy" })).toBeVisible({ timeout: 30_000 });
  await shot(page, "01-learn-inicio");

  await page.getByRole("tab", { name: "Currículo" }).click();
  await expect(page.getByRole("heading", { name: "Niveles de Aprendizaje" })).toBeVisible({ timeout: 30_000 });
  await shot(page, "02-learn-curriculo");

  await page.getByRole("tab", { name: "Mi Progreso" }).click();
  await expect(page.getByRole("region", { name: "Calendario de actividad" })).toBeVisible({ timeout: 30_000 });
  await shot(page, "03-learn-mi-progreso");
});

test("teacher curriculum with edit mode", async ({ browser }) => {
  const context = await browser.newContext({ storageState: TEACHER_STORAGE_STATE, viewport: DESKTOP });
  const page = await context.newPage();

  await page.goto("/learn");
  await page.getByRole("button", { name: "Modo edición" }).click();
  await expect(page.getByRole("link", { name: /^Editar en el CMS: / }).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, "04-curriculo-staff-modo-edicion");
  await page.getByRole("button", { name: "Modo edición" }).click();
  await context.close();
});

test("viewer, completion dialog, TutorAI and deepen", async ({ browser, request, baseURL }) => {
  test.setTimeout(180_000);
  const student = await registerFreshStudent(request, "capturas");
  const [firstPage] = await pagesOf(student.api, LESSON_1.id);

  await student.api.call("POST", `/api/progress/pages/${firstPage?.id}/view`);
  const context = await contextFor(browser, baseURL ?? "http://localhost:3000", student, { viewport: DESKTOP });
  const page = await context.newPage();

  await page.goto(lessonPageUrl(LESSON_1.id, 1));
  await waitForLessonContent(page);
  await shot(page, "05-visor-escritorio");

  await page.setViewportSize(MOBILE);
  await page.waitForTimeout(800);
  await shot(page, "06-visor-movil");
  await page.setViewportSize(DESKTOP);

  // Deepen accordion with an answer.
  await page.getByRole("button", { name: "¿Te gustaría expandir más este tema?" }).click();
  const deepen = page.getByRole("region", { name: "¿Te gustaría expandir más este tema?" });

  await deepen.getByRole("button", { name: "Enviar" }).click();
  await expect(deepen).toContainText("no es contenido clínico", { timeout: 30_000 });
  await deepen.scrollIntoViewIfNeeded();
  await shot(page, "07-acordeon-profundizar");

  // TutorAI popup tabs.
  await page.getByRole("button", { name: "Abrir TutorAI" }).click();
  const popup = page.getByRole("dialog", { name: "TutorAI" });

  await expect(popup).toBeVisible();
  await shot(page, "08-tutorai-sugerencias");
  await popup.getByRole("tab", { name: "Preguntas" }).click();
  await popup.getByRole("textbox", { name: "Tu pregunta" }).fill("¿Qué es la distensibilidad?");
  await popup.getByRole("button", { name: "Enviar" }).click();
  await expect(popup).toContainText("no es contenido clínico", { timeout: 30_000 });
  await shot(page, "09-tutorai-preguntas");
  await popup.getByRole("tab", { name: "Notas" }).click();
  await shot(page, "10-tutorai-notas");
  await popup.getByRole("button", { name: "Cerrar TutorAI" }).click();

  // Completion dialog on the last page of the lesson.
  await page.goto(lessonPageUrl(LESSON_1.id, 2));
  await waitForLessonContent(page);
  await pageNav(page).getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("dialog", { name: "¡Lección Completada!" })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2_500); // let the confetti fade
  await shot(page, "11-leccion-completada");
  await context.close();
});
