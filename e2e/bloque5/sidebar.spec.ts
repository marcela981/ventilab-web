/*
* Funcionalidad: E2E July global sidebar (Bloque 5, W5-1)
* Descripción: The July global sidebar of the student on /learn at 1280×720 (DISENO_BLOQUE5 §5.1, D10-D13): "Contraer menú" (aria-expanded, aria-controls on the navigation) collapses it; the state is kept under `ventylab.sidebar.collapsed` ("1"), separate from the panel key `ventylab.panel.collapsed`, and survives a reload; collapsed, the items keep their accessible names and show a tooltip on hover, the bell in the "Herramientas" group keeps its name with the unread count and opens its popover ("Ver todas", Escape closes it), and the avatar is the "Opciones de <nombre>" button that opens the "Opciones" menu (Perfil first, "Cerrar sesión" last). "Expandir menú" brings back the expanded sidebar with the profile link and the "Opciones" button, also after a reload. v0.1 (Bloque 5, W5-1): first version. Depends on @playwright/test and the auth and backend API e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Page, test } from "@playwright/test";
import { STUDENT_STORAGE_STATE } from "../support/auth";
import { savedUserOf } from "../support/backend-api";

test.use({ viewport: { width: 1280, height: 720 } });

const SIDEBAR_KEY = "ventylab.sidebar.collapsed";
const PANEL_KEY = "ventylab.panel.collapsed";

async function stored(page: Page, key: string): Promise<string | null> {
  return page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key);
}

async function openLearn(page: Page): Promise<void> {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Aprender", level: 1 })).toBeVisible({ timeout: 30_000 });
}

test("collapse and expand persist, the collapsed avatar opens Opciones and the bell works from the sidebar", async ({ page }) => {
  test.setTimeout(120_000);
  const user = savedUserOf(STUDENT_STORAGE_STATE);

  await page.goto("/learn");
  await page.evaluate(({ sidebar, panel }) => {
    window.localStorage.removeItem(sidebar);
    window.localStorage.removeItem(panel);
  }, { sidebar: SIDEBAR_KEY, panel: PANEL_KEY });
  await openLearn(page);

  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  const collapse = page.getByRole("button", { name: "Contraer menú" });

  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  expect(await collapse.getAttribute("aria-controls")).toBe(await nav.getAttribute("id"));
  await expect(page.getByRole("link", { name: new RegExp(`^${user.name}`) })).toHaveAttribute("href", "/profile");
  await expect(page.getByRole("button", { name: "Opciones", exact: true })).toBeVisible();

  // Collapse: own key, the panel key untouched; survives a reload.
  await collapse.click();
  const expand = page.getByRole("button", { name: "Expandir menú" });

  await expect(expand).toHaveAttribute("aria-expanded", "false");
  expect(await stored(page, SIDEBAR_KEY)).toBe("1");
  expect(await stored(page, PANEL_KEY)).toBeNull();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Aprender", level: 1 })).toBeVisible({ timeout: 30_000 });
  await expect(expand).toHaveAttribute("aria-expanded", "false");

  // Collapsed items keep their names and show a tooltip.
  const learnItem = nav.getByRole("link", { name: "Módulo de Enseñanza" });

  await expect(learnItem).toHaveAttribute("href", "/learn");
  await learnItem.hover();
  await expect(page.getByRole("tooltip", { name: "Módulo de Enseñanza" })).toBeVisible();
  await page.mouse.move(640, 360);

  // The bell from the sidebar tools, with its count in the accessible name.
  const bell = page.getByRole("group", { name: "Herramientas" }).getByRole("button", { name: /^Notificaciones(, \d+ sin leer)?$/ });

  await bell.click();
  await expect(page.getByRole("link", { name: "Ver todas" })).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "Ver todas" })).toHaveCount(0);

  // The collapsed avatar opens the "Opciones" menu: Perfil first, Cerrar sesión last.
  const avatar = page.getByRole("button", { name: `Opciones de ${user.name}` });

  await avatar.click();
  const items = page.getByRole("menu").getByRole("menuitem");

  await expect(items.first()).toHaveText("Perfil");
  await expect(items.last()).toHaveText("Cerrar sesión");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(avatar).toBeFocused();

  // Expand again: the key no longer says collapsed, also after a reload.
  await expand.click();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  expect(await stored(page, SIDEBAR_KEY)).not.toBe("1");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Aprender", level: 1 })).toBeVisible({ timeout: 30_000 });
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Opciones", exact: true })).toBeVisible();
});
