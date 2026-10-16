/*
* Funcionalidad: Vitest configuration
* Descripción: Test runner for the new-code folders (template structure) plus the legacy coexistence adapters covered in T8 (session expiry, legacy SocketContext). jsdom environment, @shared/@features/@ aliases and the jest-dom setup file. v1.2 (T0 learning): the learning and content-editor features join the test include. v1.3 (S0 evaluations): the evaluations, evaluation-authoring and grading features join the test include. v1.4 (G3 grading): the shared charts module joins the test include. v1.5 (S1): the shared media-upload module joins the test include. v1.6 (A1 ai-chat): the ai-chat feature joins the test include. v1.7 (T1 simulation): the shared sim-engine module joins the test include. v1.8 (T1 fix simulation): the shared ventilator-console module joins the test include. v1.9 (T5 simulation): the simulator feature joins the test include. Depends on vitest and jsdom.
* Versión: 1.9
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const NEW_SHARED = "src/shared/{api-client,realtime,session,design-system,layouts,rich-content,waveforms,charts,ai-rating,media-upload,ai-conversation,lib,sim-engine,ventilator-console}";
const NEW_FEATURES = "src/features/{auth/api,auth/application,profile/api,profile/application,groups,learning,content-editor,evaluations,evaluation-authoring,grading,ai-chat,simulator}";
const TEST_FILES = "**/*.{test,spec}.{ts,tsx}";
// Legacy files that adapt to new shared code (T8); their tests live next to them.
const LEGACY_ADAPTER_TESTS = ["src/shared/services/*.test.ts", "src/shared/contexts/*.test.tsx"];

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
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [`${NEW_SHARED}/${TEST_FILES}`, `${NEW_FEATURES}/${TEST_FILES}`, ...LEGACY_ADAPTER_TESTS],
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
  },
});
