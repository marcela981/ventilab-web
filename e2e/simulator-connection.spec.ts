/*
* Funcionalidad: E2E Conexión tab and real mode of the unified simulator
* Descripción: Two scenarios against the local backend without a physical device (MQTT disabled, so "Equipo sin datos" is expected and the specs assert control and read-only states instead of curves). (1) Holder: the student uses "Reservar ahora", connects, takes control automatically ("Controlas el equipo"), sees the real monitor with "Liberar control", then disconnects and releases the reservation. (2) Group: the teacher reserves the ventilator for the demo group whose leader is the student (API setup); the leader connects and gets control; a non-leader member of the same group connects as observer ("Opera: <leader>") without ever requesting control, and the real monitor shows her the read-only console without operator actions. Each scenario cancels its reservation at the end. Depends on @playwright/test and the e2e support helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Page, test } from "@playwright/test";
import { MEMBER_STORAGE_STATE, STUDENT_STORAGE_STATE, TEACHER_STORAGE_STATE } from "./support/auth";
import { backendApiAs, savedUserOf } from "./support/backend-api";
import { SIMULATOR_VIEWPORT, workspaceTab } from "./support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });
test.describe.configure({ mode: "serial" });

type Group = { id: string, type: string, simulatorLeaderId: string | null };

function connectionCard(page: Page) {
  return page.getByRole("region", { name: "2. Conexión con el ventilador" });
}

async function connect(page: Page): Promise<void> {
  await page.goto("/simulador?tab=conexion");
  const card = connectionCard(page);

  await expect(card.getByRole("status")).toHaveText("Ventilador reservado. Ya puedes conectar.", { timeout: 30_000 });
  await card.getByRole("button", { name: "Conectar", exact: true }).click();
  await expect(card.getByRole("status")).toHaveText("Conectado al ventilador.", { timeout: 30_000 });
}

async function openRealMonitor(page: Page): Promise<void> {
  await workspaceTab(page, "Monitoreo").click();
  await page.getByRole("group", { name: "Modo del monitor" }).getByRole("button", { name: "Real" }).click();
  await expect(page.getByRole("status", { name: "Estado de la señal" })).toHaveText("Conectado (Físico)", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Ventilador físico" })).toBeVisible({ timeout: 30_000 });
  // No physical device on the local stack: the monitor reports the missing telemetry.
  await expect(page.getByRole("alert").filter({ hasText: "Equipo sin datos" })).toBeVisible({ timeout: 15_000 });
}

test("holder reserves now, connects with control and sees the real monitor", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/simulador?tab=conexion");
  const reservation = page.getByRole("region", { name: "1. Reserva del ventilador" });

  await expect(reservation).toContainText(/Reserva:\s*Disponible/, { timeout: 30_000 });
  await reservation.getByRole("button", { name: "Reservar ahora" }).click();
  const dialog = page.getByRole("dialog", { name: "Reservar ahora" });

  await expect(dialog).toContainText("Desde ahora · 30 min");
  await dialog.getByRole("button", { name: "Reservar ahora" }).click();

  try {
    await expect(reservation).toContainText(/Reserva:\s*Activa\s*·\s*\d+ min restantes/, { timeout: 30_000 });
    await connect(page);
    await expect(connectionCard(page)).toContainText(/Control:\s*Controlas el equipo/, { timeout: 15_000 });

    await openRealMonitor(page);
    await expect(page.getByRole("status").filter({ hasText: "Controlas el equipo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Liberar control" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Grabar sesión" })).toBeVisible();

    await workspaceTab(page, "Conexión").click();
    await connectionCard(page).getByRole("button", { name: "Desconectar" }).click();
    await expect(connectionCard(page).getByRole("button", { name: "Conectar", exact: true })).toBeEnabled({ timeout: 15_000 });
  } finally {
    const release = reservation.getByRole("button", { name: "Liberar" });

    if (await release.isVisible()) {
      await release.click();
    }
  }

  await expect(reservation).toContainText(/Reserva:\s*Disponible/, { timeout: 30_000 });
});

test("group leader takes control and a non-leader member observes read-only", async ({ browser, request }) => {
  test.setTimeout(150_000);
  const leader = savedUserOf(STUDENT_STORAGE_STATE);
  const teacher = await backendApiAs(request, TEACHER_STORAGE_STATE);
  const groups = await teacher.call<Group[]>("GET", "/api/groups");
  const group = groups.find((candidate) => candidate.type === "STUDENT" && candidate.simulatorLeaderId === leader.id);

  expect(group, `a student group led by ${leader.email} (demo seed)`).toBeDefined();
  const reservation = await teacher.call<{ id: string }>("POST", "/api/reservations", {
    holderType: "GROUP",
    groupId: group?.id,
    durationMinutes: 15,
    purpose: "E2E W12: grupo",
  });
  const leaderContext = await browser.newContext({ storageState: STUDENT_STORAGE_STATE, viewport: SIMULATOR_VIEWPORT });
  const memberContext = await browser.newContext({ storageState: MEMBER_STORAGE_STATE, viewport: SIMULATOR_VIEWPORT });

  try {
    const leaderPage = await leaderContext.newPage();

    await connect(leaderPage);
    await expect(connectionCard(leaderPage)).toContainText(/Control:\s*Controlas el equipo/, { timeout: 15_000 });

    const memberPage = await memberContext.newPage();
    const controlRequests: string[] = [];

    memberPage.on("request", (sent) => {
      if (sent.method() === "POST" && sent.url().includes("/api/ventilator/control")) {
        controlRequests.push(sent.url());
      }
    });

    await connect(memberPage);
    await expect(connectionCard(memberPage)).toContainText(new RegExp(`Control:\\s*Opera: ${leader.name}`), { timeout: 15_000 });

    await openRealMonitor(memberPage);
    await expect(memberPage.getByRole("status").filter({ hasText: `Opera: ${leader.name}` })).toBeVisible();
    await expect(memberPage.getByRole("region", { name: "Consola del ventilador" })).toContainText("Solo lectura");
    await expect(memberPage.getByRole("button", { name: "Liberar control" })).toHaveCount(0);
    await expect(memberPage.getByRole("button", { name: "Grabar sesión" })).toHaveCount(0);
    // A group member never asks for control (S3b / W7): the client only joins as observer.
    expect(controlRequests).toEqual([]);
  } finally {
    await leaderContext.close();
    await memberContext.close();
    await teacher.call("POST", `/api/reservations/${reservation.id}/cancel`);
  }
});
