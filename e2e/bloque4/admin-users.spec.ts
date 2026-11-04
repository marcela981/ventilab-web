/*
* Funcionalidad: E2E (4) admin users: role change with confirmation, immutable superadmin, Profesores tab (Bloque 4)
* Descripción: The admin (superadmin) opens /admin/users ("Gestión de roles" tab), finds a brand-new student by email, opens "Cambiar rol", picks "Docente" (the dialog warns "Al cambiar el rol:") and confirms; the toast and the row show the new role. The superadmin row has "Cambiar rol", "Desactivar" and "Editar código" disabled with the protection message, and the API answers 403 to a role change of the superadmin. The "Profesores" tab lists the E2E teacher (ana.torres) with her assigned groups and a positive distinct student count. Depends on @playwright/test and the learning and panel e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Page, test } from "@playwright/test";
import { API_URL } from "../support/backend-api";
import { contextFor } from "../support/learning";
import { ADMIN_EMAIL, registerStudent, runTag, staffSession, userIdByEmail } from "../support/panel";

const SUPERADMIN_PROTECTED = "Esta cuenta está protegida (superadministrador) y no se puede modificar.";

async function searchUser(page: Page, text: string): Promise<void> {
  const filters = page.getByRole("group", { name: "Filtros de usuarios" });
  const box = filters.getByRole("textbox", { name: "Buscar por nombre, correo, código o ID" });

  await box.fill(text);
  await filters.getByRole("button", { name: "Buscar" }).click();
}

test("(4) admin: role change with confirmation, protected superadmin and the Profesores tab", async ({ browser, request, baseURL }) => {
  test.setTimeout(120_000);
  const admin = await staffSession(request, ADMIN_EMAIL);
  const student = await registerStudent(request, `E2E B4 rol ${runTag()}`);
  const context = await contextFor(browser, baseURL ?? "http://localhost:3000", admin);
  const page = await context.newPage();

  try {
    await page.goto("/admin/users");
    await expect(page.getByRole("tab", { name: "Gestión de roles" })).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });

    // Role change with confirmation.
    await searchUser(page, student.email);
    const actions = page.getByRole("group", { name: `Acciones de ${student.name}` });

    await actions.getByRole("button", { name: "Cambiar rol" }).click({ timeout: 30_000 });
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Nuevo rol").selectOption({ label: "Docente" });
    await expect(dialog.getByText("Al cambiar el rol:")).toBeVisible();
    await dialog.getByRole("button", { name: "Cambiar rol" }).click();
    await expect(page.getByText(`${student.name} ahora tiene el rol Docente.`)).toBeVisible({ timeout: 30_000 });
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("row", { name: new RegExp(student.name) })).toContainText("Docente");

    // The superadmin cannot be modified (UI and API).
    await searchUser(page, ADMIN_EMAIL);
    const superRow = page.getByRole("row").filter({ hasText: ADMIN_EMAIL });

    await expect(superRow).toContainText("Superadministrador", { timeout: 30_000 });
    await expect(superRow).toContainText(SUPERADMIN_PROTECTED);

    for (const name of ["Cambiar rol", "Desactivar", "Editar código"]) {
      await expect(superRow.getByRole("button", { name })).toBeDisabled();
    }

    const superadminId = await userIdByEmail(admin.api, ADMIN_EMAIL);
    const refused = await request.patch(`${API_URL}/api/admin/users/${superadminId}/role`, {
      headers: { authorization: `Bearer ${admin.accessToken}` },
      data: { role: "TEACHER" },
    });

    expect(refused.status()).toBe(403);

    // Profesores: groups and distinct students of each teacher.
    await page.getByRole("tab", { name: "Profesores" }).click();
    await expect(page).toHaveURL(/tab=profesores/);
    const teachers = page.getByRole("table", { name: /^Profesores y administradores/ });
    const ana = teachers.getByRole("row").filter({ hasText: "ana.torres@ventylab.demo" });

    await expect(ana).toBeVisible({ timeout: 30_000 });
    const cells = ana.getByRole("cell");

    await expect(cells.nth(2)).not.toHaveText("Sin grupos");
    expect(Number((await cells.last().textContent())?.replace(/\D/g, "") ?? "0")).toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});
