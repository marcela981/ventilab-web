/*
* Funcionalidad: Vitest configuration
* Descripción: Test runner for the new-code folders (template structure) plus the legacy coexistence adapters covered in T8 (session expiry, legacy SocketContext). jsdom environment, @shared/@features/@ aliases and the jest-dom setup file. v1.2 (T0 learning): the learning and content-editor features join the test include. v1.3 (S0 evaluations): the evaluations, evaluation-authoring and grading features join the test include. v1.4 (G3 grading): the shared charts module joins the test include. v1.5 (S1): the shared media-upload module joins the test include. v1.6 (A1 ai-chat): the ai-chat feature joins the test include. v1.7 (T1 simulation): the shared sim-engine module joins the test include. v1.8 (T1 fix simulation): the shared ventilator-console module joins the test include. v1.9 (T5 simulation): the simulator feature joins the test include. v1.10 (T10 simulation): the shared rubric-editor module joins the test include. v1.11 (T11 simulation): the case-editor feature joins the test include. v1.12 (T0 ventilator-lab): the ventilator-lab feature joins the test include. v1.13 (T8 ventilator-lab): the pure core of the fake ventilator test script (scripts/e2e/*.test.mjs) joins the test include. v1.14 (O0 operation): the notifications, student-space, teacher-dashboard and admin-console features join the test include. v1.15 (W1 Bloque 1): the simulator-workspace feature joins the test include. v1.16 (Ola 0 CI): the jsdom environment is wrapped by vitest.environment.ts, which keeps the native AbortController/AbortSignal so fetch (undici 7 on Node 24) accepts the signals. Depends on vitest and jsdom.
* Versión: 1.16
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const NEW_SHARED = "src/shared/{api-client,realtime,session,design-system,layouts,rich-content,waveforms,charts,ai-rating,media-upload,ai-conversation,lib,sim-engine,ventilator-console,rubric-editor}";
const NEW_FEATURES = "src/features/{auth/api,auth/application,profile/api,profile/application,groups,learning,content-editor,evaluations,evaluation-authoring,grading,ai-chat,simulator,simulator-workspace,case-editor,ventilator-lab,notifications,student-space,teacher-dashboard,admin-console}";
const TEST_FILES = "**/*.{test,spec}.{ts,tsx}";
// Legacy files that adapt to new shared code (T8); their tests live next to them.
const LEGACY_ADAPTER_TESTS = ["src/shared/services/*.test.ts", "src/shared/contexts/*.test.tsx"];
// Pure parts of the test tooling scripts (plain ES modules).
const SCRIPT_TESTS = ["scripts/e2e/*.test.mjs"];

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
      "@features": fileURLToPath(new URL("./src/features", import.meta.url)),
      // Legacy alias, needed only by the legacy adapter tests.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // jsdom with the native AbortController/AbortSignal (see vitest.environment.ts).
    environment: "./vitest.environment.ts",
    setupFiles: ["./vitest.setup.ts"],
    include: [`${NEW_SHARED}/${TEST_FILES}`, `${NEW_FEATURES}/${TEST_FILES}`, ...LEGACY_ADAPTER_TESTS, ...SCRIPT_TESTS],
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
  },
});
