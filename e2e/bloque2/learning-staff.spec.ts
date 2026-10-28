/*
* Funcionalidad: E2E staff preview of /learn and the lesson viewer (Bloque 2, scenario 5)
* Descripción: The teacher (saved session) sees only Currículo on /learn (no tab list) with the "Vista previa" notice; "Modo edición" shows "Editar en el CMS" links to /content?node=…; lesson 2 of the demo module, locked for a new student, opens without the lock screen and without registering a page view; "Editar esta página" opens the CMS page editor of that Page (/content/pages/{id}). Depends on @playwright/test, the auth and backend API helpers and the learning e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { TEACHER_STORAGE_STATE } from "../support/auth";
import { backendApiAs } from "../support/backend-api";
import { LESSON_2, lessonPageUrl, pagesOf, waitForLessonContent } from "../support/learning";

test.use({ storageState: TEACHER_STORAGE_STATE });

test("(5) staff previews without locks and opens the CMS page editor from the viewer", async ({ page, request }) => {
  test.setTimeout(120_000);
  const teacher = await backendApiAs(request, TEACHER_STORAGE_STATE);
  const [firstPage] = await pagesOf(teacher, LESSON_2.id);

  if (!firstPage) {
    throw new Error("The demo lesson 2 has no published Pages: seed the database (LOCAL_STACK.md)");
  }

  await page.goto("/learn?tab=progreso");
  await expect(page.getByText("Vista previa").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("tablist", { name: "Secciones de Aprender" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Niveles de Aprendizaje" })).toBeVisible();

  // Edit mode: CMS links on levels and modules.
  const editMode = page.getByRole("button", { name: "Modo edición" });

  await editMode.click();
  await expect(editMode).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status").filter({ hasText: "MODO EDICIÓN" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Editar en el CMS: / }).first()).toHaveAttribute("href", /^\/content\?node=(level|module):/);
  await editMode.click();
  await expect(editMode).toHaveAttribute("aria-pressed", "false");

  // Lesson 2 (locked for students): no lock and no page view.
  const views: string[] = [];

  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/api/progress/pages/")) {
      views.push(req.url());
    }
  });
  await page.goto(lessonPageUrl(LESSON_2.id, 1));
  await waitForLessonContent(page, firstPage.title);
  await expect(page.getByRole("region", { name: "Contenido bloqueado" })).toHaveCount(0);
  await expect(page.getByText("Vista previa").first()).toBeVisible();
  await page.waitForTimeout(6_000);
  expect(views).toEqual([]);

  const edit = page.getByRole("link", { name: "Editar esta página" });

  await expect(edit).toHaveAttribute("href", `/content/pages/${firstPage.id}`);
  await edit.click();
  await expect(page).toHaveURL(new RegExp(`/content/pages/${firstPage.id}$`));
  await expect(page.getByText("Editor de página").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: firstPage.title })).toBeVisible();
});
