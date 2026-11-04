/*
* Funcionalidad: E2E (2) students directory → "Conformar Grupo" → group in Grupos → leader (Bloque 4)
* Descripción: Three brand-new students (registered through the API, in no group) share a unique run tag in their names. The teacher (ana.torres) opens /teacher/students (Directorio, filter "Todos"), searches the tag (debounced, server-side search), selects the three rows, opens "Conformar Grupo (3)", names the group and creates it ("¡Grupo creado correctamente!": the group is created and the three members added). The group then appears in Grupos (/groups, found with the "Buscar" filter); its detail lists the three members and "Hacer líder" with its confirmation makes the first one the simulator leader. Depends on @playwright/test and the auth and panel e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { TEACHER_STORAGE_STATE } from "../support/auth";
import { registerStudent, runTag } from "../support/panel";

test.use({ storageState: TEACHER_STORAGE_STATE });

test("(2) directory: search, select three, Conformar Grupo, the group appears in Grupos and gets a leader", async ({ page, request }) => {
  test.setTimeout(120_000);
  const tag = runTag();
  const students = [
    await registerStudent(request, `E2E B4 dir ${tag} 1`),
    await registerStudent(request, `E2E B4 dir ${tag} 2`),
    await registerStudent(request, `E2E B4 dir ${tag} 3`),
  ];
  const groupName = `E2E B4 conformado ${tag}`;

  await page.goto("/teacher/students");
  await expect(page.getByRole("tab", { name: "Directorio" })).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
  await page.getByRole("group", { name: "Estudiantes que se muestran" }).getByRole("button", { name: "Todos" }).click();
  await page.getByRole("searchbox", { name: "Buscar por nombre, correo o código" }).fill(tag);

  const table = page.getByRole("table", { name: "Directorio de estudiantes" });

  await expect(table.locator("tbody > tr")).toHaveCount(3, { timeout: 30_000 });

  for (const student of students) {
    await table.getByRole("checkbox", { name: `Seleccionar a ${student.name}` }).check();
  }

  await page.getByRole("button", { name: "Conformar Grupo (3)" }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog).toContainText("Conformar Grupo · 3 estudiantes seleccionados");
  await expect(dialog.getByRole("list", { name: "Integrantes" }).getByRole("listitem")).toHaveCount(3);
  await dialog.getByRole("textbox", { name: "Nombre del grupo" }).fill(groupName);
  await dialog.getByRole("button", { name: "Crear Grupo" }).click();
  await expect(dialog.getByRole("status")).toHaveText("¡Grupo creado correctamente!", { timeout: 30_000 });
  await dialog.getByRole("button", { name: "Cerrar" }).click();
  await expect(dialog).toBeHidden();

  // The group is in Grupos with its three members.
  await page.getByRole("navigation", { name: "Navegación del panel" }).getByRole("link", { name: "Grupos" }).click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 30_000 });
  await page.getByRole("search", { name: "Filtros de grupos" }).getByRole("searchbox", { name: "Buscar" }).fill(groupName);
  await page.getByRole("table", { name: "Grupos" }).getByRole("link", { name: groupName }).click({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/groups\/[^/?]+/, { timeout: 30_000 });

  const leader = students[0]!;

  for (const student of students) {
    await expect(page.getByRole("button", { name: `Hacer líder: ${student.name}` })).toBeVisible({ timeout: 30_000 });
  }

  await page.getByRole("button", { name: `Hacer líder: ${leader.name}` }).click();
  const confirm = page.getByRole("dialog", { name: `¿Hacer líder a ${leader.name}?` });

  await confirm.getByRole("button", { name: "Hacer líder" }).click();
  await expect(page.getByText(`${leader.name} es ahora el líder del grupo.`)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: `Hacer líder: ${leader.name}` })).toHaveCount(0);
});
