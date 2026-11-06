# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: simulator-exam.spec.ts >> a SIMULATION question of an exam opens the console in locked mode
- Location: e2e\simulator-exam.spec.ts:24:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('group', { name: 'Control del tiempo' })
Expected substring: "Velocidad fija ×1 (examen, sin pausa)"
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByRole('group', { name: 'Control del tiempo' }) with timeout 30000ms
  - waiting for getByRole('group', { name: 'Control del tiempo' })

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
  - button "Notificaciones, 4 sin leer": "4"
- link "Camila Rojas Estudiante":
  - /url: /profile
- button "Opciones"
- paragraph: VentyLab v0.1.0
- main:
  - heading "Sesión de simulación" [level=1]
  - text: Examen
  - alert "Examen bloqueado":
    - heading "Examen bloqueado" [level=2]
    - paragraph: "No se puede iniciar el examen: la sesión usa el motor 2.0.0 y este navegador ejecuta el motor 1.0.0. Recarga la página para actualizar la aplicación o avisa a tu docente."
    - link "Volver al simulador":
      - /url: /simulador?tab=simular
- alert: Sesión de simulación | VentyLab
```

# Test source

```ts
  1  | /*
  2  | * Funcionalidad: E2E EXAM practical question in the locked console
  3  | * Descripción: The demo seed has no evaluation with a SIMULATION question, so the setup creates one through the API as the teacher (EXAM with one SIMULATION question on the published case "Pulmón normal: postoperatorio inmediato" and a one-criterion rubric, marked READY and assigned to the student's demo group for one day). The student opens it, starts the attempt and "Iniciar parte práctica": the console opens on /simulator/sessions/[id] in locked mode (no workspace tabs, no Digital/Real selector, fixed speed without pause, exam timer, curves visible) and "Finalizar sesión" takes her back to the attempt. Cleanup closes the assignment and archives the evaluation. Depends on @playwright/test and the e2e support helpers. v0.2 (Bloque 5, W5-1): the July locked console has no "Modo del monitor" nor "Pausar", and "Ajustar" of the value cards is disabled with the description "Disponible fuera del examen" (D29).
  4  | * Versión: 0.2
  5  | * Autor: Marcela Mazo Castro
  6  | * Proyecto: VentyLab
  7  | * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
  8  | * Institución: Universidad del Valle
  9  | * Contacto: marcela.mazo@correounivalle.edu.co
  10 | */
  11 | 
  12 | import { expect, test } from "@playwright/test";
  13 | import { STUDENT_STORAGE_STATE, TEACHER_STORAGE_STATE } from "./support/auth";
  14 | import { backendApiAs, savedUserOf } from "./support/backend-api";
  15 | import { CURVES_LABEL, SIMULATOR_VIEWPORT } from "./support/simulator";
  16 | 
  17 | test.use({ viewport: SIMULATOR_VIEWPORT });
  18 | 
  19 | const EXAM_CASE_ID = "engine-normal-lung";
  20 | const DAY_MS = 86_400_000;
  21 | 
  22 | type Group = { id: string, type: string, simulatorLeaderId: string | null };
  23 | 
  24 | test("a SIMULATION question of an exam opens the console in locked mode", async ({ page, request }) => {
  25 |   test.setTimeout(150_000);
  26 |   const student = savedUserOf(STUDENT_STORAGE_STATE);
  27 |   const teacher = await backendApiAs(request, TEACHER_STORAGE_STATE);
  28 |   const groups = await teacher.call<Group[]>("GET", "/api/groups");
  29 |   const group = groups.find((candidate) => candidate.type === "STUDENT" && candidate.simulatorLeaderId === student.id);
  30 | 
  31 |   expect(group, `a student group of ${student.email} (demo seed)`).toBeDefined();
  32 | 
  33 |   const title = `E2E examen práctico ${Date.now().toString(36)}`;
  34 |   const evaluation = await teacher.call<{ id: string }>("POST", "/api/evaluations", { type: "EXAM", title, showResultsImmediately: true, maxAttempts: 1 });
  35 |   const prompt = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Ventila al paciente del caso." }] }] };
  36 | 
  37 |   await teacher.call("POST", `/api/evaluations/${evaluation.id}/questions`, {
  38 |     type: "SIMULATION",
  39 |     prompt,
  40 |     points: 10,
  41 |     clinicalCaseId: EXAM_CASE_ID,
  42 |     rubric: { criteria: [{ parameter: "peep", expectedValue: 5, min: 5, max: 8, priority: "IMPORTANTE" }] },
  43 |   });
  44 |   await teacher.call("PATCH", `/api/evaluations/${evaluation.id}/status`, { status: "READY" });
  45 |   const now = Date.now();
  46 |   const assignment = await teacher.call<{ ids: string[] }>("POST", `/api/evaluations/${evaluation.id}/assignments`, {
  47 |     groupIds: [group?.id],
  48 |     startsAt: new Date(now - 60_000).toISOString(),
  49 |     endsAt: new Date(now + DAY_MS).toISOString(),
  50 |   });
  51 | 
  52 |   try {
  53 |     await page.goto(`/evaluations/${evaluation.id}`);
  54 |     await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible({ timeout: 30_000 });
  55 |     await page.getByRole("button", { name: "Comenzar" }).click();
  56 |     await expect(page).toHaveURL(/\/attempts\/[^/]+$/, { timeout: 30_000 });
  57 |     const attemptUrl = page.url();
  58 | 
  59 |     await page.getByRole("region", { name: "Parte práctica en el simulador" }).getByRole("button", { name: "Iniciar parte práctica" }).click();
  60 |     await expect(page).toHaveURL(/\/simulator\/sessions\/[^/?#]+$/, { timeout: 30_000 });
  61 | 
  62 |     // Locked console: same monitor, without the workspace chrome nor speed or pause controls.
  63 |     await expect(page.getByRole("heading", { name: "Sesión de simulación", level: 1 })).toBeVisible({ timeout: 30_000 });
  64 |     const clock = page.getByRole("group", { name: "Control del tiempo" });
  65 | 
> 66 |     await expect(clock).toContainText("Velocidad fija ×1 (examen, sin pausa)", { timeout: 30_000 });
     |                         ^ Error: expect(locator).toContainText(expected) failed
  67 |     await expect(clock.getByRole("button")).toHaveCount(0);
  68 |     await expect(page.getByRole("timer").filter({ hasText: "Tiempo restante del examen" })).toBeVisible();
  69 |     await expect(page.getByRole("img", { name: CURVES_LABEL })).toBeVisible();
  70 |     await expect(page.getByRole("tablist", { name: "Secciones del simulador" })).toHaveCount(0);
  71 |     await expect(page.getByRole("group", { name: "Modo del monitor" })).toHaveCount(0);
  72 |     await expect(page.getByRole("button", { name: "Asesoría IA" })).toBeDisabled();
  73 |     await expect(page.getByRole("button", { name: "Pausar" })).toHaveCount(0);
  74 |     // The value cards keep the saved preference but cannot be adjusted during the exam (D29).
  75 |     const adjust = page.getByRole("region", { name: "Valores" }).getByRole("button", { name: "Ajustar" });
  76 | 
  77 |     await expect(adjust).toBeDisabled();
  78 |     await expect(adjust).toHaveAccessibleDescription("Disponible fuera del examen");
  79 |     await expect(page.getByText("Disponible fuera del examen")).toBeVisible();
  80 | 
  81 |     await page.getByRole("button", { name: "Finalizar sesión" }).click();
  82 |     await page.getByRole("dialog").getByRole("button", { name: "Finalizar", exact: true }).click();
  83 |     await expect(page).toHaveURL(attemptUrl, { timeout: 60_000 });
  84 |   } finally {
  85 |     for (const id of assignment.ids) {
  86 |       await teacher.call("POST", `/api/evaluations/${evaluation.id}/assignments/${id}/close`).catch(() => undefined);
  87 |     }
  88 | 
  89 |     await teacher.call("PATCH", `/api/evaluations/${evaluation.id}/status`, { status: "ARCHIVED" }).catch(() => undefined);
  90 |   }
  91 | });
  92 | 
```