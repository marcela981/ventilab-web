/*
* Funcionalidad: E2E smoke of the simulator redirects
* Descripción: Full page loads of the old entry points land on the unified simulator: / and /dashboard go to /simulador (the student home), and the legacy /simulator, /lab and /lab/live go to /simulador with the matching tab selected (simular, conexion, monitoreo). Depends on @playwright/test and the e2e support helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { workspaceTab } from "./support/simulator";

const HOME_REDIRECTS = ["/", "/dashboard"] as const;

const TAB_REDIRECTS = [
  { from: "/simulator", tab: "simular", label: "Simular Paciente" },
  { from: "/lab", tab: "conexion", label: "Conexión" },
  { from: "/lab/live", tab: "monitoreo", label: "Monitoreo" },
] as const;

for (const from of HOME_REDIRECTS) {
  test(`${from} redirects to /simulador`, async ({ page }) => {
    await page.goto(from);
    await expect(page).toHaveURL(/\/simulador(\?.*)?$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Simulador", level: 1 })).toBeVisible({ timeout: 30_000 });
  });
}

for (const { from, tab, label } of TAB_REDIRECTS) {
  test(`${from} redirects to /simulador?tab=${tab}`, async ({ page }) => {
    await page.goto(from);
    await expect(page).toHaveURL(new RegExp(`/simulador\\?tab=${tab}$`), { timeout: 30_000 });
    await expect(workspaceTab(page, label)).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
  });
}
