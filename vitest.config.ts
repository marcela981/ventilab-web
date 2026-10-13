/*
* Funcionalidad: Vitest configuration
* Descripción: Test runner for the new-code folders only (template structure). jsdom environment, @shared/@features aliases and the jest-dom setup file. Depends on vitest and jsdom.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const NEW_SHARED = "src/shared/{api-client,realtime,session,design-system,layouts,rich-content,waveforms,ai-rating,lib}";
const NEW_FEATURES = "src/features/{auth/api,auth/application,profile/api,profile/application,groups}";
const TEST_FILES = "**/*.{test,spec}.{ts,tsx}";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
      "@features": fileURLToPath(new URL("./src/features", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [`${NEW_SHARED}/${TEST_FILES}`, `${NEW_FEATURES}/${TEST_FILES}`],
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
  },
});
