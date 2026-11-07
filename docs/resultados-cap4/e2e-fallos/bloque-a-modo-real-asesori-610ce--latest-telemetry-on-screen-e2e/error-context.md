# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bloque-a\modo-real-asesoria.spec.ts >> Asesoría IA of the real monitor echoes the latest telemetry on screen
- Location: e2e\bloque-a\modo-real-asesoria.spec.ts:37:5

# Error details

```
Error: expect(received).not.toBeNull()

Received: null

Call Log:
- Timeout 60000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
  - generic [ref=f2e3]:
    - link "Saltar al contenido principal" [ref=f2e4] [cursor=pointer]:
      - /url: "#main-content"
    - generic [ref=f2e7]:
      - generic [ref=f2e8]:
        - link [ref=f2e9] [cursor=pointer]:
          - /url: /simulador
          - img "VentyLab" [ref=f2e10]
        - button "Contraer menú" [expanded] [ref=f2e11] [cursor=pointer]
      - navigation "Navegación principal" [ref=f2e14]:
        - list [ref=f2e15]:
          - link "Simulador Virtual" [ref=f2e16] [cursor=pointer]:
            - /url: /simulador
          - link "Módulo de Enseñanza" [ref=f2e22] [cursor=pointer]:
            - /url: /learn
          - link "Evaluación" [ref=f2e28] [cursor=pointer]:
            - /url: /evaluations
      - group "Herramientas" [ref=f2e34]:
        - button "Abrir asistente IA" [ref=f2e35] [cursor=pointer]
        - button "Notificaciones, 1 sin leer" [ref=f2e38] [cursor=pointer]:
          - generic [ref=f2e39]: "1"
      - group "Apariencia" [ref=f2e43]:
        - group "Modo" [ref=f2e45]:
          - button "Claro" [ref=f2e46] [cursor=pointer]
          - button "Oscuro" [pressed] [ref=f2e50] [cursor=pointer]
        - group "Paleta" [ref=f2e54]:
          - button "VentyLab" [pressed] [ref=f2e55] [cursor=pointer]
          - button "Univalle" [ref=f2e57] [cursor=pointer]
      - generic [ref=f2e59]:
        - link "Camila Rojas Estudiante" [ref=f2e60] [cursor=pointer]:
          - /url: /profile
          - generic [aria-hidden] [ref=f2e61]: CR
          - generic [ref=f2e62]:
            - generic [ref=f2e63]: Camila Rojas
            - generic [ref=f2e64]: Estudiante
        - button "Opciones" [ref=f2e65] [cursor=pointer]
      - paragraph [ref=f2e68]: VentyLab v0.1.0
    - main [ref=f2e70]:
      - generic [ref=f2e71]:
        - heading "Simulador" [level=1] [ref=f2e72]
        - tabpanel "Conexión" [ref=f2e74]:
          - region [ref=f2e75]:
            - heading "Conexión" [level=2] [ref=f2e76]
            - generic [ref=f2e77]:
              - region [ref=f2e78]:
                - heading "1. Reserva del ventilador" [level=3] [ref=f2e79]
                - paragraph [ref=f2e80]: El ventilador físico es un recurso único compartido. Reserva un turno antes de conectar; recuerda liberarlo al terminar para que otros estudiantes puedan usarlo.
                - generic [ref=f2e81]:
                  - generic [ref=f2e82]: "Reserva:"
                  - generic [ref=f2e83]: Disponible
                - generic [ref=f2e84]:
                  - button "Reservar ahora" [ref=f2e85] [cursor=pointer]
                  - link "Ver calendario" [ref=f2e86] [cursor=pointer]:
                    - /url: /lab/reservations
              - region [ref=f2e87]:
                - heading "2. Conexión con el ventilador" [level=3] [ref=f2e88]
                - paragraph [ref=f2e89]: Con la reserva activa, establece el canal de datos en vivo con el ventilador de la universidad a través del servidor (broker MQTT vía WebSocket).
                - generic [ref=f2e90]:
                  - generic [ref=f2e91]: "Estado:"
                  - generic [ref=f2e92]: Sin reserva
                - generic [ref=f2e95]:
                  - generic [ref=f2e96]: "Servidor (broker):"
                  - generic [ref=f2e97]: En línea
                - status [ref=f2e98]: Necesitas una reserva activa para conectar al ventilador.
                - generic [ref=f2e99]:
                  - button "Conectar" [disabled]
        - navigation "Secciones del simulador" [ref=f2e100]:
          - tablist "Secciones del simulador" [ref=f2e101]:
            - tab "Simular Paciente" [ref=f2e102] [cursor=pointer]
            - tab "Monitoreo" [ref=f2e106] [cursor=pointer]
            - tab "Conexión" [selected] [ref=f2e111] [cursor=pointer]
            - tab "Mis sesiones" [ref=f2e115] [cursor=pointer]
  - alert [ref=f2e119]
```

# Test source

