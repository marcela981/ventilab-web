/*
* Funcionalidad: E2E (2) workshop with a hint and an open question: partial score, teacher review and final grade (Bloque 3)
* Descripción: A brand-new student opens a WORKSHOP with a single-choice question that has a hint and an OPEN_TEXT question. "Pista 💡" shows the hint (never the explanation) and "Ocultar pista" hides it; choosing the right option shows "¡Muy bien! 🌟" with the explanation; the open answer is autosaved; "Enviar taller" leaves the attempt PENDING_REVIEW and the result band says "Respuestas enviadas — pendiente de revisión por el docente" with the partial count of the closed questions ("1 de 1 correctas"). The teacher opens the unified grading screen (/grading/evaluations/[id]?attempt=), sees "Total 1 · Entregadas 1 · Calificadas 0", scores the open answer with a comment and saves: the WORKSHOP grade is published automatically, and the student's result shows the final verdict and "2 de 2 correctas". Depends on @playwright/test and the learning and evaluations e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { freshGroup, retireEvaluation, runTag, type SeededEvaluation, seedEvaluation, signInTeacher } from "../support/evaluations";
import { contextFor } from "../support/learning";

const HINT = "Piensa en qué variable controla el ventilador en ese modo.";

test("(2) workshop: hint, open question, partial score, teacher review and final grade", async ({ browser, request, baseURL }) => {
  test.setTimeout(180_000);
  const origin = baseURL ?? "http://localhost:3000";
  const teacher = await signInTeacher(request);
  const { groupId, students: [student] } = await freshGroup(request, teacher.api, "taller");
  let evaluation: SeededEvaluation | null = null;

  try {
    evaluation = await seedEvaluation(teacher.api, {
      type: "WORKSHOP",
      title: `E2E taller ${runTag()}`,
      questions: [
        { type: "SINGLE_CHOICE", prompt: "En PCV, ¿qué se programa?", options: [{ content: "Presión inspiratoria", isCorrect: true }, { content: "Volumen corriente" }], hint: HINT, explanation: "En PCV se fija la presión." },
        { type: "OPEN_TEXT", prompt: "Explica qué es la distensibilidad.", points: 2 },
      ],
    }, groupId);

    const studentContext = await contextFor(browser, origin, student!);
    const page = await studentContext.newPage();

    await page.goto(`/evaluations/${evaluation.id}`);
    await page.getByRole("button", { name: "Comenzar" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/, { timeout: 30_000 });
    const attemptId = new URL(page.url()).pathname.split("/").pop() ?? "";

    await expect(page.getByText("Paso 1 de 2")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(HINT)).toBeHidden();
    await page.getByRole("button", { name: "Pista 💡" }).click();
    await expect(page.getByText(HINT)).toBeVisible();
    await expect(page.getByText("En PCV se fija la presión.")).toHaveCount(0);
    await page.getByRole("button", { name: "Ocultar pista" }).click();
    await expect(page.getByText(HINT)).toBeHidden();

    await page.getByRole("radio", { name: "Presión inspiratoria" }).check();
    await expect(page.getByText("¡Muy bien! 🌟")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("En PCV se fija la presión.")).toBeVisible();

    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 2 de 2")).toBeVisible();
    const saved = page.waitForResponse((res) => res.request().method() === "PUT" && /\/answers\/[^/]+$/.test(res.url()) && res.ok());

    await page.getByRole("textbox", { name: "Tu respuesta" }).fill("Es el cambio de volumen por cada cambio de presión.");
    await saved;

    await page.getByRole("button", { name: "Enviar taller" }).click();
    await page.getByRole("dialog", { name: "¿Enviar el intento?" }).getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(page).toHaveURL(/\/result$/, { timeout: 30_000 });
    await expect(page.getByText("Respuestas enviadas — pendiente de revisión por el docente")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("1 de 1 correctas")).toBeVisible();

    // Teacher review in the unified grading screen.
    const teacherContext = await contextFor(browser, origin, teacher);
    const grading = await teacherContext.newPage();

    await grading.goto(`/grading/evaluations/${evaluation.id}?attempt=${attemptId}`);
    await expect(grading.getByText("Total 1 · Entregadas 1 · Calificadas 0")).toBeVisible({ timeout: 30_000 });
    const openCard = grading.getByRole("article").filter({ has: grading.getByRole("textbox", { name: "Puntaje (0 a 2)" }) });

    await openCard.getByRole("textbox", { name: "Puntaje (0 a 2)" }).fill("2");
    await openCard.getByRole("textbox", { name: "Comentario para el estudiante" }).fill("Bien definida.");
    await grading.getByRole("button", { name: "Guardar calificación" }).click();
    await expect(grading.getByText("Se guardó 1 calificación.")).toBeVisible({ timeout: 30_000 });
    await expect(grading.getByText("Total 1 · Entregadas 1 · Calificadas 1")).toBeVisible({ timeout: 30_000 });
    await teacherContext.close();

    // WORKSHOP: the grade is published as soon as the review ends.
    await page.reload();
    await expect(page.getByText("2 de 2 correctas")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("¡Aprobado! 🎉")).toBeVisible();
    await studentContext.close();
  } finally {
    await retireEvaluation(teacher.api, evaluation);
  }
});
