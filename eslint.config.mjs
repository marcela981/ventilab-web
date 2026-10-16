/*
 * Funcionalidad: Configuración de ESLint (flat config)
 * Descripción: Usa los flat configs nativos de eslint-config-next 16 mediante
 *   imports directos, sin FlatCompat/@eslint/eslintrc (que provocaba un error de
 *   estructura circular con ESLint 9). Compatible con `npx eslint .`.
 *   v3.0: agrega, solo para las carpetas de código nuevo (estructura template),
 *   fronteras de arquitectura con eslint-plugin-boundaries (features solo importan
 *   src/shared nuevo y el index.ts de otras features; shared nunca importa features;
 *   código nuevo nunca importa legacy) y la prohibición de sx/style/styled().
 *   `npm run lint` revisa el código nuevo; `npm run lint:legacy` conserva `eslint .`.
 *   v3.1 (T9): la ruta delgada pages/auth/login/index.tsx entra en NEW_PAGE_FILES.
 *   v3.2 (T10): pages/profile/index.tsx entra en NEW_PAGE_FILES; profile/ ya no tiene
 *   legacy (eliminado en T10), así que toda la carpeta es código nuevo, como groups/.
 *   v3.3 (T11a): pages/my-group/index.tsx y pages/groups/index.tsx entran en NEW_PAGE_FILES.
 *   v3.4 (T11b): pages/groups/[groupId].tsx entra en NEW_PAGE_FILES como `[[]groupId[]]`:
 *   en un glob `[groupId]` sería una clase de caracteres y el escape con `\[` no coincide
 *   en Windows; las clases `[[]` y `[]]` sí coinciden con los corchetes literales.
 *   v3.5 (T0 learning): registra las features nuevas learning y content-editor (sin legacy,
 *   toda la carpeta es código nuevo con el layout template); sus rutas delgadas se agregan
 *   a NEW_PAGE_FILES en las tareas que las crean.
 *   v3.6 (L1 learning): pages/learn/index.tsx, pages/learn/[sectionId].tsx y
 *   pages/learn/modules/[moduleId]/index.tsx entran en NEW_PAGE_FILES.
 *   v3.7 (L3 learning): pages/learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber].tsx
 *   entra en NEW_PAGE_FILES.
 *   v3.8 (L7 learning): pages/learn/modules/[moduleId]/print.tsx entra en NEW_PAGE_FILES.
 *   v3.9 (C1 content-editor): pages/content/index.tsx entra en NEW_PAGE_FILES.
 *   v3.10 (C4 content-editor): pages/content/pages/[pageId].tsx entra en NEW_PAGE_FILES.
 *   v3.11 (R1): pages/teaching/[moduleId]/[lessonId].tsx (redireccion legada) entra en NEW_PAGE_FILES.
 *   v3.12 (S0 evaluations): registra las features nuevas evaluations, evaluation-authoring y
 *   grading (sin legacy); pages/evaluations/index.tsx y pages/evaluations/[evaluationId]/index.tsx
 *   entran en NEW_PAGE_FILES.
 *   v3.13 (E2 evaluations): pages/evaluations/[evaluationId]/attempts/[attemptId]/index.tsx
 *   entra en NEW_PAGE_FILES.
 *   v3.14 (E3 evaluations): pages/evaluations/[evaluationId]/attempts/[attemptId]/result.tsx
 *   entra en NEW_PAGE_FILES.
 *   v3.15 (A1 evaluation-authoring): pages/evaluations/manage/index.tsx entra en NEW_PAGE_FILES.
 *   v3.16 (A2 evaluation-authoring): pages/evaluations/manage/new.tsx y
 *   pages/evaluations/manage/[evaluationId]/edit.tsx entran en NEW_PAGE_FILES.
 *   v3.17 (A4 evaluation-authoring): pages/evaluations/manage/[evaluationId]/assignments.tsx
 *   entra en NEW_PAGE_FILES.
 *   v3.18 (G1 grading): pages/grading/index.tsx entra en NEW_PAGE_FILES.
 *   v3.19 (G2 grading): pages/grading/attempts/[attemptId].tsx entra en NEW_PAGE_FILES.
 *   v3.20 (G3 grading): nuevo módulo compartido src/shared/charts y la ruta delgada
 *   pages/grading/evaluations/[evaluationId].tsx entra en NEW_PAGE_FILES.
 *   v3.21 (R1 evaluations): las rutas legadas pages/evaluation/** pasan a ser redirecciones
 *   delgadas .tsx a las rutas nuevas y entran en NEW_PAGE_FILES.
 *   v3.22 (merge): integra las rutas de evaluations/grading con las de learning/content-editor.
 *   v3.23 (S1): nuevo módulo compartido src/shared/media-upload (subida de archivos multimedia).
 *   v3.24 (A1 ai-chat): nueva feature src/features/ai-chat (sin legado) y sus rutas delgadas
 *   pages/assistant/index.tsx y pages/assistant/[conversationId].tsx.
 *   v3.25 (T1 simulation): nuevo módulo compartido src/shared/sim-engine; su copia vendorizada del
 *   motor (engine/**, generada por scripts/sync-sim-engine.mjs) se ignora como el cliente OpenAPI
 *   generado. Regla preventiva: src/shared/ventilator-console no puede importar @shared/sim-engine
 *   ni @features/*.
 *   v3.26 (T1 fix simulation): src/shared/ventilator-console entra en NEW_SHARED_MODULES (código
 *   nuevo: prohibición de sx/style/styled y fronteras shared→shared); su override solo agrega a la
 *   prohibición de imports de estilo la de @shared/sim-engine y @features/*.
 * Versión: 3.26
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import boundaries from "eslint-plugin-boundaries";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const NEW_SHARED_MODULES = "api-client,realtime,session,design-system,layouts,rich-content,waveforms,charts,ai-rating,media-upload,ai-conversation,lib,sim-engine,ventilator-console";
const NEW_FEATURES = "auth,profile,groups,learning,content-editor,evaluations,evaluation-authoring,grading,ai-chat";
const SOURCE_EXT = "{js,jsx,ts,tsx,mjs,cjs}";
// auth/ still holds legacy files at its root and in components/, so only its template
// layers count as new code. profile/ (legacy removed in T10), groups/, learning/ and
// content-editor/ have no legacy, so the whole folder is new code.
const LEGACY_FREE_FEATURES = "profile,groups,learning,content-editor,evaluations,evaluation-authoring,grading,ai-chat";
const NEW_FEATURE_FILES = [
  `src/features/auth/{api,application}/**/*.${SOURCE_EXT}`,
  `src/features/{${NEW_FEATURES}}/index.ts`,
  `src/features/{${LEGACY_FREE_FEATURES}}/**/*.${SOURCE_EXT}`,
];

// Thin route files under pages/ that already follow the new structure. Add each
// one here when it is created or rewritten (T6+); they get the new-code rules.
const NEW_PAGE_FILES = [
  "pages/auth/login/index.tsx",
  "pages/profile/index.tsx",
  "pages/my-group/index.tsx",
  "pages/groups/index.tsx",
  "pages/groups/[[]groupId[]].tsx",
  "pages/learn/index.tsx",
  "pages/learn/[[]sectionId[]].tsx",
  "pages/learn/modules/[[]moduleId[]]/index.tsx",
  "pages/learn/modules/[[]moduleId[]]/print.tsx",
  "pages/learn/modules/[[]moduleId[]]/lessons/[[]lessonId[]]/[[]pageNumber[]].tsx",
  "pages/content/index.tsx",
  "pages/content/pages/[[]pageId[]].tsx",
  "pages/teaching/[[]moduleId[]]/[[]lessonId[]].tsx",
  "pages/evaluations/index.tsx",
  "pages/evaluations/[[]evaluationId[]]/index.tsx",
  "pages/evaluations/[[]evaluationId[]]/attempts/[[]attemptId[]]/index.tsx",
  "pages/evaluations/[[]evaluationId[]]/attempts/[[]attemptId[]]/result.tsx",
  "pages/evaluations/manage/index.tsx",
  "pages/evaluations/manage/new.tsx",
  "pages/evaluations/manage/[[]evaluationId[]]/edit.tsx",
  "pages/evaluations/manage/[[]evaluationId[]]/assignments.tsx",
  "pages/grading/index.tsx",
  "pages/grading/attempts/[[]attemptId[]].tsx",
  "pages/grading/evaluations/[[]evaluationId[]].tsx",
  "pages/evaluation/index.tsx",
  "pages/evaluation/[[]activityId[]].tsx",
  "pages/evaluation/manage/index.tsx",
  "pages/evaluation/manage/new.tsx",
  "pages/evaluation/manage/[[]activityId[]]/edit.tsx",
  "pages/evaluation/grade/index.tsx",
  "pages/evaluation/grade/[[]activityId[]].tsx",
  "pages/assistant/index.tsx",
  "pages/assistant/[[]conversationId[]].tsx",
];

const NEW_CODE_FILES = [
  `src/shared/{${NEW_SHARED_MODULES}}/**/*.${SOURCE_EXT}`,
  ...NEW_FEATURE_FILES,
  ...NEW_PAGE_FILES,
];

const STYLE_BAN_SYNTAX = [
  {
    selector: "JSXAttribute[name.name='sx']",
    message: "The `sx` prop is not allowed in new code. Use a CSS Module in the UI/ folder.",
  },
  {
    selector: "JSXAttribute[name.name='style']",
    message: "Inline `style` is not allowed in new code. Use a CSS Module in the UI/ folder.",
  },
  {
    selector: "CallExpression[callee.name='styled']",
    message: "`styled()` is not allowed in new code. Use a CSS Module in the UI/ folder.",
  },
  {
    selector: "MemberExpression[object.name='styled']",
    message: "`styled.x` is not allowed in new code. Use a CSS Module in the UI/ folder.",
  },
];

const STYLE_BAN_IMPORTS = {
  paths: [
    { name: "styled-components", message: "styled-components is not allowed in new code. Use CSS Modules." },
    { name: "@emotion/styled", message: "@emotion/styled is not allowed in new code. Use CSS Modules." },
    { name: "@mui/material/styles", importNames: ["styled"], message: "MUI styled() is not allowed in new code. Use CSS Modules." },
    { name: "@mui/material", importNames: ["styled"], message: "MUI styled() is not allowed in new code. Use CSS Modules." },
    { name: "@mui/system", importNames: ["styled"], message: "MUI styled() is not allowed in new code. Use CSS Modules." },
  ],
  patterns: [
    {
      group: ["@/*"],
      message: "Legacy `@/...` aliases are not allowed in new code. Use @shared/* or @features/<name> (index.ts only).",
    },
  ],
};

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "out/**",
      "public/**",
      "next-env.d.ts",
      "src/shared/api-client/generated/**",
      "src/shared/sim-engine/engine/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: [`src/**/*.${SOURCE_EXT}`, `pages/**/*.${SOURCE_EXT}`, `lib/**/*.${SOURCE_EXT}`],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.json", alwaysTryTypes: true },
        node: true,
      },
      "boundaries/include": [`src/**/*`, `pages/**/*`, `lib/**/*`],
      // First match wins: new-code elements are declared before the legacy catch-all.
      "boundaries/elements": [
        { type: "shared", mode: "full", pattern: `src/shared/{${NEW_SHARED_MODULES}}/**/*` },
        {
          type: "feature-index",
          mode: "full",
          pattern: `src/features/{${NEW_FEATURES}}/index.ts`,
          capture: ["feature"],
        },
        {
          type: "feature",
          mode: "full",
          pattern: [
            `src/features/{auth,profile,learning,content-editor,evaluations,evaluation-authoring,grading,ai-chat}/{api,application,UI}/**/*`,
            `src/features/(groups)/**/*`,
          ],
          capture: ["feature"],
        },
        ...(NEW_PAGE_FILES.length > 0 ? [{ type: "page", mode: "full", pattern: NEW_PAGE_FILES }] : []),
        { type: "legacy", mode: "full", pattern: [`src/**/*`, `pages/**/*`, `lib/**/*`] },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          message: "${file.type} must not import ${dependency.type} (new-code architecture boundaries)",
          rules: [
            { from: "legacy", allow: ["legacy", "shared", "feature-index", "feature"] },
            { from: "shared", allow: ["shared"] },
            { from: "feature-index", allow: ["shared", "feature-index", ["feature", { feature: "${from.feature}" }]] },
            { from: "feature", allow: ["shared", "feature-index", ["feature", { feature: "${from.feature}" }]] },
            { from: "page", allow: ["shared", "feature-index"] },
          ],
        },
      ],
    },
  },
  {
    files: NEW_CODE_FILES,
    rules: {
      "no-restricted-syntax": ["error", ...STYLE_BAN_SYNTAX],
      "no-restricted-imports": ["error", STYLE_BAN_IMPORTS],
    },
  },
  {
    // The generic console stays engine- and feature-agnostic: features adapt the engine to it.
    // It is new shared code (NEW_SHARED_MODULES), so the style-ban syntax rule already applies; this
    // override only replaces no-restricted-imports, so it repeats the style-ban paths and patterns.
    files: [`src/shared/ventilator-console/**/*.${SOURCE_EXT}`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: STYLE_BAN_IMPORTS.paths,
          patterns: [
            ...STYLE_BAN_IMPORTS.patterns,
            {
              group: ["@shared/sim-engine", "@shared/sim-engine/*", "**/sim-engine", "**/sim-engine/**"],
              message: "shared/ventilator-console must not import sim-engine; the feature adapter connects them.",
            },
            {
              group: ["@features/*", "**/features/**"],
              message: "shared/ventilator-console must not import features.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
