/*
* Funcionalidad: E2E sign-in setup
* Descripción: Setup project of Playwright: signs the student in once through the login form and saves the browser storage (tokens in localStorage) to e2e/.auth/student.json, which the e2e and perf projects reuse. Depends on @playwright/test and the auth helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { test as setup } from "@playwright/test";
import { signIn, STUDENT_CREDENTIALS, STUDENT_STORAGE_STATE } from "./auth";

setup("sign in as student", async ({ page }) => {
  await signIn(page, STUDENT_CREDENTIALS);
  await page.context().storageState({ path: STUDENT_STORAGE_STATE });
});
