/*
* Funcionalidad: E2E (6) profile: upload and remove the profile photo (Bloque 4)
* Descripción: A brand-new student opens /profile ("Información personal"), picks a PNG in the photo input (test id profile-avatar-input; the client crops it and PUT /api/users/me/avatar uploads it): "Foto de perfil actualizada correctamente", the avatar shows the image and "Quitar foto" appears. "Quitar foto" (DELETE /api/users/me/avatar) removes it: "Foto de perfil eliminada correctamente", the button disappears and GET /api/users/me returns no image. Needs file storage: without Supabase the local backend uses its development disk adapter (DISENO_BLOQUE4 §2.8). Depends on @playwright/test and the learning and panel e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { contextFor } from "../support/learning";
import { freshStudentSession, runTag } from "../support/panel";

// 2×2 opaque PNG (red, green, blue, white).
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP4z8DAAMIM/////w8AH+4F+7C4l8kAAAAASUVORK5CYII=", "base64");

test("(6) profile: upload and remove the profile photo", async ({ browser, request, baseURL }) => {
  test.setTimeout(120_000);
  const student = await freshStudentSession(request, `E2E B4 foto ${runTag()}`);
  const context = await contextFor(browser, baseURL ?? "http://localhost:3000", student);
  const page = await context.newPage();

  try {
    await page.goto("/profile");
    await expect(page.getByRole("tab", { name: "Información personal" })).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
    const avatar = page.getByRole("img", { name: "Foto de perfil" });

    await expect(avatar.locator("img")).toHaveCount(0);
    const uploaded = page.waitForResponse((res) => res.request().method() === "PUT" && res.url().endsWith("/api/users/me/avatar"));

    await page.getByTestId("profile-avatar-input").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
    expect((await uploaded).ok()).toBe(true);
    await expect(page.getByRole("status").filter({ hasText: "Foto de perfil actualizada correctamente" })).toBeVisible({ timeout: 30_000 });
    await expect(avatar.locator("img")).toHaveAttribute("src", /.+/);

    const removed = page.waitForResponse((res) => res.request().method() === "DELETE" && res.url().endsWith("/api/users/me/avatar"));

    await page.getByRole("button", { name: "Quitar foto" }).click();
    expect((await removed).ok()).toBe(true);
    await expect(page.getByRole("status").filter({ hasText: "Foto de perfil eliminada correctamente" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Quitar foto" })).toHaveCount(0);
    await expect(avatar.locator("img")).toHaveCount(0);
    expect((await student.api.call<{ image: string | null }>("GET", "/api/users/me")).image).toBeNull();
  } finally {
    await context.close();
  }
});
