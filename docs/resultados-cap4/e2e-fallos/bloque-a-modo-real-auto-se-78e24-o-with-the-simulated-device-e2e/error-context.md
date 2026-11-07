# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bloque-a\modo-real.spec.ts >> auto-send after the debounce, nothing beyond the safe range and undo, with the simulated device
- Location: e2e\bloque-a\modo-real.spec.ts:42:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('spinbutton', { name: 'Presión positiva al final de la espiración', exact: true })
Expected: "false"
Timeout: 60000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" getByRole('spinbutton', { name: 'Presión positiva al final de la espiración', exact: true }) with timeout 60000ms
  - waiting for getByRole('spinbutton', { name: 'Presión positiva al final de la espiración', exact: true })

```

```yaml
- link "Saltar al contenido principal":
  - /url: "#main-content"
- link "VentyLab":
  - /url: /simulador
  - img "VentyLab"
- button "Contraer menú" [expanded]
- navigation "Navegación principal":
  - list:
    - link "Simulador Virtual":
      - /url: /simulador
    - link "Módulo de Enseñanza":
      - /url: /learn
    - link "Evaluación":
      - /url: /evaluations
- group "Herramientas":
  - button "Abrir asistente IA"
  - button "Notificaciones, 1 sin leer": "1"
- group "Apariencia":
  - text: Apariencia
  - group "Modo":
    - button "Claro"
    - button "Oscuro" [pressed]
  - group "Paleta":
    - button "VentyLab" [pressed]
    - button "Univalle"
- link "Camila Rojas Estudiante":
  - /url: /profile
- button "Opciones"
- paragraph: VentyLab v0.1.0
- main:
  - heading "Simulador" [level=1]
  - tabpanel "Monitoreo":
    - region "Monitoreo":
      - heading "Monitoreo" [level=2]
      - region "Consola del ventilador":
        - heading "Ventilador físico" [level=3]
        - paragraph: Equipo
        - text: Sin datos
        - paragraph: Latencia
        - paragraph: —
        - status: Controlas el equipo
        - button "Liberar control"
        - button "Grabar sesión"
        - paragraph: La grabación se detiene sola al terminar la reserva. El indicador REC solo se ve en la pestaña que la inició y se pierde al recargar la página.
        - alert: "Equipo sin datos: sin señal del ventilador hace más de 2 segundos."
        - region "Valores":
          - img "VentyLab"
          - img "Univalle"
          - group "Modo del monitor":
            - button "Digital"
            - button "Real" [pressed]
          - status "Reserva activa": Reserva activa · Camila Rojas
          - button "Deshacer último cambio" [disabled]
          - paragraph: "Equipo sin datos: los ajustes mostrados son los últimos que informó el equipo; los controles se habilitan cuando vuelva a enviar datos."
          - button "Ajustar"
          - list "Valores del monitor":
            - listitem:
              - term: Ppico
              - definition: — cmH2O
              - definition: derivada
            - listitem:
              - term: Pmedia
              - definition: — cmH2O
              - definition: derivada
            - listitem:
              - term: PEEP
              - definition: — cmH2O
              - definition: derivada
            - listitem:
              - term: Flujo máx
              - definition: — L/min
              - definition: derivada
            - listitem:
              - term: Flujo mín
              - definition: — L/min
              - definition: derivada
            - listitem:
              - term: Vte
              - definition: — mL
              - definition: derivada
            - listitem:
              - term: Pplat
              - definition: — cmH2O
              - definition: derivada
            - listitem:
              - term: ΔP
              - definition: — cmH2O
              - definition: derivada
            - listitem:
              - term: Auto-PEEP
              - definition: — cmH2O
            - listitem:
              - term: Vt/kg PBW
              - definition: — mL/kg
            - listitem:
              - term: VE
              - definition: — L/min
              - definition: derivada
            - listitem:
              - term: FR total
              - definition: — rpm
              - definition: derivada
            - listitem:
              - term: I:E
              - definition: —
              - definition: derivada
            - listitem:
              - term: FiO2
              - definition: — %
            - listitem:
              - term: Potencia
              - definition: — J/min
        - group "Parámetros principales"
        - region "Alarmas":
          - list:
            - listitem:
              - button "¿Cómo estabilizar? Equipo sin datos": Prioridad alta Equipo sin datos
          - button "Silenciar 2 min"
          - button "Sonido desactivado"
          - button "Historial de alarmas (1)"
          - button "Límites"
        - region "Curvas":
          - status "Estado de la señal": Conectado (Físico)
          - group "Zoom de las curvas":
            - button "Acercar"
            - button "Alejar"
            - button "Restablecer zoom" [disabled]
          - text: Ventana 10 s
          - group "Bucles":
            - button "Sin bucle" [pressed]
            - button "P-V"
            - button "F-V"
          - button "Congelar"
          - button "Opciones de trazado"
          - status: Equipo sin datos
          - img "Curvas de presión, flujo y volumen"
        - region "Comandos recientes (0)":
          - heading "Comandos recientes (0)" [level=2]:
            - button "Comandos recientes (0)"
        - complementary "Controles":
          - paragraph:
            - text: Modo
            - strong: —
            - text: Solo lectura
          - group "Modo ventilatorio":
            - button "Volumen control" [disabled]: VOL CTRL
          - button "Asesoría IA" [disabled]
          - button "Más modos (SIMV)" [disabled]
          - spinbutton "Pausa espiratoria" [disabled]
          - paragraph: No disponible en este simulador
          - region "Estado de la mecánica":
            - heading "Estado de la mecánica" [level=3]
            - term: Cst
            - definition: — mL/cmH2O derivada
            - term: Cdin
            - definition: — mL/cmH2O derivada
          - paragraph: Alertas (0)
          - button "Ver alertas detalladas"
  - navigation "Secciones del simulador":
    - tablist "Secciones del simulador":
      - tab "Simular Paciente"
      - tab "Monitoreo" [selected]
      - tab "Conexión"
      - tab "Mis sesiones"
