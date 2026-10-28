/*
* Funcionalidad: E2E TutorAI in the lesson viewer (Bloque 2, scenario 3)
* Descripción: A brand-new student on lesson 1 of the demo module expands the page with "¿Te gustaría expandir más este tema?" (streamed answer: "Detener" while it streams and the text grows before it ends), rates it "Sí, fue útil" (PUT /api/ai-ratings with surface ACCORDION and scope PAGE, answered by the real server), asks one question in the TutorAI popup (Preguntas, scope LESSON, then "Abrir en el asistente" enabled), creates a note (autosave "Guardado") and analyzes it with AI ("Análisis de tus notas"). The rating is visible in the /admin/ai statistics read through the API with surface=ACCORDION&scope=PAGE (the admin page does not send those filters). AI: the backend has no fake provider and no keys exist locally, so it runs against scripts/e2e/fake-llm.mjs (OpenAI-compatible, 127.0.0.1) through OPENAI_BASE_URL; nothing is stubbed in the browser. Depends on @playwright/test and the learning e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { type APIRequestContext, expect, test } from "@playwright/test";
import { apiOf, apiSignIn, contextFor, LESSON_1, lessonPageUrl, registerFreshStudent, waitForLessonContent } from "../support/learning";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "superadmin@ventylab.demo";
// Marker of the fake provider answer (scripts/e2e/fake-llm-core.mjs).
const FAKE_ANSWER = "Respuesta de prueba (proveedor falso de E2E).";

type RatingStats = { groups: { surface: string, scope: string, ratings: number, helpfulCount: number }[] };

async function accordionPageRatings(request: APIRequestContext, adminToken: string): Promise<{ ratings: number, helpful: number }> {
  const stats = await apiOf(request, adminToken).call<RatingStats>("GET", "/api/admin/ai-ratings/stats?surface=ACCORDION&scope=PAGE");

  for (const group of stats.groups) {
    expect(group).toMatchObject({ surface: "ACCORDION", scope: "PAGE" });
  }

  return stats.groups.reduce((total, group) => ({ ratings: total.ratings + group.ratings, helpful: total.helpful + group.helpfulCount }), { ratings: 0, helpful: 0 });
}

test("(3) TutorAI: deepen with streaming, rate it, one question, a note and its AI analysis", async ({ browser, request, baseURL }) => {
  test.setTimeout(180_000);
  const admin = await apiSignIn(request, ADMIN_EMAIL);
  const before = await accordionPageRatings(request, admin.accessToken);
  const student = await registerFreshStudent(request, "tutor");
  const context = await contextFor(browser, baseURL ?? "http://localhost:3000", student);
  const page = await context.newPage();

  try {
    await page.goto(lessonPageUrl(LESSON_1.id, 1));
    await waitForLessonContent(page);

    // Deepen accordion, streamed.
    const trigger = page.getByRole("button", { name: "¿Te gustaría expandir más este tema?" });

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const deepen = page.getByRole("region", { name: "¿Te gustaría expandir más este tema?" });

    await expect(deepen.getByRole("heading", { name: "Expansión de Tema con IA" })).toBeVisible({ timeout: 30_000 });
    await deepen.getByRole("button", { name: "Enviar" }).click();
    const thread = deepen.getByRole("list", { name: "Respuestas del tutor sobre esta página" });

    await expect(deepen.getByRole("button", { name: "Detener" })).toBeVisible({ timeout: 15_000 });
    await expect(thread).toContainText("Respuesta de prueba", { timeout: 15_000 });
    // Still streaming after the first deltas: the end of the answer has not arrived yet.
    await expect(deepen.getByRole("button", { name: "Detener" })).toBeVisible();
    await expect(thread).not.toContainText("no es contenido clínico");
    await expect(thread).toContainText("no es contenido clínico", { timeout: 30_000 });
    await expect(deepen.getByRole("button", { name: "Detener" })).toHaveCount(0);
    await expect(thread).toContainText(FAKE_ANSWER.replace(/\*/g, ""));

    // Rate the answer: the real server stores it with surface and scope.
    const ratingRequest = page.waitForRequest((req) => req.method() === "PUT" && req.url().endsWith("/api/ai-ratings"));
    const ratingResponse = page.waitForResponse((res) => res.request().method() === "PUT" && res.url().endsWith("/api/ai-ratings"));

    await thread.getByRole("button", { name: "Sí, fue útil" }).click();
    expect((await ratingRequest).postDataJSON()).toMatchObject({ targetType: "MESSAGE", helpful: true, surface: "ACCORDION", scope: "PAGE" });
    expect((await ratingResponse).ok()).toBe(true);
    await expect(thread.getByRole("button", { name: "Sí, fue útil" })).toHaveAttribute("aria-pressed", "true");

    await expect.poll(() => accordionPageRatings(request, admin.accessToken), { timeout: 15_000 })
      .toEqual({ ratings: before.ratings + 1, helpful: before.helpful + 1 });

    // One question in the popup.
    await page.getByRole("button", { name: "Abrir TutorAI" }).click();
    const popup = page.getByRole("dialog", { name: "TutorAI" });

    await expect(popup).toBeVisible();
    await popup.getByRole("tab", { name: "Preguntas" }).click();
    await expect(popup.getByRole("button", { name: "Esta lección" })).toHaveAttribute("aria-pressed", "true");
    await popup.getByRole("textbox", { name: "Tu pregunta" }).fill("¿Qué representa la PEEP en la ecuación del movimiento?");
    await popup.getByRole("button", { name: "Enviar" }).click();
    const conversation = popup.getByRole("list", { name: "Conversación con el tutor" });

    await expect(conversation).toContainText("¿Qué representa la PEEP", { timeout: 15_000 });
    await expect(conversation).toContainText("no es contenido clínico", { timeout: 30_000 });
    await expect(popup.getByRole("button", { name: "Abrir en el asistente" })).toBeEnabled({ timeout: 15_000 });

    // A note, saved by itself, then analyzed with AI.
    await popup.getByRole("tab", { name: "Notas" }).click();
    await popup.getByRole("button", { name: "Nueva nota" }).click();
    const editor = popup.getByRole("textbox", { name: "Contenido de la nota" });

    await editor.click();
    await editor.pressSequentially("La presión total es la suma de la resistiva, la elástica y la PEEP.");
    await expect(popup.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible({ timeout: 15_000 });
    await popup.getByRole("button", { name: "Listo" }).click();
    await expect(popup.getByRole("list", { name: "Mis notas de la lección" }).getByRole("listitem")).toHaveCount(1);

    await popup.getByRole("button", { name: "Analizar mis notas con IA" }).click();
    const analysis = popup.getByRole("region", { name: "Análisis de tus notas" });

    await expect(analysis).toBeVisible({ timeout: 30_000 });
    await expect(analysis).toContainText("Resumen de prueba de las notas");
    await expect(analysis.getByRole("heading", { name: "Conceptos clave" })).toBeVisible();
  } finally {
    await context.close();
  }
});
