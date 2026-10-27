/*
* Funcionalidad: Playwright configuration
* Descripción: Browser test harness of the web. Three projects: `setup` signs the student in once and saves the session (localStorage tokens) to e2e/.auth/, `e2e` runs the functional specs (every *.spec.ts under e2e except the perf folder) and `perf` runs the simulator performance measurement (e2e/perf). The base URL comes from E2E_BASE_URL (default the local `next start`, http://localhost:3000). Chromium only, full browser in new headless mode (channel "chromium") so frame scheduling matches a real Chrome rather than the headless shell. Depends on @playwright/test.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { defineConfig, devices } from "@playwright/test";
import { STUDENT_STORAGE_STATE } from "./e2e/support/auth";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: process.env.CI !== undefined,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /support[\\/]auth\.setup\.ts$/,
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
    {
      name: "e2e",
      testMatch: /.*\.spec\.ts$/,
      testIgnore: /perf[\\/]/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], channel: "chromium", storageState: STUDENT_STORAGE_STATE },
    },
    {
      name: "perf",
      testMatch: /perf[\\/].*\.spec\.ts$/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        storageState: STUDENT_STORAGE_STATE,
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        trace: "off",
        video: "off",
      },
    },
  ],
});
