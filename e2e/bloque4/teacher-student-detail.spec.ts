/*
* Funcionalidad: E2E (1) teacher opens a recent student from the panel dashboard (Bloque 4)
* Descripción: A brand-new student of a new group of the E2E teacher (ana.torres) views a lesson page (recent activity) and writes a personal note through the API. The teacher starts on /simulador, enters the panel through the main menu item "Panel docente" (/teacher, "General" tab selected), opens the student from "Estudiantes recientes" and lands on /teacher/students/[userId] with the five tabs Módulos, Evaluaciones, Simulador, Actividad and Gamificación, visiting each one. Privacy: no request of the whole visit reaches the notes or the AI conversation endpoints and the note text never appears on the page. Depends on @playwright/test and the auth, backend API, learning and panel e2e helpers.
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
import { LESSON_1 } from "../support/learning";
import { freshStudentSession, groupWith, runTag, viewFirstLessonPage } from "../support/panel";

test.use({ storageState: TEACHER_STORAGE_STATE });

// Personal notes and AI conversations of a student are never read by the staff screens.
const PRIVATE_API = /\/api\/(notes|tutor|ai-chat|assistant)\b|\/conversations\b/;

const DETAIL_TABS = ["Módulos", "Evaluaciones", "Simulador", "Actividad", "Gamificación"];

test("(1) teacher: Panel → General → recent student → detail with its five tabs, without notes or AI chats", async ({ page, request }) => {
  test.setTimeout(120_000);
  const tag = runTag();
  const teacher = await backendApiAs(request, TEACHER_STORAGE_STATE);
  const student = await freshStudentSession(request, `E2E B4 reciente ${tag}`);
  const noteText = `Nota privada ${tag}`;

  await groupWith(teacher, `E2E B4 detalle ${tag}`, [student.user.id]);
  await viewFirstLessonPage(student.api);
  await student.api.call("POST", "/api/notes", {
    lessonId: LESSON_1.id,
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: noteText }] }] },
  });

  const privateRequests: string[] = [];

  page.on("request", (sent) => {
    if (PRIVATE_API.test(new URL(sent.url()).pathname)) {
      privateRequests.push(`${sent.method()} ${sent.url()}`);
    }
  });

  await page.goto("/simulador");
  await page.getByRole("link", { name: "Panel docente" }).first().click();
  await expect(page).toHaveURL(/\/teacher(\?.*)?$/, { timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: "Navegación del panel" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "General" })).toHaveAttribute("aria-selected", "true");

  const recent = page.getByRole("region", { name: "Estudiantes recientes" });

  await recent.getByRole("link", { name: student.name }).click({ timeout: 30_000 });
  await expect(page).toHaveURL(new RegExp(`/teacher/students/${student.user.id}`), { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: student.name })).toBeVisible({ timeout: 30_000 });

  const tabs = page.getByRole("tablist", { name: "Secciones del estudiante" }).getByRole("tab");

  await expect(tabs).toHaveText(DETAIL_TABS);

  for (const name of DETAIL_TABS) {
    const tab = page.getByRole("tab", { name, exact: true });

    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name })).toBeVisible({ timeout: 30_000 });
  }

  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toContainText(noteText);
  expect(privateRequests).toEqual([]);
});
