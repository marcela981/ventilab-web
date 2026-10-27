/*
* Funcionalidad: E2E authentication helpers
* Descripción: Credentials of the browser tests and the email sign-in through the real login form. The student account defaults to the demo seed of ventylab-server (`npm run demo:seed`, prisma/demo) and can be overridden with E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD; the saved session (access and refresh tokens in localStorage) lives in e2e/.auth/, which is not versioned. The backend throttles sign-in to 5 requests per minute, so specs reuse the saved session instead of signing in again. Depends on @playwright/test. v0.2 (W12, Bloque 1): adds the non-leader member of the same demo group (estudiante02, group "Grupo A", whose leader is estudiante01) and the teacher (ana.torres) with their own saved sessions, and `isRecentStorageState` so the setup skips the form sign-in while a saved session is younger than E2E_AUTH_MAX_AGE_H hours (default 6; 0 always signs in again).
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { statSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

export const STUDENT_STORAGE_STATE = "e2e/.auth/student.json";
export const MEMBER_STORAGE_STATE = "e2e/.auth/member.json";
export const TEACHER_STORAGE_STATE = "e2e/.auth/teacher.json";

export type Credentials = { email: string, password: string };

// Demo-only accounts created by ventylab-server prisma/demo (public demo password, never real users).
const DEMO_PASSWORD = "VentyLab-Demo-2026";

/** Student and leader of the demo group "Grupo A". */
export const STUDENT_CREDENTIALS: Credentials = {
  email: process.env.E2E_STUDENT_EMAIL ?? "estudiante01@ventylab.demo",
  password: process.env.E2E_STUDENT_PASSWORD ?? DEMO_PASSWORD,
};

/** Member (not leader) of the same demo group as the student. */
export const MEMBER_CREDENTIALS: Credentials = {
  email: process.env.E2E_MEMBER_EMAIL ?? "estudiante02@ventylab.demo",
  password: process.env.E2E_MEMBER_PASSWORD ?? DEMO_PASSWORD,
};

export const TEACHER_CREDENTIALS: Credentials = {
  email: process.env.E2E_TEACHER_EMAIL ?? "ana.torres@ventylab.demo",
  password: process.env.E2E_TEACHER_PASSWORD ?? DEMO_PASSWORD,
};

const MAX_AGE_MS = Number(process.env.E2E_AUTH_MAX_AGE_H ?? 6) * 3_600_000;

/** True when the saved session exists and is recent enough to reuse (the app refreshes its access token itself). */
export function isRecentStorageState(path: string): boolean {
  try {
    return Date.now() - statSync(path).mtimeMs < MAX_AGE_MS;
  } catch {
    return false;
  }
}

/** Signs in through the login form and waits until the app leaves /auth/login. */
export async function signIn(page: Page, credentials: Credentials): Promise<void> {
  await page.goto("/auth/login");
  await page.getByRole("textbox", { name: "Correo electrónico" }).fill(credentials.email);
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
}
