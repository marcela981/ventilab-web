/*
* Funcionalidad: E2E layout of the lesson viewer at desktop and mobile width (Bloque 2)
* Descripción: With the student session (estudiante01, demo module completed), lesson 1 of the demo module shows the lesson index as the right column on desktop without the mobile "Índice de lecciones" button (regression: the MUI Button styles overrode the CSS Module and showed both), and on a 390 px wide screen hides the column and shows the button, which opens the index in a drawer ("Cerrar índice"). Depends on @playwright/test and the learning e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { LESSON_1, LESSON_2, lessonPageUrl, waitForLessonContent } from "../support/learning";

test("lesson index: right column on desktop, drawer button on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(lessonPageUrl(LESSON_1.id, 1));
  await waitForLessonContent(page);

  const column = page.getByRole("complementary", { name: "Índice de lecciones" });
  const sheetButton = page.getByRole("button", { name: "Índice de lecciones" });

  await expect(column).toBeVisible();
  await expect(column.getByRole("link", { name: new RegExp(LESSON_2.title) })).toBeVisible();
  await expect(sheetButton).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(column).toBeHidden();
  await expect(sheetButton).toBeVisible();
  await sheetButton.click();
  const close = page.getByRole("button", { name: "Cerrar índice" });

  await expect(close).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(LESSON_2.title) }).last()).toBeVisible();
  await close.click();
  await expect(close).toBeHidden();
});
