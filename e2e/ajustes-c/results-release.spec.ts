/*
* Funcionalidad: E2E de la liberación de resultados (ajustes C4)
* Descripción: Un estudiante nuevo presenta un EXAM de dos preguntas de selección con explicación. Antes de la liberación, ni la página de resultado ("Entregado — en espera de resultados", sin nota, sin "correctas", sin explicación) ni la API del estudiante (detalle del intento, lista y feedback) exponen la clave, la explicación ni la nota. El docente libera solo la nota desde el hub de calificación ("Liberar nota"): el estudiante ve la nota y el veredicto, con el aviso de que las respuestas llegan después, y la API sigue sin clave ni explicación (feedback 404). Luego el docente libera la nota y las respuestas ("Liberar nota y respuestas"): el estudiante ve las respuestas correctas y la explicación, y la API las incluye. Depends on @playwright/test and the learning and evaluations e2e helpers.
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

const EXPLANATION = "La PEEP evita el colapso alveolar al final de la espiración.";
const CORRECTION_KEYS = ["isCorrect", "correctOptionIds", "explanation", "rubric", "earnedScore", "reveal", "partialClosedScore"];
const GRADE_KEYS = ["score", "maxScore", "grade", "passed"];

function keysOf(value: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => keysOf(item, found));
  } else if (value !== null && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (nested !== undefined) {
        found.add(key);
      }
      keysOf(nested, found);
    }
  }

  return found;
}

function leaked(body: unknown, forbidden: string[]): string[] {
  return [...keysOf(body)].filter((key) => forbidden.includes(key));
}

test("(C4) the student sees no key and no grade until the release; grade only, then grade and answers", async ({ browser, request, baseURL }) => {
  test.setTimeout(240_000);
  const origin = baseURL ?? "http://localhost:3000";
  const teacher = await signInTeacher(request);
  const { groupId, students: [student] } = await freshGroup(request, teacher.api, "release");
  let evaluation: SeededEvaluation | null = null;

  try {
    evaluation = await seedEvaluation(teacher.api, {
      type: "EXAM",
      title: `E2E liberación ${runTag()}`,
      questions: [
        { type: "SINGLE_CHOICE", prompt: "¿Qué efecto tiene la PEEP?", options: [{ content: "Evita el colapso alveolar", isCorrect: true }, { content: "Aumenta el espacio muerto" }], explanation: EXPLANATION },
        { type: "TRUE_FALSE", prompt: "La presión meseta se mide sin flujo", options: [{ content: "Verdadero", isCorrect: true }, { content: "Falso" }], explanation: EXPLANATION },
      ],
    }, groupId);

    const studentContext = await contextFor(browser, origin, student!);
    const page = await studentContext.newPage();

    await page.goto(`/evaluations/${evaluation.id}`);
    await page.getByRole("button", { name: "Comenzar" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/, { timeout: 30_000 });
    const attemptId = new URL(page.url()).pathname.split("/").pop() ?? "";

    await page.getByRole("radio", { name: "Evita el colapso alveolar" }).check();
    await expect(page.getByText("Respuesta guardada").first()).toBeVisible();
    // The exam shows one question per page.
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("radio", { name: "Verdadero" }).check();
    await expect(page.getByText("Respuesta guardada").first()).toBeVisible();
    await page.getByRole("button", { name: /^Enviar examen/ }).click();
    await page.getByRole("dialog", { name: "¿Enviar el intento?" }).getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(page).toHaveURL(/\/result$/, { timeout: 30_000 });

    // 1. Nothing released: UI and API.
    await expect(page.getByText("Entregado — en espera de resultados").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("attempt-grade")).toHaveCount(0);
    await expect(page.getByText(EXPLANATION)).toHaveCount(0);
    await expect(page.getByText(/correctas/)).toHaveCount(0);

    const api = student!.api;
    const held = { body: await api.call("GET", `/api/evaluation-attempts/${attemptId}`) };

    expect(held.body).toMatchObject({ published: false, answersReleased: false });
    expect(leaked(held.body, [...CORRECTION_KEYS, ...GRADE_KEYS])).toEqual([]);
    expect(JSON.stringify(held.body)).not.toContain(EXPLANATION);
    expect(leaked(await api.call("GET", "/api/my-evaluations"), [...CORRECTION_KEYS, ...GRADE_KEYS])).toEqual([]);
    await expect(api.call("GET", `/api/evaluation-attempts/${attemptId}/feedback`)).rejects.toThrow(/→ 404/);

    // 2. The teacher releases only the grade from the grading hub.
    const teacherContext = await contextFor(browser, origin, teacher);
    const grading = await teacherContext.newPage();

    await grading.goto(`/grading/evaluations/${evaluation.id}?attempt=${attemptId}`);
    await expect(grading.getByText("Sin liberar").first()).toBeVisible({ timeout: 30_000 });
    await grading.getByRole("button", { name: "Liberar nota", exact: true }).click();
    await grading.getByRole("dialog", { name: "¿Liberar la nota?" }).getByRole("button", { name: "Liberar", exact: true }).click();
    await expect(grading.getByText("Nota liberada").first()).toBeVisible({ timeout: 30_000 });

    await page.reload();
    await expect(page.getByTestId("attempt-grade")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Tu docente liberó la nota.", { exact: false })).toBeVisible();
    await expect(page.getByText(EXPLANATION)).toHaveCount(0);

    const gradeOnly = { body: await api.call("GET", `/api/evaluation-attempts/${attemptId}`) };

    expect(gradeOnly.body).toMatchObject({ published: true, answersReleased: false, grade: 5, passed: true });
    expect(leaked(gradeOnly.body, CORRECTION_KEYS)).toEqual([]);
    await expect(api.call("GET", `/api/evaluation-attempts/${attemptId}/feedback`)).rejects.toThrow(/→ 404/);

    // 3. The teacher releases the answers too.
    await grading.getByRole("button", { name: "Liberar nota y respuestas" }).click();
    await grading.getByRole("dialog", { name: "¿Liberar la nota y las respuestas?" }).getByRole("button", { name: "Liberar", exact: true }).click();
    await expect(grading.getByText("Nota y respuestas liberadas").first()).toBeVisible({ timeout: 30_000 });

    await page.reload();
    await expect(page.getByText(EXPLANATION).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/2 de 2 correctas/)).toBeVisible();

    const full = { body: await api.call("GET", `/api/evaluation-attempts/${attemptId}`) };

    expect(full.body).toMatchObject({ published: true, answersReleased: true });
    expect(JSON.stringify(full.body)).toContain(EXPLANATION);

    await teacherContext.close();
    await studentContext.close();
  } finally {
    await retireEvaluation(teacher.api, evaluation);
  }
});
