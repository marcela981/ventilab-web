# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bloque3\workshop-review.spec.ts >> (2) workshop: hint, open question, partial score, teacher review and final grade
- Location: e2e\bloque3\workshop-review.spec.ts:18:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('¡Muy bien! 🌟')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('¡Muy bien! 🌟') with timeout 15000ms
  - waiting for getByText('¡Muy bien! 🌟')

```

```yaml
- link "Saltar al contenido principal":
  - /url: "#main-content"
- link "VentyLab":
  - /url: /simulador
- button "Contraer menú" [expanded]
- navigation "Navegación principal":
  - list:
    - link "Simulador Virtual":
      - /url: /simulador
    - link "Módulo de Enseñanza":
      - /url: /learn
    - link "Evaluación":
      - /url: /evaluations
- group "Herramientas":
  - button "Abrir asistente IA"
  - button "Notificaciones, 2 sin leer": "2"
- link "E2E b3-taller Estudiante":
  - /url: /profile
- button "Opciones"
- paragraph: VentyLab v0.1.0
- main:
  - link "Volver a la evaluación":
    - /url: /evaluations/01a1b2f8-b8fd-73a5-9366-6e111e16b130
  - heading "E2E taller mw5jnz7b4wt" [level=1]
  - paragraph: Taller · Intento 1
  - 'timer "Tiempo restante: 23:59:45"'
  - status
  - paragraph: Paso 1 de 2
  - progressbar "Paso 1 de 2"
  - region "Pregunta 1 de 2":
    - heading "Pregunta 1 de 2" [level=2]
    - text: 1 punto
    - button "Pista 💡"
    - paragraph: En PCV, ¿qué se programa?
    - radiogroup "Opciones de respuesta":
      - radio "Presión inspiratoria" [checked]
      - text: Presión inspiratoria
      - radio "Volumen corriente"
      - text: Volumen corriente
    - button "Comprobar respuesta"
    - status
  - button "Anterior" [disabled]
  - button "Siguiente"
- alert:
  - text: No se encontró la evaluación o ya no tienes acceso a ella.
  - button "Close"