- alert: Simulador | VentyLab
```

# Test source

```ts
  1   | /*
  2   | * Funcionalidad: Bloque A E2E — real mode with the simulated device
  3   | * Descripción: The student reserves the ventilator now, connects (control taken automatically) and opens Monitoreo
  4   | *   in Real mode while the fake ventilator (scripts/e2e/fake-ventilator.mjs on the TEST broker) streams telemetry:
  5   | *   (1) three quick PEEP steps (5 → 8) go out after the debounce as ONE command (POST /api/ventilator/commands with the last
  6   | *   PEEP), the control shows "Enviando" then "Aplicado" and the device reports the value; (2) at the safe maximum the
  7   | *   PEEP cannot go further (stepper disabled, the arrow key does nothing) and nothing is sent; (3) "Deshacer último
  8   | *   cambio" sends the values the device ran before the last command and the device reports the previous PEEP again;
  9   | *   (4) an alarm help and "Asesoría IA" exist in the real console (the AI never sends commands). The reservation is
  10  | *   released at the end. Not in the CI job: it needs a TEST MQTT broker, the fake ventilator and a backend wired to
  11  | *   them (see e2e/bloque-a/README.md). Depends on @playwright/test and the e2e support helpers.
  12  | * Versión: 1.0
  13  | * Autor: Marcela Mazo Castro
  14  | * Proyecto: VentyLab
  15  | * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
  16  | * Institución: Universidad del Valle
  17  | * Contacto: marcela.mazo@correounivalle.edu.co
  18  | */
  19  | 
  20  | import { expect, type Page, test } from "@playwright/test";
  21  | import { stepTo } from "../support/bloque-a";
  22  | import { connectToVentilator, releaseReservation, reserveNow, SIMULATOR_VIEWPORT, workspaceTab } from "../support/simulator";
  23  | 
  24  | test.use({ viewport: SIMULATOR_VIEWPORT });
  25  | 
  26  | const PEEP = "Presión positiva al final de la espiración";
  27  | 
  28  | type SentCommand = { peep?: number } & Record<string, unknown>;
  29  | 
  30  | function recordCommands(page: Page): SentCommand[] {
  31  |   const sent: SentCommand[] = [];
  32  | 
  33  |   page.on("request", (request) => {
  34  |     if (request.method() === "POST" && request.url().endsWith("/api/ventilator/commands")) {
  35  |       sent.push(request.postDataJSON() as SentCommand);
  36  |     }
  37  |   });
  38  | 
  39  |   return sent;
  40  | }
  41  | 
  42  | test("auto-send after the debounce, nothing beyond the safe range and undo, with the simulated device", async ({ page }) => {
  43  |   test.setTimeout(240_000);
  44  |   const commands = recordCommands(page);
  45  | 
  46  |   await reserveNow(page);
  47  | 
  48  |   try {
  49  |     await connectToVentilator(page);
  50  |     await workspaceTab(page, "Monitoreo").click();
  51  |     await page.getByRole("group", { name: "Modo del monitor" }).getByRole("button", { name: "Real" }).click();
  52  |     await expect(page.getByRole("heading", { name: "Ventilador físico" })).toBeVisible({ timeout: 30_000 });
  53  | 
  54  |     const peep = page.getByRole("spinbutton", { name: PEEP, exact: true });
  55  |     const peepValue = async () => Number(await peep.getAttribute("aria-valuenow"));
  56  |     const peepStatus = page.locator("[data-parameter='peep'] [data-send-status]");
  57  | 
  58  |     // Live telemetry from the fake device: the console is editable with the reported PEEP (5 on a fresh device; the
  59  |     // device keeps the last applied settings, so an interrupted earlier run is brought back to 5 first).
> 60  |     await expect(peep).toHaveAttribute("aria-disabled", "false", { timeout: 60_000 });
      |                        ^ Error: expect(locator).toHaveAttribute(expected) failed
  61  |     await expect.poll(peepValue, { timeout: 30_000 }).toBeGreaterThan(0);
  62  | 
  63  |     if ((await peepValue()) !== 5) {
  64  |       await stepTo(page, PEEP, 5);
  65  |       await expect.poll(() => commands.length, { timeout: 10_000 }).toBe(1);
  66  |       await expect(peepStatus).toHaveText(/^Aplicado/, { timeout: 30_000 });
  67  |       await page.waitForTimeout(1_500);
  68  |       commands.length = 0;
  69  |     }
  70  | 
  71  |     const stepped = 8;
  72  | 
  73  |     // (1) Three quick steps → one command after the 500 ms debounce, with the last value.
  74  |     await peep.focus();
  75  |     await page.keyboard.press("ArrowUp");
  76  |     await page.keyboard.press("ArrowUp");
  77  |     await page.keyboard.press("ArrowUp");
  78  |     await expect(peepStatus).toHaveText(/Enviando|Aplicado/, { timeout: 5_000 });
  79  |     await expect.poll(() => commands.length, { timeout: 10_000 }).toBe(1);
  80  |     await expect(peepStatus).toHaveText(/^Aplicado/, { timeout: 30_000 });
  81  |     await expect.poll(peepValue, { timeout: 30_000 }).toBe(stepped);
  82  |     await page.waitForTimeout(1_500);
  83  |     expect(commands).toHaveLength(1);
  84  |     expect(JSON.stringify(commands[0])).toContain(String(stepped));
  85  | 
  86  |     // (2) Up to the safe maximum; beyond it the control does not move and nothing else is sent.
  87  |     await page.keyboard.press("End");
  88  |     await expect.poll(() => commands.length, { timeout: 10_000 }).toBe(2);
  89  |     await expect(peepStatus).toHaveText(/^Aplicado/, { timeout: 30_000 });
  90  |     const max = await peepValue();
  91  | 
  92  |     expect(max).toBe(Number(await peep.getAttribute("aria-valuemax")));
  93  |     await expect(page.getByRole("button", { name: "Aumentar PEEP" })).toBeDisabled();
  94  |     await peep.focus();
  95  |     await page.keyboard.press("ArrowUp");
  96  |     await page.waitForTimeout(1_500);
  97  |     expect(await peepValue()).toBe(max);
  98  |     expect(commands).toHaveLength(2);
  99  | 
  100 |     // (3) Undo re-sends the values before the last command: the device reports the stepped PEEP again.
  101 |     await page.getByRole("button", { name: "Deshacer último cambio" }).click();
  102 |     await expect.poll(() => commands.length, { timeout: 10_000 }).toBe(3);
  103 |     await expect.poll(peepValue, { timeout: 30_000 }).toBe(stepped);
  104 | 
  105 |     // Leave the fake device at its default PEEP for the next run.
  106 |     await stepTo(page, PEEP, 5);
  107 |     await expect.poll(() => commands.length, { timeout: 10_000 }).toBe(4);
  108 |     await expect.poll(peepValue, { timeout: 30_000 }).toBe(5);
  109 | 
  110 |     // (4) The real console offers the AI help too (read-only for the device).
  111 |     await expect(page.getByRole("complementary", { name: "Controles" }).getByRole("button", { name: "Asesoría IA", exact: true })).toBeEnabled();
  112 | 
  113 |     await workspaceTab(page, "Conexión").click();
  114 |     await page.getByRole("region", { name: "2. Conexión con el ventilador" }).getByRole("button", { name: "Desconectar" }).click();
  115 |   } finally {
  116 |     await releaseReservation(page);
  117 |   }
  118 | });
  119 | 
```