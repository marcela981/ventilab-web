/*
* Funcionalidad: E2E (8) /admin/ai filters the ratings by surface and exports them as CSV (Bloque 4)
* Descripción: A brand-new student of a new group of the E2E teacher rates, through the API, one AI output of Bloque 2 (the analysis of his notes, surface NOTES_ANALYSIS, scope LESSON) and one of Bloque 3 (the general AI feedback of a published QUIZ grade, surface EVALUATION_FEEDBACK). Both outputs are produced by the real backend against the fake LLM (scripts/e2e/fake-llm.mjs through OPENAI_BASE_URL). The admin opens /admin/ai, filters "Superficie" = "Análisis de notas" (?surface=NOTES_ANALYSIS in the URL; every rating group of the table has that surface) and downloads "Exportar calificaciones (CSV)": the file has the surface and scope columns and only NOTES_ANALYSIS rows, among them the new one. After "Limpiar", the export includes both new ratings with their surfaces (Bloques 2 and 3). The evaluation is archived at the end. Depends on @playwright/test and the auth, backend API, evaluations, learning and panel e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { TEACHER_STORAGE_STATE } from "../support/auth";
import { backendApiAs } from "../support/backend-api";
import { retireEvaluation, type SeededEvaluation, seedEvaluation } from "../support/evaluations";
import { contextFor, LESSON_1 } from "../support/learning";
import { ADMIN_EMAIL, freshStudentSession, groupWith, runTag, staffSession } from "../support/panel";

type CsvRow = Record<string, string>;

/** Minimal CSV reader for the export (quoted fields with commas and doubled quotes). */
function parseCsv(text: string): { header: string[], rows: CsvRow[] } {
  const lines: string[][] = [];
  let field = "";
  let line: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;

    if (quoted) {
      if (char === "\"" && text[index + 1] === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      line.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      line.push(field);
      lines.push(line);
      line = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || line.length > 0) {
    line.push(field);
    lines.push(line);
  }

  const [header = [], ...body] = lines.filter((cells) => cells.some((cell) => cell !== ""));

  return { header, rows: body.map((cells) => Object.fromEntries(header.map((name, column) => [name, cells[column] ?? ""]))) };
}

async function exportRatings(page: Page): Promise<{ header: string[], rows: CsvRow[] }> {
  const download = page.waitForEvent("download");

  await page.getByRole("button", { name: "Exportar calificaciones (CSV)" }).click();
  const file = await download;

  expect(file.suggestedFilename()).toMatch(/.csv$/);

  return parseCsv(readFileSync((await file.path())!, "utf8").replace(/^﻿/, ""));
}

test("(8) /admin/ai filters the ratings by surface and exports Bloque 2 and 3 ratings as CSV", async ({ browser, request, baseURL }) => {
  test.setTimeout(180_000);
  const tag = runTag();
  const teacher = await backendApiAs(request, TEACHER_STORAGE_STATE);
  const student = await freshStudentSession(request, `E2E B4 valoraciones ${tag}`);
  const groupId = await groupWith(teacher, `E2E B4 valoraciones ${tag}`, [student.user.id]);
  let evaluation: SeededEvaluation | null = null;

  try {
    // Bloque 2: notes analysis of the student's notes.
    await student.api.call("POST", "/api/notes", {
      lessonId: LESSON_1.id,
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "La compliance es el cambio de volumen por cambio de presión." }] }] },
    });
    const analysis = await student.api.call<{ aiCallId: string }>("POST", "/api/notes/analyze", { lessonId: LESSON_1.id });

    await student.api.call("PUT", "/api/ai-ratings", { targetType: "NOTES_ANALYSIS", targetId: analysis.aiCallId, helpful: true, surface: "NOTES_ANALYSIS", scope: "LESSON" });

    // Bloque 3: general AI feedback of a published QUIZ grade.
    evaluation = await seedEvaluation(teacher, {
      type: "QUIZ",
      title: `E2E B4 quiz valoraciones ${tag}`,
      questions: [{ type: "SINGLE_CHOICE", prompt: "¿Qué valor de PEEP es fisiológico?", options: [{ content: "5 cmH2O", isCorrect: true }, { content: "20 cmH2O" }] }],
    }, groupId);
    const attempt = await student.api.call<{ id: string }>("POST", `/api/my-evaluations/${evaluation.assignmentIds[0]}/attempts`);

    await student.api.call("POST", `/api/evaluation-attempts/${attempt.id}/submit`, {});
    let feedbackId: string | null = null;

    await expect.poll(async () => {
      const feedback = await student.api.call<{ overall: { id: string, status: string } | null }>("GET", `/api/evaluation-attempts/${attempt.id}/feedback`);

      feedbackId = feedback.overall?.status === "READY" ? feedback.overall.id : null;

      return feedbackId;
    }, { timeout: 60_000 }).not.toBeNull();
    await student.api.call("PUT", "/api/ai-ratings", { targetType: "GRADE_FEEDBACK", targetId: feedbackId, helpful: false, surface: "EVALUATION_FEEDBACK" });

    const admin = await staffSession(request, ADMIN_EMAIL);
    const context = await contextFor(browser, baseURL ?? "http://localhost:3000", admin, { acceptDownloads: true });
    const page = await context.newPage();

    try {
      await page.goto("/admin/ai");
      const filters = page.getByRole("form", { name: "Filtros de analítica de IA" }).or(page.getByRole("search", { name: "Filtros de analítica de IA" }));

      await filters.getByRole("combobox", { name: "Superficie" }).click({ timeout: 30_000 });
      await page.getByRole("option", { name: "Análisis de notas" }).click();
      await filters.getByRole("button", { name: "Aplicar" }).click();
      await expect(page).toHaveURL(/surface=NOTES_ANALYSIS/);

      const groups = page.getByRole("table", { name: /^Calificaciones de IA por superficie/ }).locator("tbody > tr");

      await expect(groups.first()).toBeVisible({ timeout: 30_000 });
      for (const row of await groups.all()) {
        await expect(row.locator("th").first()).toHaveText("Análisis de notas");
      }

      const filtered = await exportRatings(page);

      expect(filtered.header).toEqual(expect.arrayContaining(["targetType", "targetId", "surface", "scope", "promptVersion", "callStatus"]));
      expect(filtered.rows.length).toBeGreaterThan(0);
      expect(new Set(filtered.rows.map((row) => row.surface))).toEqual(new Set(["NOTES_ANALYSIS"]));
      expect(filtered.rows.find((row) => row.targetId === analysis.aiCallId)).toMatchObject({ surface: "NOTES_ANALYSIS", scope: "LESSON" });

      // Without filters the export carries the ratings of both blocks.
      await filters.getByRole("button", { name: "Limpiar" }).click();
      await expect(page).not.toHaveURL(/surface=/);
      const all = await exportRatings(page);

      expect(all.rows.find((row) => row.targetId === analysis.aiCallId)).toMatchObject({ targetType: "NOTES_ANALYSIS", surface: "NOTES_ANALYSIS" });
      expect(all.rows.find((row) => row.targetId === feedbackId)).toMatchObject({ targetType: "GRADE_FEEDBACK", surface: "EVALUATION_FEEDBACK" });
    } finally {
      await context.close();
    }
  } finally {
    await retireEvaluation(teacher, evaluation);
  }
});
