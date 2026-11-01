/*
* Funcionalidad: E2E (5) staff creates an evaluation with an image, assigns it in the same form and activates it (Bloque 3)
* Descripción: The teacher builds a QUIZ in /evaluations/manage/new: title, "Crear evaluación", one single-choice question (prompt, two options, the correct one marked, hint), an image attached to the prompt ("Agregar imagen o video", POST /api/media), "Guardar" and "Marcar como lista (READY)". The "Asignación a grupos" section of the same builder page then offers "Nueva asignación": the teacher picks a brand-new group, sets the window to start now (Bogotá time) and presses "Asignar"; the assignment row appears and the group's student finds the evaluation among the active ones (GET /api/my-evaluations). The image step needs file storage: the local stack has no storage adapter other than Supabase (without SUPABASE_* the backend answers 503 to every upload, see LOCAL_STACK.md §3.2), so when GET /api/system/status reports storage other than "up" the image step is skipped with an explicit annotation and the rest of the scenario still runs. Depends on @playwright/test and the learning and evaluations e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { freshGroup, type MyEvaluationItem, runTag, signInTeacher } from "../support/evaluations";
import { contextFor } from "../support/learning";

// 1×1 transparent PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

type SystemStatus = { components: { storage?: { state: string } } };

/** Bogotá wall clock (UTC-5, no DST) as the value of a datetime-local input. */
function bogotaInputValue(date: Date): string {
  return new Date(date.getTime() - (5 * 3_600_000)).toISOString().slice(0, 16);
}

test("(5) staff creates an evaluation with an image, assigns it to a group in the builder and activates it", async ({ browser, request, baseURL }) => {
  test.setTimeout(180_000);
  const teacher = await signInTeacher(request);
  const { name: groupName, students: [student] } = await freshGroup(request, teacher.api, "constructor");
  const status = await teacher.api.call<SystemStatus>("GET", "/api/system/status");
  const storageUp = status.components.storage?.state === "up";
  const title = `E2E constructor ${runTag()}`;
  const context = await contextFor(browser, baseURL ?? "http://localhost:3000", teacher);
  const page = await context.newPage();
  let evaluationId: string | null = null;

  try {
    await page.goto("/evaluations/manage/new");
    await page.getByRole("textbox", { name: "Título" }).fill(title);
    await page.getByRole("button", { name: "Crear evaluación" }).click();
    await expect(page).toHaveURL(/\/evaluations\/manage\/[^/]+\/edit/, { timeout: 30_000 });
    evaluationId = new URL(page.url()).pathname.split("/")[3] ?? null;

    // Before READY the assignment section explains why it cannot assign yet.
    const assignment = page.getByRole("region", { name: "Asignación a grupos" });

    await expect(assignment.getByText("Marca la evaluación como lista para asignarla.")).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Agregar pregunta" }).click();
    const question = page.getByRole("article", { name: "Pregunta 1" });

    await question.getByRole("textbox", { name: "Enunciado" }).fill("¿Qué muestra la curva de la imagen?");
    await question.getByRole("button", { name: "Agregar opción" }).click();
    await question.getByRole("button", { name: "Agregar opción" }).click();
    await question.getByRole("textbox", { name: "Texto de la opción 1" }).fill("Una curva de presión");
    await question.getByRole("textbox", { name: "Texto de la opción 2" }).fill("Una curva de flujo");
    await question.getByRole("radio", { name: "Opción 1 correcta" }).check();
    await question.getByRole("textbox", { name: "Pista (solo talleres)" }).fill("Fíjate en las unidades del eje.");

    if (storageUp) {
      const upload = page.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith("/api/media"));

      await question.locator("input[type=file]").first().setInputFiles({ name: "curva.png", mimeType: "image/png", buffer: PNG });
      expect((await upload).ok()).toBe(true);
      await expect(question.getByRole("img", { name: "Imagen adjunta 1" })).toBeVisible({ timeout: 30_000 });
    } else {
      const reason = `Image upload skipped: file storage is "${status.components.storage?.state ?? "unknown"}" (no SUPABASE_* configured; the local stack has no other storage adapter and POST /api/media answers 503).`;

      test.info().annotations.push({ type: "skip-step", description: reason });
      console.warn(`[B3 E2E (5)] ${reason}`);
    }

    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Todo guardado" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Marcar como lista (READY)" }).click();
    await expect(page.getByText("Estado: Lista")).toBeVisible({ timeout: 30_000 });

    // Assignment in the same builder page.
    const form = assignment.getByRole("group", { name: "Nueva asignación" });

    await form.getByRole("checkbox", { name: new RegExp(`^${groupName} `) }).check();
    await form.getByRole("textbox", { name: "Inicio" }).fill(bogotaInputValue(new Date(Date.now() - 120_000)));
    await form.getByRole("button", { name: "Asignar" }).click();
    await expect(page.getByText("Evaluación asignada a 1 grupo.")).toBeVisible({ timeout: 30_000 });
    await expect(assignment.getByRole("table", { name: "Asignaciones de la evaluación" })).toContainText(groupName);

    // Active for the group's student.
    const items = await student!.api.call<(MyEvaluationItem & { state: string })[]>("GET", "/api/my-evaluations");

    expect(items.find((item) => item.evaluation?.id === evaluationId)).toMatchObject({ state: "ACTIVE" });
  } finally {
    await context.close();

    if (evaluationId) {
      await teacher.api.call("PATCH", `/api/evaluations/${evaluationId}/status`, { status: "ARCHIVED" }).catch(() => undefined);
    }
  }
});
