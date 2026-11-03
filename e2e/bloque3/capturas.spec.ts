/*
* Funcionalidad: Screenshots of Block 3 (documentation)
* Descripción: Only with E2E_CAPTURES=1: writes PNG screenshots to docs/bloque3/capturas/ (E2E_CAPTURES_DIR overrides) of the key evaluation screens, on data seeded through the API for a brand-new group and student: the student list grouped by type → track → level, the quiz immediate feedback, the workshop hint, the exam player with its timer and the practical part, the result with the AI feedback (fake LLM provider, see scripts/e2e/README.md), the staff hub (Gestionar), the "Asignación a grupos" section of the builder, the unified grading screen and the "Reiniciar intento" dialog. It asserts only what it needs to frame each capture. Depends on @playwright/test and the learning and evaluations e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { curriculumLevels, freshGroup, retireEvaluation, runTag, type SeededEvaluation, seedEvaluation, signInTeacher } from "../support/evaluations";
import { contextFor } from "../support/learning";

const OUT_DIR = process.env.E2E_CAPTURES_DIR ?? "docs/bloque3/capturas";
const DESKTOP = { width: 1440, height: 1000 };

test.skip(process.env.E2E_CAPTURES !== "1", "screenshots only with E2E_CAPTURES=1");
test.use({ viewport: DESKTOP });

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: false, animations: "disabled" });
}

const choice = (prompt: string, right: string, wrong: string, extra: { hint?: string, explanation?: string } = {}) => ({
  type: "SINGLE_CHOICE" as const,
  prompt,
  options: [{ content: right, isCorrect: true }, { content: wrong }],
  ...extra,
});

test("Block 3 key screens", async ({ browser, request, baseURL }) => {
  test.setTimeout(300_000);
  const origin = baseURL ?? "http://localhost:3000";
  const teacher = await signInTeacher(request);
  const { groupId, students: [student] } = await freshGroup(request, teacher.api, "capturas");
  const levels = await curriculumLevels(student!.api);
  const mecanica = levels.filter((level) => level.track === "mecanica").sort((a, b) => a.order - b.order);
  const ventylab = levels.find((level) => level.track === "ventylab");
  const tag = runTag();
  const seeded: SeededEvaluation[] = [];
  const contexts: BrowserContext[] = [];

  try {
    const quiz = await seedEvaluation(teacher.api, {
      type: "QUIZ",
      title: `Quiz de modos ventilatorios ${tag}`,
      levelId: mecanica[0]?.id,
      questions: [
        choice("¿Qué parámetro se programa en VCV?", "Volumen corriente", "Presión inspiratoria", { explanation: "En VCV el ventilador entrega un volumen fijo." }),
        choice("¿Qué valor de PEEP es fisiológico?", "5 cmH2O", "20 cmH2O"),
      ],
    }, groupId);
    const workshop = await seedEvaluation(teacher.api, {
      type: "WORKSHOP",
      title: `Taller de distensibilidad ${tag}`,
      levelId: mecanica[1]?.id,
      questions: [
        choice("En PCV, ¿qué se programa?", "Presión inspiratoria", "Volumen corriente", { hint: "Piensa en qué variable controla el ventilador en ese modo.", explanation: "En PCV se fija la presión." }),
        { type: "OPEN_TEXT", prompt: "Explica qué es la distensibilidad.", points: 2 },
      ],
    }, groupId);
    const exam = await seedEvaluation(teacher.api, {
      type: "EXAM",
      title: `Examen final práctico ${tag}`,
      durationMinutes: 30,
      levelId: ventylab?.id,
      questions: [
        choice("¿Qué mide la presión meseta?", "La presión alveolar", "La resistencia"),
        { type: "SIMULATION", prompt: "Ventila al paciente del caso.", points: 2, clinicalCaseId: "engine-normal-lung" },
      ],
    }, groupId);

    seeded.push(quiz, workshop, exam);
    const studentContext = await contextFor(browser, origin, student!, { viewport: DESKTOP });

    contexts.push(studentContext);
    const page = await studentContext.newPage();

    await page.goto("/evaluations");
    await expect(page.getByRole("group", { name: "Evaluaciones activas" }).getByRole("article").first()).toBeVisible({ timeout: 30_000 });
    await shot(page, "01-lista-estudiante");

    // Quiz: immediate feedback, then the result with the AI feedback.
    await page.goto(`/evaluations/${quiz.id}`);
    await page.getByRole("button", { name: "Comenzar" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/, { timeout: 30_000 });
    await page.getByRole("radio", { name: "Volumen corriente" }).check();
    await expect(page.getByText("¡Correcto! 🎉")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("radio", { name: "20 cmH2O" }).check();
    await expect(page.getByText(/^Casi\. La respuesta correcta era/)).toBeVisible({ timeout: 15_000 });
    await shot(page, "02-quiz-retroalimentacion-inmediata");
    await page.getByRole("button", { name: "Enviar quiz" }).click();
    await page.getByRole("dialog", { name: "¿Enviar el intento?" }).getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(page).toHaveURL(/\/result$/, { timeout: 30_000 });
    await expect(page.getByRole("region", { name: "Retroalimentación general" })).toContainText("proveedor falso de E2E", { timeout: 60_000 });
    await shot(page, "05-resultado-con-retroalimentacion-ia");

    // Workshop hint.
    await page.goto(`/evaluations/${workshop.id}`);
    await page.getByRole("button", { name: "Comenzar" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Pista 💡" }).click();
    await expect(page.getByText("Piensa en qué variable controla el ventilador en ese modo.")).toBeVisible();
    await shot(page, "03-taller-pista");

    // Exam: timer, navigator and the practical part.
    await page.goto(`/evaluations/${exam.id}`);
    await page.getByRole("button", { name: "Comenzar" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/, { timeout: 30_000 });
    const examAttemptId = new URL(page.url()).pathname.split("/").pop() ?? "";

    await page.getByRole("radio", { name: "La presión alveolar" }).check();
    await shot(page, "04-examen");
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByRole("region", { name: "Parte práctica en el simulador" })).toBeVisible({ timeout: 30_000 });
    await shot(page, "04b-examen-parte-practica");
    await page.getByRole("button", { name: "Enviar examen" }).click();
    await page.getByRole("dialog", { name: "¿Enviar el intento?" }).getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(page).toHaveURL(/\/result$/, { timeout: 30_000 });

    // Staff screens.
    const teacherContext = await contextFor(browser, origin, teacher, { viewport: DESKTOP });

    contexts.push(teacherContext);
    const staff = await teacherContext.newPage();

    await staff.goto("/evaluations");
    await expect(staff.getByRole("tab", { name: /Gestionar/ })).toBeVisible({ timeout: 30_000 });
    await expect(staff.getByText(quiz.title).first()).toBeVisible({ timeout: 30_000 });
    await shot(staff, "06-hub-staff");

    await staff.goto(`/evaluations/manage/${quiz.id}/edit?section=asignacion`);
    const assignment = staff.getByRole("region", { name: "Asignación a grupos" });

    await expect(assignment.getByRole("table", { name: "Asignaciones de la evaluación" })).toBeVisible({ timeout: 30_000 });
    await assignment.scrollIntoViewIfNeeded();
    await shot(staff, "07-constructor-asignacion");

    await staff.goto(`/grading/evaluations/${exam.id}?attempt=${examAttemptId}`);
    await expect(staff.getByText(/^Total 1 · Entregadas 1/)).toBeVisible({ timeout: 30_000 });
    await expect(staff.getByRole("textbox", { name: "Puntaje (0 a 2)" })).toBeVisible({ timeout: 30_000 });
    await shot(staff, "08-calificacion");

    await staff.getByRole("button", { name: `Reiniciar intento de ${student!.user.name}` }).click();
    const dialog = staff.getByRole("dialog", { name: "Reiniciar intento" });

    await dialog.getByRole("textbox", { name: "Motivo (obligatorio)" }).fill("Se cayó la conexión durante el examen.");
    await shot(staff, "09-reiniciar-intento");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
  } finally {
    for (const context of contexts) {
      await context.close();
    }

    for (const evaluation of seeded) {
      await retireEvaluation(teacher.api, evaluation);
    }
  }
});
