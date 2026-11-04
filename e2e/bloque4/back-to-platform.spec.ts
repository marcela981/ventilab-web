/*
* Funcionalidad: E2E (9) "Volver a la plataforma" leaves the staff panel for /simulador (Bloque 4)
* Descripción: The teacher (ana.torres) on the panel dashboard (/teacher, inside the panel navigation "Navegación del panel") follows the footer link "Volver a la plataforma" and lands on /simulador, back in the main application shell (no panel navigation). Depends on @playwright/test and the auth e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { TEACHER_STORAGE_STATE } from "../support/auth";

test.use({ storageState: TEACHER_STORAGE_STATE });

test("(9) \"Volver a la plataforma\" goes to /simulador", async ({ page }) => {
  await page.goto("/teacher");
  const panelNav = page.getByRole("navigation", { name: "Navegación del panel" });

  await expect(panelNav).toBeVisible({ timeout: 30_000 });
  await panelNav.getByRole("link", { name: "Volver a la plataforma" }).click();
  await expect(page).toHaveURL(/\/simulador(\?.*)?$/, { timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: "Navegación del panel" })).toHaveCount(0);
});
