/*
* Funcionalidad: E2E authentication helpers
* Descripción: Credentials of the browser tests and the email sign-in through the real login form. The student account defaults to the demo seed of ventylab-server (`npm run demo:seed`, prisma/demo) and can be overridden with E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD; the saved session (access and refresh tokens in localStorage) lives in e2e/.auth/, which is not versioned. The backend throttles sign-in to 5 requests per minute, so specs reuse the saved session instead of signing in again. Depends on @playwright/test.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Page } from "@playwright/test";

export const STUDENT_STORAGE_STATE = "e2e/.auth/student.json";

export type Credentials = { email: string, password: string };

// Demo-only account created by ventylab-server prisma/demo (public demo password, never a real user).
const DEMO_PASSWORD = "VentyLab-Demo-2026";

export const STUDENT_CREDENTIALS: Credentials = {
  email: process.env.E2E_STUDENT_EMAIL ?? "estudiante01@ventylab.demo",
  password: process.env.E2E_STUDENT_PASSWORD ?? DEMO_PASSWORD,
};

/** Signs in through the login form and waits until the app leaves /auth/login. */
export async function signIn(page: Page, credentials: Credentials): Promise<void> {
  await page.goto("/auth/login");
  await page.getByRole("textbox", { name: "Correo electrónico" }).fill(credentials.email);
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
}