```ts
  1  | /*
  2  | * Funcionalidad: E2E — the real-mode AI help analyzes the latest telemetry (fix sim-assist-current-state)
  3  | * Descripción: With the simulated device (scripts/e2e/fake-ventilator.mjs on the TEST broker) streaming, the student
  4  | *   reserves the ventilator, connects and opens Monitoreo in Real mode; with the fake LLM in `echo` mode "Asesoría IA"
  5  | *   posts the monitor state read at the request (alarm details, time and age of the latest frame) and the echoed SpO2
  6  | *   and peak pressure match the value cards of the screen (±2 %, 1 cmH2O); the answer header says how old the device
  7  | *   data was ("Datos del equipo de hace N s"). Not in the CI job, like modo-real: it needs a TEST MQTT broker, the fake
  8  | *   ventilator and a backend wired to them (see scripts/e2e/README.md). Depends on @playwright/test and the e2e
  9  | *   support helpers.
  10 | * Versión: 1.0
  11 | * Autor: Marcela Mazo Castro
  12 | * Proyecto: VentyLab
  13 | * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
  14 | * Institución: Universidad del Valle
  15 | * Contacto: marcela.mazo@correounivalle.edu.co
  16 | */
  17 | 
  18 | import { expect, type APIRequestContext, test } from "@playwright/test";
  19 | import { cardValue } from "../support/bloque-a";
  20 | import { connectToVentilator, releaseReservation, reserveNow, SIMULATOR_VIEWPORT, workspaceTab } from "../support/simulator";
  21 | 
  22 | test.use({ viewport: SIMULATOR_VIEWPORT });
  23 | 
  24 | const FAKE_LLM_URL = process.env.E2E_FAKE_LLM_URL ?? "http://127.0.0.1:4910";
  25 | const ECHO_MARKER = "ECO DEL ESTADO RECIBIDO";
  26 | 
  27 | type RealEcho = { source: string, spo2Percent: number | null, peakPressureCmH2O: number | null, dataAgeS: number | null, stale: boolean };
  28 | 
  29 | async function setFakeLlmMode(request: APIRequestContext, mode: string): Promise<void> {
  30 |   expect((await request.put(`${FAKE_LLM_URL}/__fake-llm/mode`, { data: { mode } })).ok()).toBe(true);
  31 | }
  32 | 
  33 | test.afterEach(async ({ request }) => {
  34 |   await setFakeLlmMode(request, "ok");
  35 | });
  36 | 
  37 | test("Asesoría IA of the real monitor echoes the latest telemetry on screen", async ({ page, request }) => {
  38 |   test.setTimeout(240_000);
  39 |   await setFakeLlmMode(request, "echo");
  40 |   await reserveNow(page);
  41 | 
  42 |   try {
  43 |     await connectToVentilator(page);
  44 |     await workspaceTab(page, "Monitoreo").click();
  45 |     await page.getByRole("group", { name: "Modo del monitor" }).getByRole("button", { name: "Real" }).click();
  46 |     await expect(page.getByRole("heading", { name: "Ventilador físico" })).toBeVisible({ timeout: 30_000 });
> 47 |     await expect.poll(() => cardValue(page, "Ppico"), { timeout: 60_000 }).not.toBeNull();
     |                                                                                ^ Error: expect(received).not.toBeNull()
  48 | 
  49 |     const assistRequest = page.waitForRequest((sent) => sent.method() === "POST" && sent.url().endsWith("/api/simulation/real/assist"));
  50 | 
  51 |     await page.getByRole("complementary", { name: "Controles" }).getByRole("button", { name: "Asesoría IA", exact: true }).click();
  52 |     const drawer = page.getByRole("complementary", { name: "Asesoría IA" });
  53 | 
  54 |     await drawer.getByRole("button", { name: "Solicitar asesoría" }).click();
  55 |     const peakOnScreen = (await cardValue(page, "Ppico")) ?? 0;
  56 |     const sent = (await assistRequest).postDataJSON() as { state: { lastFrameAt?: string, dataAgeMs?: number } };
  57 | 
  58 |     expect(typeof sent.state.lastFrameAt).toBe("string");
  59 |     expect(sent.state.dataAgeMs).toBeLessThan(2_000);
  60 | 
  61 |     // The real-mode answer streams: the header shows once it is complete (done).
  62 |     await expect(drawer.getByText(/^Datos del equipo de hace \d+ s$/u)).toBeVisible({ timeout: 60_000 });
  63 |     await expect(drawer).toContainText(ECHO_MARKER);
  64 |     const text = await drawer.innerText();
  65 |     const echo = JSON.parse(text.slice(text.indexOf("{", text.indexOf(ECHO_MARKER)), text.lastIndexOf("}") + 1)) as RealEcho;
  66 | 
  67 |     expect(echo.source).toBe("REAL_VENTILATOR");
  68 |     expect(echo.stale).toBe(false);
  69 |     // The device breathes square-flow breaths: the peak of the last breath stays within 1 cmH2O between two frames.
  70 |     expect(Math.abs((echo.peakPressureCmH2O ?? 0) - peakOnScreen)).toBeLessThanOrEqual(Math.max(1, peakOnScreen * 0.02));
  71 | 
  72 |     await page.keyboard.press("Escape");
  73 |     await workspaceTab(page, "Conexión").click();
  74 |     await page.getByRole("region", { name: "2. Conexión con el ventilador" }).getByRole("button", { name: "Desconectar" }).click();
  75 |   } finally {
  76 |     await releaseReservation(page);
  77 |   }
  78 | });
  79 | 
```