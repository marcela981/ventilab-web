/*
* Funcionalidad: E2E (3) exam with a SIMULATION question: auto-submit when time runs out, review and release of the grade alone (Bloque 3, ajustes C1)
* Descripción: A brand-new student opens a one-minute EXAM with a single-choice question and a SIMULATION question (clinical case engine-normal-lung). The exam gives no immediate feedback; the simulator practical part is shown ("Parte práctica en el simulador") but not started. The student does not send: when the server clock runs out the player sends the attempt on its own ("Se acabó el tiempo. El intento se envió con las respuestas guardadas.") and the result says it is waiting for the teacher (EXAM grades are never published on submit). The teacher scores the SIMULATION answer in the unified grading screen, saves and publishes ("¿Publicar la calificación?"); the student's result then shows the verdict without emojis (EXAM). Real time is used (no clock mocking): the scenario takes a bit over a minute. Depends on @playwright/test and the learning and evaluations e2e helpers. v0.2 (ajustes C1): the result waits with "Entregado — en espera de resultados"; the teacher releases only the grade ("Liberar nota", "¿Liberar la nota?"), so the student sees the verdict without emojis and the note that the answers come later, with no per-question correction ("correctas") and no AI feedback.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { freshGroup, retireEvaluation, runTag, type SeededEvaluation, seedEvaluation, signInTeacher } from "../support/evaluations";
import { contextFor } from "../support/learning";

test("(3) exam: SIMULATION question, auto-submit when the time runs out, review and release of the grade alone", async ({ browser, request, baseURL }) => {
  test.setTimeout(240_000);
  const origin = baseURL ?? "http://localhost:3000";
  const teacher = await signInTeacher(request);
  const { groupId, students: [student] } = await freshGroup(request, teacher.api, "examen");
  let evaluation: SeededEvaluation | null = null;

  try {
    evaluation = await seedEvaluation(teacher.api, {
      type: "EXAM",
      title: `E2E examen ${runTag()}`,
      durationMinutes: 1,
      questions: [
        { type: "SINGLE_CHOICE", prompt: "¿Qué mide la presión meseta?", options: [{ content: "La presión alveolar", isCorrect: true }, { content: "La resistencia" }] },
        { type: "SIMULATION", prompt: "Ventila al paciente del caso.", points: 2, clinicalCaseId: "engine-normal-lung" },
      ],
    }, groupId);

    const studentContext = await contextFor(browser, origin, student!);
    const page = await studentContext.newPage();

    await page.goto(`/evaluations/${evaluation.id}`);
    await page.getByRole("button", { name: "Comenzar" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/, { timeout: 30_000 });
    const attemptId = new URL(page.url()).pathname.split("/").pop() ?? "";

    await expect(page.getByRole("timer").or(page.getByLabel(/^Tiempo restante/)).first()).toBeVisible({ timeout: 30_000 });
    const saved = page.waitForResponse((res) => res.request().method() === "PUT" && /\/answers\/[^/]+$/.test(res.url()) && res.ok());

    await page.getByRole("radio", { name: "La presión alveolar" }).check();
    await saved;
    // EXAM: no immediate feedback.
    await expect(page.getByText("¡Correcto! 🎉")).toHaveCount(0);

    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByRole("region", { name: "Parte práctica en el simulador" })).toBeVisible({ timeout: 30_000 });

    // Nobody presses "Enviar examen": the player sends the attempt when the time runs out.
    await expect(page.getByText("Se acabó el tiempo. El intento se envió con las respuestas guardadas.")).toBeVisible({ timeout: 100_000 });
    await expect(page).toHaveURL(/\/result$/, { timeout: 30_000 });
    await expect(page.getByText("Entregado — en espera de resultados")).toBeVisible({ timeout: 30_000 });

    // Teacher: score the practical question, save and release the grade alone.
    const teacherContext = await contextFor(browser, origin, teacher);
    const grading = await teacherContext.newPage();

    await grading.goto(`/grading/evaluations/${evaluation.id}?attempt=${attemptId}`);
    const simulationCard = grading.getByRole("article").filter({ has: grading.getByRole("textbox", { name: "Puntaje (0 a 2)" }) });

    await simulationCard.getByRole("textbox", { name: "Puntaje (0 a 2)" }).fill("1.5", { timeout: 30_000 });
    await simulationCard.getByRole("textbox", { name: "Comentario para el estudiante" }).fill("Buen ajuste inicial.");
    await grading.getByRole("button", { name: "Guardar calificación" }).click();
    await expect(grading.getByText("Se guardó 1 calificación.")).toBeVisible({ timeout: 30_000 });
    await grading.getByRole("button", { name: "Liberar nota", exact: true }).click();
    await grading.getByRole("dialog", { name: "¿Liberar la nota?" }).getByRole("button", { name: "Liberar", exact: true }).click();
    await expect(grading.getByText("Nota liberada.")).toBeVisible({ timeout: 30_000 });
    await expect(grading.getByTestId("release-state")).toHaveText("Nota liberada", { timeout: 30_000 });
    // Only the answers release remains.
    await expect(grading.getByRole("button", { name: "Liberar nota", exact: true })).toHaveCount(0);
    await expect(grading.getByRole("button", { name: "Liberar nota y respuestas" })).toBeVisible();
    await teacherContext.close();

    await page.reload();
    await expect(page.getByText(/^(Aprobado|Reprobado)$/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/🎉|😔/)).toHaveCount(0);
    // Grade alone: no per-question correction and no AI feedback yet.
    await expect(page.getByText("Tu docente liberó la nota. Las respuestas y la retroalimentación se mostrarán cuando las libere.")).toBeVisible();
    await expect(page.getByText(/correctas/)).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Retroalimentación general" })).toHaveCount(0);
    await studentContext.close();
  } finally {
    await retireEvaluation(teacher.api, evaluation);
  }
});
