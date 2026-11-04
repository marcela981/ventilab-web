/*
* Funcionalidad: E2E (5) profile: change password revokes the previous refresh tokens (Bloque 4)
* Descripción: A brand-new student (signed in through the API, tokens injected in the browser) opens /profile?tab=password ("Cambiar contraseña"), types the current and the new password and confirms ("Contraseña actualizada correctamente"). POST /api/auth/refresh with the refresh token issued before the change answers 401, while the session of the browser (re-issued pair saved by the app) keeps working: a reload of the profile still shows it and its saved refresh token is accepted. Signing in through the login form with the new password works; the old password is refused (401). Both sign-ins wait out a 429 of the backend limit of 5 sign-ins per minute (the other specs sign in too). Depends on @playwright/test and the auth, backend API, learning and panel e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { type APIRequestContext, type APIResponse, expect, type Page, test } from "@playwright/test";
import type { Credentials } from "../support/auth";
import { API_URL } from "../support/backend-api";
import { contextFor } from "../support/learning";
import { DEMO_PASSWORD, freshStudentSession, runTag } from "../support/panel";

const NEW_PASSWORD = "Nueva-Clave-2026x";
const SIGN_IN_ATTEMPTS = 3;

/** Milliseconds to wait after a 429 of the sign-in limit (5 per minute), from its Retry-After header. */
function retryDelayMs(response: APIResponse | { headers: () => Record<string, string> }): number {
  const seconds = Number(response.headers()["retry-after"] ?? 60);

  return ((Number.isFinite(seconds) ? seconds : 60) * 1000) + 1000;
}

/** POST /api/auth/login, waiting out the sign-in limit; returns the final status. */
async function apiLoginStatus(request: APIRequestContext, credentials: Credentials): Promise<number> {
  for (let attempt = 1; ; attempt += 1) {
    const response = await request.post(`${API_URL}/api/auth/login`, { data: credentials });

    if (response.status() !== 429 || attempt === SIGN_IN_ATTEMPTS) {
      return response.status();
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, retryDelayMs(response)));
  }
}

/** Signs in through the real login form; a 429 of the sign-in limit is waited out and the form submitted again. */
async function formSignIn(page: Page, credentials: Credentials): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    await page.goto("/auth/login");
    await page.getByRole("textbox", { name: "Correo electrónico" }).fill(credentials.email);
    await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(credentials.password);
    const login = page.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith("/api/auth/login"));

    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    const response = await login;

    if (response.status() === 429 && attempt < SIGN_IN_ATTEMPTS) {
      await page.waitForTimeout(retryDelayMs(response));
      continue;
    }

    expect(response.status()).toBe(200);
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });

    return;
  }
}

test("(5) profile: change password → the previous refresh token fails → sign in with the new one", async ({ browser, request, baseURL }) => {
  test.setTimeout(300_000);
  const origin = baseURL ?? "http://localhost:3000";
  const student = await freshStudentSession(request, `E2E B4 clave ${runTag()}`);
  const context = await contextFor(browser, origin, student);
  const page = await context.newPage();

  try {
    await page.goto("/profile?tab=password");
    await expect(page.getByRole("tab", { name: "Cambiar contraseña" })).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
    await page.getByLabel(/^Contraseña actual/).fill(DEMO_PASSWORD);
    await page.getByLabel(/^Nueva contraseña/).fill(NEW_PASSWORD);
    await page.getByLabel(/^Confirmar nueva contraseña/).fill(NEW_PASSWORD);
    const changed = page.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith("/api/auth/change-password"));

    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    expect((await changed).ok()).toBe(true);
    await expect(page.getByRole("status").filter({ hasText: "Contraseña actualizada correctamente" })).toBeVisible({ timeout: 30_000 });

    // The refresh token issued before the change is revoked.
    const stale = await request.post(`${API_URL}/api/auth/refresh`, { data: { refreshToken: student.refreshToken } });

    expect(stale.status()).toBe(401);

    // The current browser session got a re-issued pair and stays alive.
    const savedRefresh = await page.evaluate(() => window.localStorage.getItem("ventilab_refresh_token"));

    expect(savedRefresh).not.toBe(student.refreshToken);
    const fresh = await request.post(`${API_URL}/api/auth/refresh`, { data: { refreshToken: savedRefresh } });

    expect(fresh.status()).toBe(200);
    await page.reload();
    await expect(page.getByRole("tab", { name: "Cambiar contraseña" })).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/profile/);
  } finally {
    await context.close();
  }

  // The old password no longer signs in; the new one does, through the login form.
  expect(await apiLoginStatus(request, { email: student.email, password: DEMO_PASSWORD })).toBe(401);
  const loginContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });

  try {
    await formSignIn(await loginContext.newPage(), { email: student.email, password: NEW_PASSWORD });
  } finally {
    await loginContext.close();
  }
});
