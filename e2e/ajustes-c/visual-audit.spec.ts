/*
* Funcionalidad: Auditoría visual de evaluación por rol (ajustes C2)
* Descripción: Recorre, como estudiante y como docente, la lista de evaluaciones, el reproductor (taller con escenario y los cinco tipos de pregunta: selección única con LaTeX en línea y en bloque, selección múltiple, verdadero/falso, abierta y simulación), el resultado con todo liberado y el hub de calificación (Revisar y Publicación masiva), a 375, 1280 y 1920 px. En cada pantalla comprueba que no haya scroll horizontal de la página, que KaTeX no haya fallado (.katex-error) y que el LaTeX se haya dibujado (.katex), y guarda una captura en docs/ajustes-c/capturas/. Las imágenes no se auditan en local: sin almacenamiento (SUPABASE_*) POST /api/media responde 503. Depends on @playwright/test and the learning and evaluations e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Page, test } from "@playwright/test";
import { freshGroup, promptDoc, releaseAttemptResults, retireEvaluation, runTag, type SeededEvaluation, signInTeacher } from "../support/evaluations";
import { contextFor } from "../support/learning";

const OUT = "docs/ajustes-c/capturas";
const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "1280", width: 1280, height: 720 },
  { name: "1920", width: 1920, height: 1080 },
] as const;
const LONG_SCENARIO = "Paciente de 58 años con neumonía grave, intubado y conectado a ventilación controlada por volumen. ".repeat(6);

type Problem = { screen: string, viewport: string, issue: string };

async function audit(page: Page, screen: string, viewport: string, problems: Problem[], expectMath = false): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const state = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    katexErrors: document.querySelectorAll(".katex-error").length,
    katex: document.querySelectorAll(".katex").length,
    wide: [...document.querySelectorAll("body *")]
      .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && getComputedStyle(element).position !== "fixed")
      .slice(0, 3)
      .map((element) => `${element.tagName.toLowerCase()}.${String((element as HTMLElement).className).split(" ")[0] ?? ""}`),
  }));

  if (state.overflow > 1) {
    problems.push({ screen, viewport, issue: `horizontal overflow ${state.overflow}px (${state.wide.join(", ")})` });
  }

  if (state.katexErrors > 0) {
    problems.push({ screen, viewport, issue: `${state.katexErrors} KaTeX errors` });
  }

  if (expectMath && state.katex === 0) {
    problems.push({ screen, viewport, issue: "LaTeX not rendered" });
  }

  // The app shell scrolls inside its content column: unfold it only for the capture so the whole screen is kept.
  const unfold = await page.addStyleTag({ content: "html, body, #__next, #__next > *, main, main > * { height: auto !important; max-height: none !important; overflow: visible !important; }" });

  await page.screenshot({ path: `${OUT}/${screen}-${viewport}.png`, fullPage: true });
  await unfold.evaluate((element) => (element as HTMLElement).remove());
}

test("(C2) evaluation screens by role at 375, 1280 and 1920 px", async ({ browser, request, baseURL }) => {
  test.setTimeout(1_200_000);
  const origin = baseURL ?? "http://localhost:3000";
  const teacher = await signInTeacher(request);
  const { groupId, students: [student] } = await freshGroup(request, teacher.api, "audit");
  const problems: Problem[] = [];
  let evaluation: SeededEvaluation | null = null;

  try {
    const { id } = await teacher.api.call<{ id: string }>("POST", "/api/evaluations", { type: "WORKSHOP", title: `Auditoría C2 ${runTag()}`, maxAttempts: 1 });
    const scenario = await teacher.api.call<{ id: string }>("POST", `/api/evaluations/${id}/scenarios`, { content: promptDoc(LONG_SCENARIO) });
    const questions: Record<string, unknown>[] = [
      {
        type: "SINGLE_CHOICE",
        scenarioId: scenario.id,
        prompt: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Con $V_T = 450\\,\\text{mL}$ y $P_{plat} - PEEP = 15\\,\\text{cmH}_2\\text{O}$, la distensibilidad estática es:" }] }, { type: "paragraph", content: [{ type: "text", text: "$$C_{st} = \\frac{V_T}{P_{plat} - PEEP}$$" }] }] },
        options: [{ content: "30 mL/cmH2O", isCorrect: true }, { content: "15 mL/cmH2O", isCorrect: false }],
        explanation: "450 / 15 = 30 mL/cmH2O.",
        hint: "Divida el volumen entre la presión de distensión.",
      },
      { type: "MULTIPLE_CHOICE", scenarioId: scenario.id, prompt: promptDoc("¿Qué medidas forman parte de la ventilación protectora?"), options: [{ content: "Volumen corriente por peso predicho", isCorrect: true }, { content: "Presión meseta limitada", isCorrect: true }, { content: "FiO2 de 1,0 siempre", isCorrect: false }] },
      { type: "TRUE_FALSE", prompt: promptDoc("La presión meseta se mide con una pausa inspiratoria."), options: [{ content: "Verdadero", isCorrect: true }, { content: "Falso", isCorrect: false }] },
      { type: "OPEN_TEXT", prompt: promptDoc("Explique por qué el volumen corriente se calcula por peso predicho y no por peso real.") },
      { type: "SIMULATION", prompt: promptDoc("Programe el simulador para el paciente del caso."), clinicalCaseId: "engine-normal-lung", rubric: { criteria: [{ parameter: "peep", expectedValue: 5, min: 3, max: 7, priority: "IMPORTANTE" }] } },
    ];
    const questionIds: string[] = [];

    for (const body of questions) {
      questionIds.push((await teacher.api.call<{ id: string }>("POST", `/api/evaluations/${id}/questions`, { points: 1, ...body })).id);
    }

    await teacher.api.call("PATCH", `/api/evaluations/${id}/status`, { status: "READY" });
    const now = Date.now();
    const { ids: assignmentIds } = await teacher.api.call<{ ids: string[] }>("POST", `/api/evaluations/${id}/assignments`, {
      groupIds: [groupId],
      startsAt: new Date(now - 60_000).toISOString(),
      endsAt: new Date(now + 86_400_000).toISOString(),
    });

    evaluation = { id, title: "audit", assignmentIds, questionIds };

    // Student: list and every step of the player, at the three widths.
    const studentContext = await contextFor(browser, origin, student!);
    const page = await studentContext.newPage();

    await page.goto(`/evaluations/${id}`);
    await page.getByRole("button", { name: "Comenzar" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/, { timeout: 30_000 });
    const attemptId = new URL(page.url()).pathname.split("/").pop() ?? "";

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/evaluations");
      await audit(page, "estudiante-lista", viewport.name, problems);
      await page.goto(`/evaluations/${id}/attempts/${attemptId}`);
      await expect(page.getByText(/Paso \d+ de/).first()).toBeVisible({ timeout: 30_000 });
      // The player reopens on the last visited step.
      while (await page.getByRole("button", { name: "Anterior" }).isEnabled()) {
        await page.getByRole("button", { name: "Anterior" }).click();
      }
      await expect(page.getByText(/Paso 1 de/).first()).toBeVisible();
      await audit(page, "estudiante-reproductor-paso1-latex", viewport.name, problems, true);

      for (let step = 2; step <= questions.length; step += 1) {
        await page.getByRole("button", { name: /Siguiente/ }).first().click();
        await expect(page.getByText(new RegExp(`Paso ${step} de`)).first()).toBeVisible();
        await audit(page, `estudiante-reproductor-paso${step}`, viewport.name, problems);
      }
    }

    // Answer and send, the teacher grades the open and the simulation questions and releases everything.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/evaluations/${id}/attempts/${attemptId}`);
    await expect(page.getByText(/Paso \d+ de/).first()).toBeVisible({ timeout: 30_000 });
    while (await page.getByRole("button", { name: "Anterior" }).isEnabled()) {
      await page.getByRole("button", { name: "Anterior" }).click();
    }
    await page.getByRole("radio", { name: "30 mL/cmH2O" }).check();
    // The workshop sends from its last step.
    for (let step = 2; step <= questions.length; step += 1) {
      await page.getByRole("button", { name: /Siguiente/ }).first().click();
    }
    await page.getByRole("button", { name: /^Enviar taller/ }).click();
    await page.getByRole("dialog", { name: "¿Enviar el intento?" }).getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(page).toHaveURL(/\/result$/, { timeout: 30_000 });
    await teacher.api.call("PUT", `/api/evaluation-grading/attempts/${attemptId}/answers/${questionIds[3]}`, { manualScore: 1 });
    await teacher.api.call("PUT", `/api/evaluation-grading/attempts/${attemptId}/answers/${questionIds[4]}`, { manualScore: 0, comment: "Sin sesión de simulación" }).catch(() =>
      teacher.api.call("PUT", `/api/evaluation-grading/attempts/${attemptId}/answers/${questionIds[4]}`, { manualScore: 0 }));
    await releaseAttemptResults(teacher.api, attemptId, "GRADE_AND_ANSWERS");

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`/evaluations/${id}/attempts/${attemptId}/result`);
      await expect(page.getByTestId("attempt-grade")).toBeVisible({ timeout: 30_000 });
      await audit(page, "estudiante-resultado", viewport.name, problems, true);
    }

    // Teacher: hub (Gestionar), grading (Revisar) and bulk release.
    const teacherContext = await contextFor(browser, origin, teacher);
    const staff = await teacherContext.newPage();

    for (const viewport of VIEWPORTS) {
      await staff.setViewportSize({ width: viewport.width, height: viewport.height });
      await staff.goto("/evaluations");
      await audit(staff, "docente-hub", viewport.name, problems);
      await staff.goto(`/grading/evaluations/${id}?attempt=${attemptId}`);
      await expect(staff.getByText("Nota y respuestas liberadas").first()).toBeVisible({ timeout: 30_000 });
      await audit(staff, "docente-revisar", viewport.name, problems, true);
      await staff.goto(`/grading/evaluations/${id}?tab=publicacion`);
      await expect(staff.getByRole("button", { name: "Liberar resultados" })).toBeVisible({ timeout: 30_000 });
      await audit(staff, "docente-publicacion", viewport.name, problems);
    }

    await teacherContext.close();
    await studentContext.close();
  } finally {
    await retireEvaluation(teacher.api, evaluation);
  }

  test.info().annotations.push({ type: "problems", description: JSON.stringify(problems) });
  expect(problems).toEqual([]);
});
