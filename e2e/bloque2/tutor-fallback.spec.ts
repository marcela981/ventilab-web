/*
* Funcionalidad: E2E deterministic AI fallback in Profundizar (cierre IA)
* Descripción: A brand-new student on lesson 1 of the demo module asks the deepen accordion ("¿Te gustaría expandir más este tema?") a question that carries the `[[fake-llm:500]]` directive, so every call to the fake LLM (scripts/e2e/fake-llm.mjs) fails with 500 and no AI provider answers. The real backend then streams its deterministic fallback (one delta plus `done` with source DETERMINISTIC): the thread shows the discreet "Respuesta automática (IA no disponible)" label, the answer text without the "[Respuesta automática sin IA]" prefix, no fake provider text and no "¿Te fue útil?" widget (ratings measure the language model). The failed calls open the backend circuit breaker of the provider for AI_BREAKER_OPEN_SECONDS, which turns the following AI requests of the run into fallbacks too, so this spec is not in the CI job: run it alone (scripts/e2e/README.md, "Deterministic fallback E2E"). Depends on @playwright/test and the learning e2e helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { contextFor, LESSON_1, lessonPageUrl, registerFreshStudent, waitForLessonContent } from "../support/learning";

// Per-request fault directive of the fake LLM (scripts/e2e/fake-llm-core.mjs): every provider call answers 500.
const FAIL_EVERY_CALL = "[[fake-llm:500]]";

test("(cierre IA) Profundizar shows the deterministic fallback with its label and no rating", async ({ browser, request, baseURL }) => {
  test.setTimeout(120_000);
  const student = await registerFreshStudent(request, "fallback");
  const context = await contextFor(browser, baseURL ?? "http://localhost:3000", student);
  const page = await context.newPage();

  try {
    await page.goto(lessonPageUrl(LESSON_1.id, 1));
    await waitForLessonContent(page);

    const trigger = page.getByRole("button", { name: "¿Te gustaría expandir más este tema?" });

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const deepen = page.getByRole("region", { name: "¿Te gustaría expandir más este tema?" });

    await expect(deepen.getByRole("heading", { name: "Expansión de Tema con IA" })).toBeVisible({ timeout: 30_000 });
    await deepen.getByRole("textbox", { name: "Tu pregunta" }).fill(`¿Qué representa la PEEP? ${FAIL_EVERY_CALL}`);

    const done = page.waitForResponse((res) => res.request().method() === "POST" && /\/api\/tutor\/pages\/[^/]+\/deepen$/.test(res.url()));

    await deepen.getByRole("button", { name: "Enviar" }).click();
    expect((await done).status()).toBe(200);

    const thread = deepen.getByRole("list", { name: "Respuestas del tutor sobre esta página" });

    // The backend retries the provider before falling back, so the label may take a few seconds.
    await expect(thread.getByText("Respuesta automática (IA no disponible)")).toBeVisible({ timeout: 60_000 });
    await expect(deepen.getByRole("button", { name: "Detener" })).toHaveCount(0);
    // Visible text only: the visually hidden live region announces the fragments as they arrived.
    const visibleText = await thread.evaluate((element) => {
      const copy = element.cloneNode(true) as HTMLElement;

      copy.querySelectorAll("[aria-live]").forEach((region) => region.remove());

      return copy.textContent ?? "";
    });

    expect(visibleText).not.toContain("[Respuesta automática sin IA]");
    await expect(thread).not.toContainText("proveedor falso de E2E");
    await expect(thread.getByRole("heading", { name: "¿Te fue útil?" })).toHaveCount(0);
    await expect(thread.getByRole("button", { name: "Sí, fue útil" })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
