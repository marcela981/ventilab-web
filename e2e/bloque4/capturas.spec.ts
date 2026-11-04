/*
* Funcionalidad: Screenshots of Block 4 (documentation)
* Descripción: Only with E2E_CAPTURES=1: writes PNG screenshots to docs/bloque4/capturas/ (E2E_CAPTURES_DIR overrides) of the staff panel, administration and profile screens on the local seeded data (demo seed + load seed of 500 students): the panel dashboard (General and Por grupo with the 500-student group, one page of rows), the students directory, the "Conformar Grupo" dialog with three selected students, the five tabs of a load student's detail, the staff lab with "Próximas reservas" (an immediate reservation of the demo group, cancelled afterwards), the admin users ("Gestión de roles" and "Profesores"), /admin/ai with the surface filter, the profile tabs and the Google-account notice of the password tab (the only stubbed state: GET /api/users/me answers hasPassword=false in the browser, there is no Google account locally). It asserts only what it needs to frame each capture. Depends on @playwright/test and the auth, backend API and panel e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { STUDENT_STORAGE_STATE, TEACHER_STORAGE_STATE } from "../support/auth";
import { backendApiAs, savedUserOf } from "../support/backend-api";
import { contextFor } from "../support/learning";
import { ADMIN_EMAIL, freeVentilator, staffSession, userIdByEmail } from "../support/panel";

const OUT_DIR = process.env.E2E_CAPTURES_DIR ?? "docs/bloque4/capturas";
const DESKTOP = { width: 1440, height: 1000 };
const LOAD_STUDENT_EMAIL = "load-student-001@ventylab.load";

test.skip(process.env.E2E_CAPTURES !== "1", "screenshots only with E2E_CAPTURES=1");
test.use({ viewport: DESKTOP, storageState: TEACHER_STORAGE_STATE });

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: false, animations: "disabled" });
}

type Group = { id: string, name: string, type: string, simulatorLeaderId: string | null, memberCount?: number };

test("Block 4 key screens", async ({ browser, page, request, baseURL }) => {
  test.setTimeout(300_000);
  const teacher = await backendApiAs(request, TEACHER_STORAGE_STATE);
  const admin = await staffSession(request, ADMIN_EMAIL);
  const loadStudentId = await userIdByEmail(admin.api, LOAD_STUDENT_EMAIL);
  const groups = await teacher.call<Group[]>("GET", "/api/groups");
  const loadGroup = groups.find((group) => group.name.startsWith("Load test group"));
  const leader = savedUserOf(STUDENT_STORAGE_STATE);
  const demoGroup = groups.find((group) => group.type === "STUDENT" && group.simulatorLeaderId === leader.id);

  // Panel dashboard.
  await page.goto("/teacher");
  await expect(page.getByRole("region", { name: "Estudiantes recientes" }).getByRole("link").first()).toBeVisible({ timeout: 30_000 });
  await shot(page, "01-panel-dashboard-general");
  await page.goto(loadGroup ? `/teacher?groupId=${loadGroup.id}` : "/teacher?tab=grupo");
  await expect(page.getByRole("table", { name: "Estudiantes" })).toBeVisible({ timeout: 45_000 });
  await page.getByRole("region", { name: "Estudiantes" }).scrollIntoViewIfNeeded();
  await shot(page, "02-panel-dashboard-por-grupo");

  // Directory and "Conformar Grupo".
  await page.goto("/teacher/students");
  const directory = page.getByRole("table", { name: "Directorio de estudiantes" });

  await expect(directory.locator("tbody > tr").first()).toBeVisible({ timeout: 30_000 });
  await shot(page, "03-directorio");
  for (const checkbox of (await directory.getByRole("checkbox").all()).slice(1, 4)) {
    await checkbox.check();
  }
  await page.getByRole("button", { name: /^Conformar Grupo \(3\)$/ }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Nombre del grupo" }).fill("Grupo de práctica — Turno mañana");
  await shot(page, "04-conformar-grupo");
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();

  // Student detail tabs.
  const tabs = [["modulos", "Módulos"], ["evaluaciones", "Evaluaciones"], ["simulador", "Simulador"], ["actividad", "Actividad"], ["gamificacion", "Gamificación"]] as const;

  await page.goto(`/teacher/students/${loadStudentId}${loadGroup ? `?groupId=${loadGroup.id}` : ""}`);
  await expect(page.getByRole("tablist", { name: "Secciones del estudiante" })).toBeVisible({ timeout: 30_000 });
  for (const [key, label] of tabs) {
    await page.getByRole("tab", { name: label, exact: true }).click();
    await expect(page.getByRole("tabpanel", { name: label })).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    await shot(page, `05-detalle-${key}`);
  }

  // Staff lab with "Próximas reservas".
  await freeVentilator(admin.api);
  const reservation = demoGroup
    ? await teacher.call<{ id: string }>("POST", "/api/reservations", { holderType: "GROUP", groupId: demoGroup.id, durationMinutes: 30, purpose: "Práctica de ventilación protectora" })
    : null;

  try {
    await page.goto("/teacher/lab");
    await expect(page.getByRole("region", { name: "Próximas reservas" })).toBeVisible({ timeout: 30_000 });
    await shot(page, "06-laboratorio-proximas-reservas");
  } finally {
    if (reservation) {
      await teacher.call("POST", `/api/reservations/${reservation.id}/cancel`).catch(() => undefined);
    }
  }

  // Profile (teacher): both tabs, then the Google-account notice (stubbed hasPassword=false).
  await page.goto("/profile");
  await expect(page.getByRole("tab", { name: "Información personal" })).toBeVisible({ timeout: 30_000 });
  await shot(page, "10-perfil-informacion");
  await page.goto("/profile?tab=password");
  await expect(page.getByRole("button", { name: "Cambiar contraseña" })).toBeVisible({ timeout: 30_000 });
  await shot(page, "11-perfil-contrasena");
  await page.route("**/api/users/me", async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as { data: Record<string, unknown> };

    await route.fulfill({ response, json: { ...body, data: { ...body.data, hasPassword: false } } });
  });
  await page.goto("/profile?tab=password");
  await expect(page.getByText("Tu cuenta usa Google; la contraseña se gestiona en Google.")).toBeVisible({ timeout: 30_000 });
  await shot(page, "12-perfil-cuenta-google");
  await page.unroute("**/api/users/me");

  // Administration (admin).
  const adminContext = await contextFor(browser, baseURL ?? "http://localhost:3000", admin, { viewport: DESKTOP });
  const adminPage = await adminContext.newPage();

  try {
    await adminPage.goto("/admin/users");
    await expect(adminPage.getByRole("table", { name: "Usuarios de la plataforma" }).locator("tbody > tr").first()).toBeVisible({ timeout: 30_000 });
    await shot(adminPage, "07-admin-usuarios");
    await adminPage.getByRole("tab", { name: "Profesores" }).click();
    await expect(adminPage.getByRole("table", { name: /^Profesores y administradores/ }).locator("tbody > tr").first()).toBeVisible({ timeout: 30_000 });
    await shot(adminPage, "08-admin-profesores");
    await adminPage.goto("/admin/ai?surface=NOTES_ANALYSIS");
    await expect(adminPage.getByRole("combobox", { name: "Superficie" })).toBeVisible({ timeout: 30_000 });
    await adminPage.getByRole("heading", { name: "Calificaciones de los usuarios" }).scrollIntoViewIfNeeded().catch(() => undefined);
    await adminPage.getByRole("combobox", { name: "Superficie" }).scrollIntoViewIfNeeded();
    await shot(adminPage, "09-admin-ia-filtros");
  } finally {
    await adminContext.close();
  }
});
