/*
* Funcionalidad: E2E de la asignación a grupos desde ambos lados (ajustes D2/D6)
* Descripción: (1) Desde el grupo: el docente crea un grupo en /groups y la página lo abre; el buscador marca a un estudiante semilla que ya tiene grupo («Ya está en el grupo …», sin «Agregar»: antes el servidor respondía 409 y no se podía agregar a nadie, el defecto reportado) y agrega a un estudiante nuevo; el estudiante, que ya tenía «Mi grupo» abierto, ve el grupo sin recargar (notificación GROUP_MEMBER_ADDED por socket) y la notificación «Te agregaron al grupo …» en la campana. (2) Desde Estudiantes: el docente selecciona a un estudiante nuevo en el directorio, usa «Agregar a grupo existente (1)» con un grupo suyo y el estudiante lo ve en «Mi grupo». Depende de @playwright/test y de los ayudantes de sesión y panel de e2e.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { signIn, TEACHER_STORAGE_STATE } from "../support/auth";
import { backendApiAs } from "../support/backend-api";
import { DEMO_PASSWORD, groupWith, registerStudent, runTag } from "../support/panel";

test.use({ storageState: TEACHER_STORAGE_STATE });

/** A signed-in page of a student in a fresh browser context (no shared storage). */
async function studentPage(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();

  await signIn(page, { email, password: DEMO_PASSWORD });

  return page;
}

test("(1) from the group: grouped students are marked, a new one is added and sees Mi grupo without reloading", async ({ page, browser, request }) => {
  test.setTimeout(180_000);
  const tag = runTag();
  const student = await registerStudent(request, `E2E D2 grupo ${tag}`);
  const groupName = `E2E D2 grupo ${tag}`;
  const studentView = await studentPage(browser, student.email);

  await studentView.goto("/my-group");
  await expect(studentView.getByText("Aún no perteneces a un grupo")).toBeVisible({ timeout: 30_000 });

  await page.goto("/groups");
  await page.getByRole("button", { name: "Crear grupo" }).click();
  const dialog = page.getByRole("dialog", { name: "Crear grupo de estudiantes" });

  await dialog.getByRole("textbox", { name: /Nombre del grupo/ }).fill(groupName);
  await dialog.getByRole("button", { name: "Crear grupo" }).click();
  // The new group opens by itself.
  await expect(page).toHaveURL(/\/groups\/[^/?]+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible({ timeout: 30_000 });

  const search = page.getByRole("searchbox", { name: "Buscar estudiante" });
  const results = page.getByRole("list", { name: "Resultados de la búsqueda" });

  // A seeded student already belongs to "Grupo A": the search says so instead of offering a failing "Agregar".
  await search.fill("estudiante01@ventylab.demo");
  await expect(results.getByText(/^Ya está en el grupo /)).toBeVisible({ timeout: 30_000 });
  await expect(results.getByRole("button", { name: /^Agregar a / })).toHaveCount(0);

  await search.fill(tag);
  await results.getByRole("button", { name: `Agregar a ${student.name}` }).click({ timeout: 30_000 });
  await expect(page.getByText(`${student.name} se agregó al grupo.`)).toBeVisible({ timeout: 30_000 });

  // The student's open page follows the notification of the socket.
  await expect(studentView.getByRole("heading", { name: groupName })).toBeVisible({ timeout: 30_000 });
  await studentView.goto("/notifications");
  await expect(studentView.getByText(`Te agregaron al grupo ${groupName}`).first()).toBeVisible({ timeout: 30_000 });
  await studentView.context().close();
});

test("(2) from Estudiantes: Agregar a grupo existente and the student sees it in Mi grupo", async ({ page, browser, request }) => {
  test.setTimeout(180_000);
  const tag = runTag();
  const student = await registerStudent(request, `E2E D2 dir ${tag}`);
  // The saved teacher session, so the test signs in only the student (login limit: 5 per minute).
  const teacher = await backendApiAs(request, TEACHER_STORAGE_STATE);
  const groupName = `E2E D2 existente ${tag}`;

  await groupWith(teacher, groupName, []);

  await page.goto("/teacher/students");
  await expect(page.getByRole("tab", { name: "Directorio" })).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
  await page.getByRole("group", { name: "Estudiantes que se muestran" }).getByRole("button", { name: "Todos" }).click();
  await page.getByRole("searchbox", { name: "Buscar por nombre, correo o código" }).fill(tag);

  const table = page.getByRole("table", { name: "Directorio de estudiantes" });

  await expect(table.locator("tbody > tr")).toHaveCount(1, { timeout: 30_000 });
  await table.getByRole("checkbox", { name: `Seleccionar a ${student.name}` }).check();
  await page.getByRole("button", { name: "Agregar a grupo existente (1)" }).click();

  const dialog = page.getByRole("dialog", { name: /Agregar a grupo existente/ });

  await dialog.getByLabel(/Grupo/).selectOption({ label: groupName });
  await dialog.getByRole("button", { name: "Agregar" }).click();
  await expect(dialog.getByRole("status")).toHaveText(`Se agregaron al grupo «${groupName}».`, { timeout: 30_000 });

  const studentView = await studentPage(browser, student.email);

  await studentView.goto("/my-group");
  await expect(studentView.getByRole("heading", { name: groupName })).toBeVisible({ timeout: 30_000 });
  await studentView.context().close();
});
