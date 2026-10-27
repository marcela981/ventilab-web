/*
* Funcionalidad: E2E EXAM practical question in the locked console
* Descripción: The demo seed has no evaluation with a SIMULATION question, so the setup creates one through the API as the teacher (EXAM with one SIMULATION question on the published case "Pulmón normal: postoperatorio inmediato" and a one-criterion rubric, marked READY and assigned to the student's demo group for one day). The student opens it, starts the attempt and "Iniciar parte práctica": the console opens on /simulator/sessions/[id] in locked mode (no workspace tabs, no Digital/Real selector, fixed speed without pause, exam timer, curves visible) and "Finalizar sesión" takes her back to the attempt. Cleanup closes the assignment and archives the evaluation. Depends on @playwright/test and the e2e support helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { STUDENT_STORAGE_STATE, TEACHER_STORAGE_STATE } from "./support/auth";
import { backendApiAs, savedUserOf } from "./support/backend-api";
import { CURVES_LABEL, SIMULATOR_VIEWPORT } from "./support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });

const EXAM_CASE_ID = "engine-normal-lung";
const DAY_MS = 86_400_000;

type Group = { id: string, type: string, simulatorLeaderId: string | null };

test("a SIMULATION question of an exam opens the console in locked mode", async ({ page, request }) => {
  test.setTimeout(150_000);
  const student = savedUserOf(STUDENT_STORAGE_STATE);
  const teacher = await backendApiAs(request, TEACHER_STORAGE_STATE);
  const groups = await teacher.call<Group[]>("GET", "/api/groups");
  const group = groups.find((candidate) => candidate.type === "STUDENT" && candidate.simulatorLeaderId === student.id);

  expect(group, `a student group of ${student.email} (demo seed)`).toBeDefined();

  const title = `E2E examen práctico ${Date.now().toString(36)}`;
  const evaluation = await teacher.call<{ id: string }>("POST", "/api/evaluations", { type: "EXAM", title, showResultsImmediately: true, maxAttempts: 1 });
  const prompt = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Ventila al paciente del caso." }] }] };

  await teacher.call("POST", `/api/evaluations/${evaluation.id}/questions`, {
    type: "SIMULATION",
    prompt,
    points: 10,
    clinicalCaseId: EXAM_CASE_ID,
    rubric: { criteria: [{ parameter: "peep", expectedValue: 5, min: 5, max: 8, priority: "IMPORTANTE" }] },
  });
  await teacher.call("PATCH", `/api/evaluations/${evaluation.id}/status`, { status: "READY" });
  const now = Date.now();
  const assignment = await teacher.call<{ ids: string[] }>("POST", `/api/evaluations/${evaluation.id}/assignments`, {
    groupIds: [group?.id],
    startsAt: new Date(now - 60_000).toISOString(),
    endsAt: new Date(now + DAY_MS).toISOString(),
  });

  try {
    await page.goto(`/evaluations/${evaluation.id}`);
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Comenzar" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/, { timeout: 30_000 });
    const attemptUrl = page.url();

    await page.getByRole("region", { name: "Parte práctica en el simulador" }).getByRole("button", { name: "Iniciar parte práctica" }).click();
    await expect(page).toHaveURL(/\/simulator\/sessions\/[^/?#]+$/, { timeout: 30_000 });

    // Locked console: same monitor, without the workspace chrome nor speed or pause controls.
    await expect(page.getByRole("heading", { name: "Sesión de simulación", level: 1 })).toBeVisible({ timeout: 30_000 });
    const clock = page.getByRole("group", { name: "Control del tiempo" });

    await expect(clock).toContainText("Velocidad fija ×1 (examen, sin pausa)", { timeout: 30_000 });
    await expect(clock.getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("timer").filter({ hasText: "Tiempo restante del examen" })).toBeVisible();
    await expect(page.getByRole("img", { name: CURVES_LABEL })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Secciones del simulador" })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Modo del monitor" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Asesoría IA" })).toBeDisabled();

    await page.getByRole("button", { name: "Finalizar sesión" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Finalizar", exact: true }).click();
    await expect(page).toHaveURL(attemptUrl, { timeout: 60_000 });
  } finally {
    for (const id of assignment.ids) {
      await teacher.call("POST", `/api/evaluations/${evaluation.id}/assignments/${id}/close`).catch(() => undefined);
    }

    await teacher.call("PATCH", `/api/evaluations/${evaluation.id}/status`, { status: "ARCHIVED" }).catch(() => undefined);
  }
});
