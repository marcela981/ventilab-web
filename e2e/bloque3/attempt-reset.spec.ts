/*
* Funcionalidad: E2E (4) teacher resets an attempt and the student can try again (Bloque 3)
* Descripción: A brand-new student has used the only attempt of a QUIZ (started and sent through the API). Its intro page blocks a new attempt (July re-entry text, "Comenzar" disabled). The teacher opens the unified grading screen, presses "Reiniciar intento de <student>", must write the reason (the dialog refuses an empty one) and confirms "Reiniciar": the server grants one extra attempt (nothing is deleted: the first attempt keeps its grade). The student receives the ATTEMPT_RESET notification ("Puedes repetir la evaluación") and the intro offers "Comenzar" again; starting opens attempt 2. Depends on @playwright/test and the learning and evaluations e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { freshGroup, myAssignmentOf, retireEvaluation, runTag, type SeededEvaluation, seedEvaluation, signInTeacher } from "../support/evaluations";
import { contextFor } from "../support/learning";

type Notification = { type: string, title: string };

test("(4) teacher resets an attempt and the student can retry", async ({ browser, request, baseURL }) => {
  test.setTimeout(180_000);
  const origin = baseURL ?? "http://localhost:3000";
  const teacher = await signInTeacher(request);
  const { groupId, students: [student] } = await freshGroup(request, teacher.api, "reinicio");
  let evaluation: SeededEvaluation | null = null;

  try {
    evaluation = await seedEvaluation(teacher.api, {
      type: "QUIZ",
      title: `E2E reinicio ${runTag()}`,
      maxAttempts: 1,
      questions: [{ type: "TRUE_FALSE", prompt: "La PEEP mantiene abiertos los alvéolos.", options: [{ content: "Verdadero", isCorrect: true }, { content: "Falso" }] }],
    }, groupId);

    // The only attempt, used through the API.
    const assignment = await myAssignmentOf(student!.api, evaluation.id);
    const started = await student!.api.call<{ id: string }>("POST", `/api/my-evaluations/${assignment.assignmentId}/attempts`);

    await student!.api.call("POST", `/api/evaluation-attempts/${started.id}/submit`, {});

    const studentContext = await contextFor(browser, origin, student!);
    const page = await studentContext.newPage();

    await page.goto(`/evaluations/${evaluation.id}`);
    await expect(page.getByRole("heading", { level: 1, name: evaluation.title })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Comenzar" })).toBeDisabled();
    await expect(page.getByText(/Solo se permite un intento; contacta a tu docente/)).toBeVisible();

    // Teacher: reset from the attempts list of the grading screen.
    const teacherContext = await contextFor(browser, origin, teacher);
    const grading = await teacherContext.newPage();

    await grading.goto(`/grading/evaluations/${evaluation.id}`);
    await grading.getByRole("button", { name: `Reiniciar intento de ${student!.user.name}` }).click({ timeout: 30_000 });
    const dialog = grading.getByRole("dialog", { name: "Reiniciar intento" });

    await expect(dialog).toContainText("No se borra nada");
    await dialog.getByRole("button", { name: "Reiniciar", exact: true }).click();
    await expect(dialog.getByText("Escribe el motivo del reinicio.")).toBeVisible();
    await dialog.getByRole("textbox", { name: "Motivo (obligatorio)" }).fill("Se cayó la conexión durante el quiz.");
    const reset = grading.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith(`/evaluations/${evaluation!.id}/reset`));

    await dialog.getByRole("button", { name: "Reiniciar", exact: true }).click();
    expect((await reset).ok()).toBe(true);
    await expect(grading.getByText(`${student!.user.name} podrá presentar la evaluación otra vez.`)).toBeVisible({ timeout: 30_000 });
    await teacherContext.close();

    // The student is notified and can start attempt 2.
    await expect.poll(async () => {
      const page_ = await student!.api.call<{ items: Notification[] } | Notification[]>("GET", "/api/notifications?limit=10");
      const items = Array.isArray(page_) ? page_ : page_.items;

      return items.some((item) => item.type === "ATTEMPT_RESET");
    }, { timeout: 30_000 }).toBe(true);

    await page.reload();
    await expect(page.getByRole("button", { name: "Comenzar" })).toBeEnabled({ timeout: 30_000 });
    await page.getByRole("button", { name: "Comenzar" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByText("Intento 2")).toBeVisible({ timeout: 30_000 });
    await studentContext.close();
  } finally {
    await retireEvaluation(teacher.api, evaluation);
  }
});
