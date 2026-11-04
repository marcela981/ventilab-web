/*
* Funcionalidad: E2E (3) teacher reserves the ventilator for a group from /teacher/lab and its leader operates it (Bloque 4)
* Descripción: The reservation in progress (if any, e.g. the one of the load seed) is cancelled through the admin API so the ventilator is free. The teacher (ana.torres) opens the staff lab /teacher/lab inside the panel, switches the calendar to "Día", picks the slot in progress (first free "Reservar …" slot of today), chooses "Para un grupo" and the demo group whose simulator leader is the E2E student (estudiante01) and confirms ("Reserva creada."); the reservation shows up in "Próximas reservas". The leader then opens /simulador (Conexión), connects and gets control ("Controlas el equipo"). Against the local backend without a physical device (MQTT disabled). The reservation is cancelled at the end. Depends on @playwright/test and the auth, backend API and panel e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { STUDENT_STORAGE_STATE, TEACHER_STORAGE_STATE } from "../support/auth";
import { backendApiAs, savedUserOf } from "../support/backend-api";
import { ADMIN_EMAIL, freeVentilator, staffSession } from "../support/panel";

test.use({ storageState: TEACHER_STORAGE_STATE, viewport: { width: 1920, height: 1080 } });

type Group = { id: string, name: string, type: string, simulatorLeaderId: string | null };

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("(3) teacher reserves the ventilator for a group from /teacher/lab and the leader operates it from /simulador", async ({ browser, page, request }) => {
  test.setTimeout(150_000);
  const leader = savedUserOf(STUDENT_STORAGE_STATE);
  const teacher = await backendApiAs(request, TEACHER_STORAGE_STATE);
  const admin = await staffSession(request, ADMIN_EMAIL);
  const groups = await teacher.call<Group[]>("GET", "/api/groups");
  const group = groups.find((candidate) => candidate.type === "STUDENT" && candidate.simulatorLeaderId === leader.id);

  expect(group, `a student group led by ${leader.email} (demo seed)`).toBeDefined();
  await freeVentilator(admin.api);
  let reservationId: string | null = null;

  try {
    await page.goto("/teacher/lab");
    await expect(page.getByRole("navigation", { name: "Navegación del panel" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Día", exact: true }).click();
    const calendar = page.getByRole("table", { name: "Calendario de reservas del ventilador" });

    await calendar.getByRole("button", { name: /^Reservar / }).first().click({ timeout: 30_000 });
    const dialog = page.getByRole("dialog", { name: "Reservar el ventilador" });

    await dialog.getByRole("radio", { name: "Para un grupo" }).check();
    await dialog.getByRole("combobox", { name: "Grupo" }).click();
    await page.getByRole("option", { name: new RegExp(`${escapeRegExp(group!.name)}$`) }).click();
    const created = page.waitForResponse((res) => res.request().method() === "POST" && new URL(res.url()).pathname === "/api/reservations");

    await dialog.getByRole("button", { name: "Reservar", exact: true }).click();
    const response = await created;

    expect(response.ok()).toBe(true);
    reservationId = ((await response.json()) as { data: { id: string } }).data.id;
    await expect(page.getByText("Reserva creada.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("region", { name: "Próximas reservas" })).toContainText(group!.name, { timeout: 30_000 });

    // The group's leader operates the ventilator.
    const leaderContext = await browser.newContext({ storageState: STUDENT_STORAGE_STATE, viewport: { width: 1920, height: 1080 } });

    try {
      const leaderPage = await leaderContext.newPage();

      await leaderPage.goto("/simulador?tab=conexion");
      const card = leaderPage.getByRole("region", { name: "2. Conexión con el ventilador" });

      await expect(card.getByRole("status")).toHaveText("Ventilador reservado. Ya puedes conectar.", { timeout: 30_000 });
      await card.getByRole("button", { name: "Conectar", exact: true }).click();
      await expect(card.getByRole("status")).toHaveText("Conectado al ventilador.", { timeout: 30_000 });
      await expect(card).toContainText(/Control:\s*Controlas el equipo/, { timeout: 15_000 });
    } finally {
      await leaderContext.close();
    }
  } finally {
    if (reservationId) {
      await teacher.call("POST", `/api/reservations/${reservationId}/cancel`).catch(() => undefined);
    }
  }
});
