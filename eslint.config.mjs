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
 * Versión: 3.1
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

const NEW_SHARED_MODULES = "api-client,realtime,session,design-system,layouts,rich-content,waveforms,ai-rating,lib";
const NEW_FEATURES = "auth,profile,groups";
const SOURCE_EXT = "{js,jsx,ts,tsx,mjs,cjs}";
// auth/ and profile/ still hold legacy files at their root and in components/ (to be
// replaced in T9/T10), so only their template layers count as new code. groups/ has
// no legacy, so the whole folder is new code.
const NEW_FEATURE_FILES = [
  `src/features/{auth,profile}/{api,application}/**/*.${SOURCE_EXT}`,
  `src/features/{${NEW_FEATURES}}/index.ts`,
  `src/features/groups/**/*.${SOURCE_EXT}`,
];

// Thin route files under pages/ that already follow the new structure. Add each
// one here when it is created or rewritten (T6+); they get the new-code rules.
const NEW_PAGE_FILES = ["pages/auth/login/index.tsx"];

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
          pattern: [`src/features/{auth,profile}/{api,application,UI}/**/*`, `src/features/(groups)/**/*`],
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
];

export default eslintConfig;