- alert: Intento de evaluación | VentyLab
```

# Test source

```ts
  1  | /*
  2  | * Funcionalidad: E2E (2) workshop with a hint and an open question: partial score, teacher review and final grade (Bloque 3)
  3  | * Descripción: A brand-new student opens a WORKSHOP with a single-choice question that has a hint and an OPEN_TEXT question. "Pista 💡" shows the hint (never the explanation) and "Ocultar pista" hides it; choosing the right option shows "¡Muy bien! 🌟" with the explanation; the open answer is autosaved; "Enviar taller" leaves the attempt PENDING_REVIEW and the result band says "Respuestas enviadas — pendiente de revisión por el docente" with the partial count of the closed questions ("1 de 1 correctas"). The teacher opens the unified grading screen (/grading/evaluations/[id]?attempt=), sees "Total 1 · Entregadas 1 · Calificadas 0", scores the open answer with a comment and saves: the WORKSHOP grade is published automatically, and the student's result shows the final verdict and "2 de 2 correctas". Depends on @playwright/test and the learning and evaluations e2e helpers.
  4  | * Versión: 0.1
  5  | * Autor: Marcela Mazo Castro
  6  | * Proyecto: VentyLab
  7  | * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
  8  | * Institución: Universidad del Valle
  9  | * Contacto: marcela.mazo@correounivalle.edu.co
  10 | */
  11 | 
  12 | import { expect, test } from "@playwright/test";
  13 | import { freshGroup, retireEvaluation, runTag, type SeededEvaluation, seedEvaluation, signInTeacher } from "../support/evaluations";
  14 | import { contextFor } from "../support/learning";
  15 | 
  16 | const HINT = "Piensa en qué variable controla el ventilador en ese modo.";
  17 | 
  18 | test("(2) workshop: hint, open question, partial score, teacher review and final grade", async ({ browser, request, baseURL }) => {
  19 |   test.setTimeout(180_000);
  20 |   const origin = baseURL ?? "http://localhost:3000";
  21 |   const teacher = await signInTeacher(request);
  22 |   const { groupId, students: [student] } = await freshGroup(request, teacher.api, "taller");
  23 |   let evaluation: SeededEvaluation | null = null;
  24 | 
  25 |   try {
  26 |     evaluation = await seedEvaluation(teacher.api, {
  27 |       type: "WORKSHOP",
  28 |       title: `E2E taller ${runTag()}`,
  29 |       questions: [
  30 |         { type: "SINGLE_CHOICE", prompt: "En PCV, ¿qué se programa?", options: [{ content: "Presión inspiratoria", isCorrect: true }, { content: "Volumen corriente" }], hint: HINT, explanation: "En PCV se fija la presión." },
  31 |         { type: "OPEN_TEXT", prompt: "Explica qué es la distensibilidad.", points: 2 },
  32 |       ],
  33 |     }, groupId);
  34 | 
  35 |     const studentContext = await contextFor(browser, origin, student!);
  36 |     const page = await studentContext.newPage();
  37 | 
  38 |     await page.goto(`/evaluations/${evaluation.id}`);
  39 |     await page.getByRole("button", { name: "Comenzar" }).click();
  40 |     await expect(page).toHaveURL(/\/attempts\/[^/]+$/, { timeout: 30_000 });
  41 |     const attemptId = new URL(page.url()).pathname.split("/").pop() ?? "";
  42 | 
  43 |     await expect(page.getByText("Paso 1 de 2")).toBeVisible({ timeout: 30_000 });
  44 |     await expect(page.getByText(HINT)).toBeHidden();
  45 |     await page.getByRole("button", { name: "Pista 💡" }).click();
  46 |     await expect(page.getByText(HINT)).toBeVisible();
  47 |     await expect(page.getByText("En PCV se fija la presión.")).toHaveCount(0);
  48 |     await page.getByRole("button", { name: "Ocultar pista" }).click();
  49 |     await expect(page.getByText(HINT)).toBeHidden();
  50 | 
  51 |     await page.getByRole("radio", { name: "Presión inspiratoria" }).check();
> 52 |     await expect(page.getByText("¡Muy bien! 🌟")).toBeVisible({ timeout: 15_000 });
     |                                                   ^ Error: expect(locator).toBeVisible() failed
  53 |     await expect(page.getByText("En PCV se fija la presión.")).toBeVisible();
  54 | 
  55 |     await page.getByRole("button", { name: "Siguiente" }).click();
  56 |     await expect(page.getByText("Paso 2 de 2")).toBeVisible();
  57 |     const saved = page.waitForResponse((res) => res.request().method() === "PUT" && /\/answers\/[^/]+$/.test(res.url()) && res.ok());
  58 | 
  59 |     await page.getByRole("textbox", { name: "Tu respuesta" }).fill("Es el cambio de volumen por cada cambio de presión.");
  60 |     await saved;
  61 | 
  62 |     await page.getByRole("button", { name: "Enviar taller" }).click();
  63 |     await page.getByRole("dialog", { name: "¿Enviar el intento?" }).getByRole("button", { name: "Enviar", exact: true }).click();
  64 |     await expect(page).toHaveURL(/\/result$/, { timeout: 30_000 });
  65 |     await expect(page.getByText("Respuestas enviadas — pendiente de revisión por el docente")).toBeVisible({ timeout: 30_000 });
  66 |     await expect(page.getByText("1 de 1 correctas")).toBeVisible();
  67 | 
  68 |     // Teacher review in the unified grading screen.
  69 |     const teacherContext = await contextFor(browser, origin, teacher);
  70 |     const grading = await teacherContext.newPage();
  71 | 
  72 |     await grading.goto(`/grading/evaluations/${evaluation.id}?attempt=${attemptId}`);
  73 |     await expect(grading.getByText("Total 1 · Entregadas 1 · Calificadas 0")).toBeVisible({ timeout: 30_000 });
  74 |     const openCard = grading.getByRole("article").filter({ has: grading.getByRole("textbox", { name: "Puntaje (0 a 2)" }) });
  75 | 
  76 |     await openCard.getByRole("textbox", { name: "Puntaje (0 a 2)" }).fill("2");
  77 |     await openCard.getByRole("textbox", { name: "Comentario para el estudiante" }).fill("Bien definida.");
  78 |     await grading.getByRole("button", { name: "Guardar calificación" }).click();
  79 |     await expect(grading.getByText("Se guardó 1 calificación.")).toBeVisible({ timeout: 30_000 });
  80 |     await expect(grading.getByText("Total 1 · Entregadas 1 · Calificadas 1")).toBeVisible({ timeout: 30_000 });
  81 |     await teacherContext.close();
  82 | 
  83 |     // WORKSHOP: the grade is published as soon as the review ends.
  84 |     await page.reload();
  85 |     await expect(page.getByText("2 de 2 correctas")).toBeVisible({ timeout: 30_000 });
  86 |     await expect(page.getByText("¡Aprobado! 🎉")).toBeVisible();
  87 |     await studentContext.close();
  88 |   } finally {
  89 |     await retireEvaluation(teacher.api, evaluation);
  90 |   }
  91 | });
  92 | 
```