/*
* Funcionalidad: E2E de la grilla de casos clínicos de staff (ajustes D1)
* Descripción: En /simulator/cases (docente), a 375, 1280 y 1920 px de ancho: los casos son tarjetas de una lista «Casos clínicos» (un artículo por caso con sus acciones), la página no tiene scroll horizontal, ninguna tarjeta se sale del viewport y hay más de una columna desde 1280 px; la paginación pasa a la página siguiente cuando hay más de 12 casos. Con E2E_CAPTURES_DIR guarda una captura por ancho. Depende de @playwright/test y del estado de sesión del docente.
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

const WIDTHS = [375, 1280, 1920] as const;

for (const width of WIDTHS) {
  test(`cases are a card grid without horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/simulator/cases");

    const grid = page.getByRole("list", { name: "Casos clínicos" });
    const cards = grid.getByRole("article");

    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
    await expect(cards.first().getByRole("group", { name: /^Acciones de / }).getByRole("link", { name: "Editar" })).toBeVisible();

    // The page and the main region (the shells scroll inside it) never scroll sideways.
    const overflow = await page.evaluate(() => Math.max(...[document.documentElement, document.getElementById("main-content")]
      .filter((element): element is HTMLElement => element !== null)
      .map((element) => element.scrollWidth - element.clientWidth)));

    expect(overflow).toBeLessThanOrEqual(0);

    const boxes = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON() as DOMRect));

    for (const box of boxes) {
      expect(box.right).toBeLessThanOrEqual(width);
    }

    const columns = new Set(boxes.map((box) => Math.round(box.left))).size;

    expect(columns).toBeGreaterThanOrEqual(width >= 1280 && boxes.length > 1 ? 2 : 1);

    if (process.env.E2E_CAPTURES_DIR) {
      await page.screenshot({ path: `${process.env.E2E_CAPTURES_DIR}/casos-${width}.png`, fullPage: true });
    }

    const next = page.getByRole("button", { name: "Página siguiente" });

    if (await next.isEnabled()) {
      const firstTitle = await cards.first().getByRole("heading").textContent();

      await next.click();
      await expect(cards.first().getByRole("heading")).not.toHaveText(firstTitle ?? "", { timeout: 30_000 });
    }
  });
}
