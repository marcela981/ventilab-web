/*
* Funcionalidad: Render audit of lesson pages (ajustes B, B2 and B3)
* Descripción: At 375, 1280 and 1920 px wide, in the light and dark schemes, renders (1) a fixture page created through the CMS API with every block type (long text, inline and display LaTeX, EQUATION, table, lists, markdown image, VIDEO, CODE, DIVIDER and the five CALLOUT variants) inside a draft lesson of the demo module that an administrator (E2E_ADMIN_EMAIL, superadmin@ventylab.demo by default) creates and deletes afterwards, and (2) every page of one lesson per level of the imported curriculum (skipped when it is not imported). Each page must keep all its content inside the lesson article (only tables, code and display math may scroll inside their own region), show no KaTeX error, load every image and wrap every table in its scroll region. E2E_AUDIT_ALL=1 audits every page of the curriculum; E2E_CAPTURES=1 writes screenshots to docs/ajustes-b/render/. Depends on @playwright/test and the auth, backend-api, curriculum and learning e2e helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { TEACHER_STORAGE_STATE } from "../support/auth";
import { backendApiAs, type BackendApi } from "../support/backend-api";
import { curriculumImported, curriculumModuleIds, type LessonPages, lessonsOfModule, measureLessonPage, type RenderReport, SAMPLE_MODULES, applyColorScheme } from "../support/curriculum";
import { apiOf, apiSignIn, DEMO_MODULE_ID, lessonPageUrl } from "../support/learning";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "superadmin@ventylab.demo";

const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1920", width: 1920, height: 1080 },
] as const;

const SCHEMES = ["light", "dark"] as const;

const CAPTURES = process.env.E2E_CAPTURES === "1";
const OUT_DIR = process.env.E2E_CAPTURES_DIR ?? "docs/ajustes-b/render";

const LONG_TEXT = Array.from({ length: 6 }, (_, index) =>
  `Párrafo ${index + 1}: la presión en la vía aérea durante una respiración controlada por volumen depende de la carga elástica y de la carga resistiva del sistema respiratorio; una palabra larga como electroencefalografía o una URL como https://doi.org/10.1056/NEJMoa1405303 no debe desbordar la columna.`).join("\n\n");

const FIXTURE_BLOCKS: { type: string, title?: string, content: Record<string, unknown> }[] = [
  { type: "INTRODUCTION", title: "Texto largo", content: { markdown: LONG_TEXT } },
  {
    type: "THEORY",
    title: "LaTeX en línea y en bloque",
    content: {
      markdown: [
        "La compliance estática es $C_{st} = \\frac{V_T}{P_{plat} - PEEP_{total}}$ y la constante de tiempo $\\tau = R \\cdot C$.",
        "",
        "$$",
        "P_{aw}(t) = \\frac{V(t)}{C_{rs}} + R_{aw}\\cdot\\dot{V}(t) + PEEP_{total} + \\frac{1}{2}\\left(\\frac{\\Delta V^{2}}{C_{rs}}\\right) + \\sum_{i=1}^{n} \\frac{V_i}{C_i} + \\int_{0}^{T_i} \\dot{V}(t)\\,dt",
        "$$",
      ].join("\n"),
    },
  },
  { type: "EQUATION", title: "Potencia mecánica", content: { latex: "MP = 0.098 \\cdot FR \\cdot V_T \\cdot \\left(P_{pico} - \\frac{1}{2}\\,\\Delta P\\right)", display: true } },
  {
    type: "THEORY",
    title: "Tabla ancha y listas",
    content: {
      markdown: [
        "| Parámetro | Símbolo | Unidad | Valor inicial | Rango de ajuste | Comentario clínico |",
        "|---|---|---|---|---|---|",
        "| Volumen corriente | $V_T$ | mL/kg de peso predicho | 6 | 4-8 | Ajustar según presión meseta y driving pressure |",
        "| Frecuencia respiratoria | FR | rpm | 18 | 12-35 | Vigilar auto-PEEP y PaCO₂ |",
        "| Presión positiva al final de la espiración | PEEP | cmH₂O | 5 | 5-24 | Tabla FiO₂/PEEP o titulación |",
        "",
        "1. Primer paso.",
        "2. Segundo paso con **negrita** y `código en línea`.",
        "   - Sublista anidada.",
        "",
        "- [x] Tarea hecha",
        "- [ ] Tarea pendiente",
      ].join("\n"),
    },
  },
  { type: "THEORY", title: "Imagen", content: { markdown: "![Curvas de presión, flujo y volumen en VCV](/learning/diagrams/b5-vcv-curvas-escalares.svg \"Figura: curvas escalares en VCV\")" } },
  { type: "VIDEO", title: "Video", content: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", caption: "Video de ejemplo" } },
  { type: "CODE", title: "Código", content: { code: "const ventilacionMinuto = volumenCorriente * frecuenciaRespiratoria; // una línea de código muy larga que debe desplazarse dentro de su propio bloque", language: "ts" } },
  { type: "DIVIDER", content: {} },
  ...["info", "tip", "success", "warning", "error"].map((variant) => ({ type: "CALLOUT", title: `Aviso ${variant}`, content: { markdown: `Aviso de tipo **${variant}** con texto suficiente para ocupar más de una línea en un teléfono.`, variant } })),
  { type: "REFERENCES", title: "Referencias", content: { markdown: "- Amato, M. B. P., et al. (2015). Driving pressure and survival in the acute respiratory distress syndrome. *New England Journal of Medicine, 372*(8), 747-755. https://doi.org/10.1056/NEJMoa1405303" } },
];

async function staffApi(request: Parameters<typeof backendApiAs>[0]): Promise<BackendApi> {
  return backendApiAs(request, TEACHER_STORAGE_STATE);
}

function expectClean(report: RenderReport, label: string): void {
  expect(report.blocks, `${label}: blocks`).toBeGreaterThan(0);
  expect(report.overflowing, `${label}: content outside the article`).toEqual([]);
  expect(report.documentOverflow, `${label}: horizontal page scroll`).toBe(false);
  expect(report.katexErrors, `${label}: KaTeX errors`).toBe(0);
  expect(report.brokenImages, `${label}: broken images`).toEqual([]);
  expect(report.tablesWithoutScroll, `${label}: tables without scroll region`).toBe(0);
}

async function audit(context: BrowserContext, url: string, label: string, capture: string | null): Promise<void> {
  const page: Page = await context.newPage();

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(url);

    for (const scheme of SCHEMES) {
      await applyColorScheme(page, scheme);
      expectClean(await measureLessonPage(page), `${label} @${viewport.name} ${scheme}`);

      if (CAPTURES && capture !== null) {
        mkdirSync(OUT_DIR, { recursive: true });
// The app shell scrolls inside its own container: let every ancestor of the article grow so a full-page capture shows the whole lesson.
        await page.locator("article[aria-labelledby=\"lesson-page-title\"]").evaluate((article) => {
          for (let element = article.parentElement; element; element = element.parentElement) {
            element.style.setProperty("overflow", "visible");
            element.style.setProperty("height", "auto");
            element.style.setProperty("max-height", "none");
          }
        });
        await page.screenshot({ path: join(OUT_DIR, `${capture}-${viewport.name}-${scheme}.png`), fullPage: true, animations: "disabled" });
      }
    }
  }

  await page.close();
}

test.describe("lesson render audit", () => {
  test("every block type renders inside the page at every width and scheme", async ({ browser, request }) => {
    test.setTimeout(240_000);
    // Only an administrator may delete the fixture lesson afterwards.
    const api = apiOf(request, (await apiSignIn(request, ADMIN_EMAIL)).accessToken);
    const title = `E2E render ${Date.now()}`;

    // POST /api/lessons answers without the new id: read it back from the module.
    await api.call("POST", "/api/lessons", { title, content: { type: "lesson", sections: [{ type: "text", content: "E2E" }] }, moduleId: DEMO_MODULE_ID, status: "DRAFT", order: 900 });

    const lessons = await api.call<{ id: string, title: string }[]>("GET", `/api/modules/${DEMO_MODULE_ID}/lessons`);
    const lesson = lessons.find((entry) => entry.title === title);

    if (!lesson) {
      throw new Error("The fixture lesson was not created");
    }

    let pageId: string | null = null;

    try {
      const created = await api.call<{ id: string }>("POST", "/api/pages", { lessonId: lesson.id, title: "Todos los tipos de bloque", type: "THEORY", status: "PUBLISHED" });

      pageId = created.id;

      for (const block of FIXTURE_BLOCKS) {
        await api.call("POST", `/api/pages/${created.id}/blocks`, block);
      }

      const context = await browser.newContext({ storageState: TEACHER_STORAGE_STATE });

      await audit(context, lessonPageUrl(lesson.id, 1), "fixture", "bloques");
      await context.close();
    } finally {
      if (pageId !== null) {
        await api.call("DELETE", `/api/pages/${pageId}`).catch(() => undefined);
      }

      await api.call("DELETE", `/api/lessons/${lesson.id}`).catch(() => undefined);
    }
  });

  test("curriculum pages render inside the page at every width and scheme", async ({ browser, request }) => {
    test.setTimeout(process.env.E2E_AUDIT_ALL === "1" ? 7_200_000 : 600_000);
    const api = await staffApi(request);

    test.skip(!(await curriculumImported(api)), "the backend under test has no imported curriculum (prisma/import-curriculum.ts)");

    const moduleIds = process.env.E2E_AUDIT_ALL === "1" ? await curriculumModuleIds(api) : SAMPLE_MODULES.map((sample) => sample.moduleId);
    const context = await browser.newContext({ storageState: TEACHER_STORAGE_STATE });

    for (const moduleId of moduleIds) {
      const lessons: LessonPages[] = await lessonsOfModule(api, moduleId);
      const audited = process.env.E2E_AUDIT_ALL === "1" ? lessons : lessons.slice(0, 1);

      for (const lesson of audited) {
        for (const [index, lessonPage] of lesson.pages.entries()) {
          await audit(context, lessonPageUrl(lesson.lessonId, index + 1, moduleId), `${moduleId}/${lessonPage.title}`, index === 0 ? moduleId : null);
        }
      }
    }

    await context.close();
  });
});
