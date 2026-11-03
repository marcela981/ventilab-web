/*
* Funcionalidad: E2E (6) student evaluation list grouped by type → track → level (Bloque 3)
* Descripción: A brand-new student of a new group gets five evaluations: two QUIZ on two levels of the Mecánica track (assigned in reverse level order), one QUIZ on a VentyLab level, one WORKSHOP without a level and one EXAM. /evaluations (Activas, group "Evaluaciones activas") shows the three July type sections in order (📝 Quizzes, 📋 Talleres, 🎓 Exámenes Finales) with their counts; inside Quizzes the Mecánica track comes before VentyLab and its levels follow the curriculum order; the workshop falls in "Otras". The "Quiz del módulo" link of the curriculum module opens the list narrowed to that module ("Mostrando solo las evaluaciones del módulo."). Levels come from the seeded curriculum tree (prisma:seed + demo:seed). Depends on @playwright/test and the learning and evaluations e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { curriculumLevels, freshGroup, retireEvaluation, runTag, type SeededEvaluation, seedEvaluation, signInTeacher } from "../support/evaluations";
import { contextFor } from "../support/learning";

const QUESTION = { type: "TRUE_FALSE" as const, prompt: "La PEEP es una presión positiva.", options: [{ content: "Verdadero", isCorrect: true }, { content: "Falso" }] };

test("(6) the student list is grouped by type, track and level", async ({ browser, request, baseURL }) => {
  test.setTimeout(180_000);
  const teacher = await signInTeacher(request);
  const { groupId, students: [student] } = await freshGroup(request, teacher.api, "lista");
  const levels = await curriculumLevels(student!.api);
  const mecanica = levels.filter((level) => level.track === "mecanica" && level.modules.length > 0).sort((a, b) => a.order - b.order);
  const ventylab = levels.find((level) => level.track === "ventylab");

  expect(mecanica.length, "two Mecánica levels with modules in the seeded curriculum").toBeGreaterThanOrEqual(2);
  expect(ventylab, "a VentyLab level in the seeded curriculum").toBeDefined();
  const [firstLevel, secondLevel] = mecanica as [typeof mecanica[number], typeof mecanica[number]];
  const tag = runTag();
  const seeded: SeededEvaluation[] = [];

  try {
    // Assigned out of order on purpose: the list orders by level, not by assignment.
    seeded.push(await seedEvaluation(teacher.api, { type: "QUIZ", title: `E2E quiz nivel 2 ${tag}`, levelId: secondLevel.id, questions: [QUESTION] }, groupId));
    seeded.push(await seedEvaluation(teacher.api, { type: "QUIZ", title: `E2E quiz nivel 1 ${tag}`, levelId: firstLevel.id, moduleId: firstLevel.modules[0]?.id, questions: [QUESTION] }, groupId));
    seeded.push(await seedEvaluation(teacher.api, { type: "QUIZ", title: `E2E quiz VentyLab ${tag}`, levelId: ventylab!.id, questions: [QUESTION] }, groupId));
    seeded.push(await seedEvaluation(teacher.api, { type: "WORKSHOP", title: `E2E taller ${tag}`, questions: [QUESTION] }, groupId));
    seeded.push(await seedEvaluation(teacher.api, { type: "EXAM", title: `E2E examen ${tag}`, levelId: secondLevel.id, questions: [QUESTION] }, groupId));

    const context = await contextFor(browser, baseURL ?? "http://localhost:3000", student!);
    const page = await context.newPage();

    await page.goto("/evaluations");
    const panel = page.getByRole("group", { name: "Evaluaciones activas" });

    await expect(panel.getByRole("heading", { level: 2 })).toHaveText(["📝 Quizzes(3)", "📋 Talleres(1)", "🎓 Exámenes Finales(1)"], { timeout: 30_000 });

    const quizzes = panel.getByRole("region", { name: /Quizzes/ });

    await expect(quizzes.getByRole("heading", { level: 3 })).toHaveText(["Mecánica", "VentyLab"]);
    const quizLists = await quizzes.getByRole("list").evaluateAll((lists) => lists.map((list) => list.getAttribute("aria-label")));

    expect(quizLists).toEqual([
      `📝 Quizzes · Mecánica · ${firstLevel.title}`,
      `📝 Quizzes · Mecánica · ${secondLevel.title}`,
      `📝 Quizzes · VentyLab · ${ventylab!.title}`,
    ]);
    await expect(quizzes.getByRole("list", { name: `📝 Quizzes · Mecánica · ${firstLevel.title}` })).toContainText(`E2E quiz nivel 1 ${tag}`);
    await expect(quizzes.getByRole("list", { name: `📝 Quizzes · Mecánica · ${secondLevel.title}` })).toContainText(`E2E quiz nivel 2 ${tag}`);

    const workshops = panel.getByRole("region", { name: /Talleres/ });

    await expect(workshops.getByRole("heading", { level: 3 })).toHaveText(["Otras"]);
    await expect(workshops).toContainText(`E2E taller ${tag}`);
    await expect(panel.getByRole("region", { name: /Exámenes Finales/ })).toContainText(`E2E examen ${tag}`);

    // "Quiz del módulo" from the curriculum narrows the list to the module.
    await page.goto(`/evaluations?moduleId=${firstLevel.modules[0]?.id}`);
    await expect(page.getByText("Mostrando solo las evaluaciones del módulo.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("group", { name: "Evaluaciones activas" })).toContainText(`E2E quiz nivel 1 ${tag}`);
    await expect(page.getByRole("group", { name: "Evaluaciones activas" })).not.toContainText(`E2E quiz nivel 2 ${tag}`);
    await context.close();
  } finally {
    for (const evaluation of seeded) {
      await retireEvaluation(teacher.api, evaluation);
    }
  }
});
