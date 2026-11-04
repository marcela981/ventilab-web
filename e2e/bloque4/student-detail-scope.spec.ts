/*
* Funcionalidad: E2E (7) a teacher without supervision cannot open another teacher's student (Bloque 4)
* Descripción: A brand-new student joins a new group of the E2E teacher (ana.torres). The demo teacher luis.herrera, who neither created nor supervises that group, opens /teacher/students/[userId] and gets the no-access state ("No tienes acceso a este estudiante") without any student data, and GET /api/users/students/{id} answers him 403; the same call answers 200 to ana.torres. Depends on @playwright/test and the auth, backend API, learning and panel e2e helpers.
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
import { contextFor, statusOf } from "../support/learning";
import { ADMIN_EMAIL, groupWith, OTHER_TEACHER_EMAIL, registerStudent, runTag, staffSession, userIdByEmail } from "../support/panel";

test("(7) a teacher without supervision gets 403 on another teacher's student (UI and API)", async ({ browser, request, baseURL }) => {
  test.setTimeout(120_000);
  const tag = runTag();
  const owner = await backendApiAs(request, TEACHER_STORAGE_STATE);
  const admin = await staffSession(request, ADMIN_EMAIL);
  const student = await registerStudent(request, `E2E B4 ajeno ${tag}`);
  const studentId = await userIdByEmail(admin.api, student.email);

  await groupWith(owner, `E2E B4 alcance ${tag}`, [studentId]);
  await owner.call("GET", `/api/users/students/${studentId}`);

  const other = await staffSession(request, OTHER_TEACHER_EMAIL);

  expect(await statusOf(request, other.accessToken, "GET", `/api/users/students/${studentId}`)).toMatchObject({ status: 403 });

  const context = await contextFor(browser, baseURL ?? "http://localhost:3000", other);
  const page = await context.newPage();

  try {
    const detail = page.waitForResponse((res) => res.url().endsWith(`/api/users/students/${studentId}`));

    await page.goto(`/teacher/students/${studentId}`);
    expect((await detail).status()).toBe(403);
    await expect(page.getByText("No tienes acceso a este estudiante")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Solo puedes ver a los estudiantes de los grupos que creaste o supervisas.")).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Secciones del estudiante" })).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(student.email);
  } finally {
    await context.close();
  }
});
