# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bloque5\monitoreo-julio.spec.ts >> July Monitoreo control order at 1280×720
- Location: e2e\bloque5\monitoreo-julio.spec.ts:88:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
    "height": 684.46875,
    "width": 952,
    "x": 284,
-   "y": 44,
+   "y": -77,
  }
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - link "Saltar al contenido principal" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - generic [ref=e7]:
      - generic [ref=e8]:
        - link "VentyLab" [ref=e9] [cursor=pointer]:
          - /url: /simulador
        - button "Contraer menú" [expanded] [ref=e10] [cursor=pointer]
      - navigation "Navegación principal" [ref=e13]:
        - list [ref=e14]:
          - link "Simulador Virtual" [ref=e15] [cursor=pointer]:
            - /url: /simulador
          - link "Módulo de Enseñanza" [ref=e21] [cursor=pointer]:
            - /url: /learn
          - link "Evaluación" [ref=e27] [cursor=pointer]:
            - /url: /evaluations
      - group "Herramientas" [ref=e33]:
        - button "Abrir asistente IA" [ref=e34] [cursor=pointer]
        - button "Notificaciones, 2 sin leer" [ref=e37] [cursor=pointer]:
          - generic [ref=e38]: "2"
      - generic [ref=e42]:
        - link "Camila Rojas Estudiante" [ref=e43] [cursor=pointer]:
          - /url: /profile
          - generic [aria-hidden] [ref=e44]: CR
          - generic [ref=e45]:
            - generic [ref=e46]: Camila Rojas
            - generic [ref=e47]: Estudiante
        - button "Opciones" [ref=e48] [cursor=pointer]
      - paragraph [ref=e51]: VentyLab v0.1.0
    - main [ref=e53]:
      - generic [ref=e54]:
        - heading "Simulador" [level=1] [ref=e55]
        - tabpanel "Monitoreo" [ref=e57]:
          - region [ref=e58]:
            - heading "Monitoreo" [level=2] [ref=e59]
            - region "Consola del ventilador" [ref=e63]:
              - generic [ref=e65]:
                - generic [ref=e66]:
                  - group "Control del tiempo" [ref=e67]:
                    - paragraph [ref=e68]:
                      - generic [ref=e69]: Tiempo simulado
                      - status [ref=e70]: 0:02
                    - group "Velocidad" [ref=e71]:
                      - button "×1" [pressed] [ref=e72] [cursor=pointer]
                      - button "×2" [disabled] [ref=e73]
                      - button "×4" [disabled] [ref=e74]
                    - button "Pausar" [ref=e75] [cursor=pointer]
                    - generic [ref=e79]: La velocidad máxima se eligió al iniciar la práctica en el catálogo; aquí solo puedes bajarla.
                  - generic [ref=e80]:
                    - button "Mostrar caso clínico" [ref=e81] [cursor=pointer]
                    - button "Finalizar sesión" [ref=e85] [cursor=pointer]
                - status [ref=e86]: Esta sesión se creó con el motor 2.0.0 y este navegador ejecuta el motor 1.0.0. La práctica continúa, pero las curvas pueden diferir del resultado del servidor.
              - generic [ref=e87]:
                - region "Valores" [ref=e88]:
                  - generic [ref=e89]:
                    - img "VentyLab" [ref=e90]
                    - img "Univalle" [ref=e91]
                  - generic [ref=e92]:
                    - paragraph [aria-hidden] [ref=e93]: Modo del monitor
                    - group "Modo del monitor" [ref=e94]:
                      - button "Digital" [pressed] [ref=e95] [cursor=pointer]
                      - button "Real" [ref=e96] [cursor=pointer]
                  - status "Paciente activo" [ref=e97]:
                    - generic [ref=e100]: "Paciente: Ana Lucía"
                  - generic [ref=e101]:
                    - generic [ref=e102]:
                      - button "Confirmar" [disabled] [ref=e103]
                      - button "Cancelar" [disabled] [ref=e106]
                    - status [ref=e109]: Sin cambios pendientes
                  - generic [ref=e110]:
                    - button "Ajustar" [ref=e112] [cursor=pointer]
                    - list "Valores del monitor" [ref=e115]:
                      - listitem [ref=e116]:
                        - generic [ref=e118]:
                          - term [ref=e119]: Ppico
                          - definition [ref=e120]:
                            - generic [ref=e121]: —
                            - generic [ref=e122]: cmH2O
                      - listitem [ref=e123]:
                        - generic [ref=e125]:
                          - term [ref=e126]: Pmedia
                          - definition [ref=e127]:
                            - generic [ref=e128]: —
                            - generic [ref=e129]: cmH2O
                      - listitem [ref=e130]:
                        - generic [ref=e132]:
                          - term [ref=e133]: PEEP total
                          - definition [ref=e134]:
                            - generic [ref=e135]: —
                            - generic [ref=e136]: cmH2O
                      - listitem [ref=e137]:
                        - generic [ref=e139]:
                          - term [ref=e140]: Flujo máx
                          - definition [ref=e141]:
                            - generic [ref=e142]: —
                            - generic [ref=e143]: L/min
                      - listitem [ref=e144]:
                        - generic [ref=e146]:
                          - term [ref=e147]: Flujo mín
                          - definition [ref=e148]:
                            - generic [ref=e149]: —
                            - generic [ref=e150]: L/min
                      - listitem [ref=e151]:
                        - generic [ref=e153]:
                          - term [ref=e154]: Vte
                          - definition [ref=e155]:
                            - generic [ref=e156]: —
                            - generic [ref=e157]: mL
                      - listitem [ref=e158]:
                        - generic [ref=e160]:
                          - term [ref=e161]: Pplat
                          - definition [ref=e162]:
                            - generic [ref=e163]: —
                            - generic [ref=e164]: cmH2O
                      - listitem [ref=e165]:
                        - generic [ref=e167]:
                          - term [ref=e168]: ΔP
                          - definition [ref=e169]:
                            - generic [ref=e170]: —
                            - generic [ref=e171]: cmH2O
                      - listitem [ref=e172]:
                        - generic [ref=e174]:
                          - term [ref=e175]: Auto-PEEP
                          - definition [ref=e176]:
                            - generic [ref=e177]: —
                            - generic [ref=e178]: cmH2O
                      - listitem [ref=e179]:
                        - generic [ref=e181]:
                          - term [ref=e182]: Vt/kg PBW
                          - definition [ref=e183]:
                            - generic [ref=e184]: —
                            - generic [ref=e185]: mL/kg
                      - listitem [ref=e186]:
                        - generic [ref=e188]:
                          - term [ref=e189]: VE
                          - definition [ref=e190]:
                            - generic [ref=e191]: "0.0"
                            - generic [ref=e192]: L/min
                          - definition [ref=e193]: Bajo
                      - listitem [ref=e196]:
                        - generic [ref=e198]:
                          - term [ref=e199]: FR total
                          - definition [ref=e200]:
                            - generic [ref=e201]: "0"
                            - generic [ref=e202]: rpm
                          - definition [ref=e203]: Bajo
                      - listitem [ref=e206]:
                        - generic [ref=e208]:
                          - term [ref=e209]: I:E
                          - definition [ref=e210]:
                            - generic [ref=e211]: —
                      - listitem [ref=e212]:
                        - generic [ref=e214]:
                          - term [ref=e215]: FiO2
                          - definition [ref=e216]:
                            - generic [ref=e217]: "35"
                            - generic [ref=e218]: "%"
                      - listitem [ref=e219]:
                        - generic [ref=e221]:
                          - term [ref=e222]: Potencia
                          - definition [ref=e223]:
                            - generic [ref=e224]: —
                            - generic [ref=e225]: J/min
                      - listitem [ref=e226]:
                        - generic [ref=e228]:
                          - term [ref=e229]: SpO2
                          - definition [ref=e230]:
                            - generic [ref=e231]: "89"
                            - generic [ref=e232]: "%"
                          - definition [ref=e233]:
                            - img "Tendencia de SpO2" [ref=e234]
                      - listitem [ref=e236]:
                        - generic [ref=e238]:
                          - term [ref=e239]: PaO2
                          - definition [ref=e240]:
                            - generic [ref=e241]: "57"
                            - generic [ref=e242]: mmHg
                          - definition [ref=e243]: Bajo
                          - definition [ref=e246]:
                            - img "Tendencia de PaO2" [ref=e247]
                      - listitem [ref=e249]:
                        - generic [ref=e251]:
                          - term [ref=e252]: PaCO2
                          - definition [ref=e253]:
                            - generic [ref=e254]: "75"
                            - generic [ref=e255]: mmHg
                          - definition [ref=e256]: Alto
                          - definition [ref=e259]:
                            - img "Tendencia de PaCO2" [ref=e260]
                      - listitem [ref=e261]:
                        - generic [ref=e263]:
                          - term [ref=e264]: pH
                          - definition [ref=e265]:
                            - generic [ref=e266]: "7.25"
                          - definition [ref=e267]: Bajo
                          - definition [ref=e270]:
                            - img "Tendencia de pH" [ref=e271]
                      - listitem [ref=e272]:
                        - generic [ref=e274]:
                          - term [ref=e275]: PAM
                          - definition [ref=e276]:
                            - generic [ref=e277]: "106"
                            - generic [ref=e278]: mmHg
                          - definition [ref=e279]:
                            - img "Tendencia de PAM" [ref=e280]
                - generic [ref=e281]:
                  - group "Parámetros principales" [ref=e282]:
                    - generic [ref=e283]:
                      - spinbutton "Fracción inspirada de oxígeno" [ref=e284]:
                        - generic [ref=e285]: FiO₂
                        - generic [ref=e286]: "35"
                        - generic [ref=e287]: "%"
                      - generic [ref=e288]:
                        - button "Disminuir FiO2" [ref=e289] [cursor=pointer]
                        - button "Aumentar FiO2" [ref=e292] [cursor=pointer]
                      - paragraph [ref=e295]:
                        - generic [ref=e296]: 21–100 %
                    - generic [ref=e297]:
                      - spinbutton "Volumen corriente" [ref=e298]:
                        - generic [ref=e299]: Volumen (VCV)
                        - generic [ref=e300]: "480"
                        - generic [ref=e301]: mL
                      - generic [ref=e302]:
                        - button "Disminuir Vt" [ref=e303] [cursor=pointer]
                        - button "Aumentar Vt" [ref=e306] [cursor=pointer]
                      - paragraph [ref=e309]:
                        - generic [ref=e310]: 200–800 mL
                    - generic [ref=e311]:
                      - spinbutton "Presión positiva al final de la espiración" [ref=e312]:
                        - generic [ref=e313]: PEEP
                        - generic [ref=e314]: "5"
                        - generic [ref=e315]: cmH2O
                      - generic [ref=e316]:
                        - button "Disminuir PEEP" [ref=e317] [cursor=pointer]
                        - button "Aumentar PEEP" [ref=e320] [cursor=pointer]
                      - paragraph [ref=e323]:
                        - generic [ref=e324]: 0–20 cmH2O
                  - region "Alarmas" [ref=e325]:
                    - generic [ref=e326]:
                      - paragraph [ref=e328]: Sin alarmas activas
                      - generic [ref=e329]:
                        - button "Silenciar 2 min" [ref=e330] [cursor=pointer]
                        - button "Sonido desactivado" [ref=e334] [cursor=pointer]
                        - button "Historial de alarmas (0)" [expanded] [ref=e338] [cursor=pointer]
                  - complementary [active] [ref=e342]:
                    - generic [ref=e343]:
                      - heading "Alertas detalladas" [level=2] [ref=e344]
                      - button "Ocultar alertas" [ref=e345] [cursor=pointer]
                    - generic [ref=e348]:
                      - region [ref=e349]:
                        - heading "Alertas de validación" [level=3] [ref=e350]
                        - list [ref=e351]:
                          - listitem [ref=e352]:
                            - generic [ref=e355]: "Volumen minuto: 0.0 L/min (Bajo; referencia 5–10 L/min)"
                          - listitem [ref=e356]:
                            - generic [ref=e359]: "Frecuencia respiratoria total: 0 rpm (Bajo; referencia 10–30 rpm)"
                      - region [ref=e360]:
                        - heading "Historial de alarmas (0)" [level=3] [ref=e361]
                        - paragraph [ref=e362]: Sin eventos de alarma en esta sesión.
                  - region "Curvas" [ref=e363]:
                    - generic [ref=e364]:
                      - status "Estado de la señal" [ref=e365]: Simulando
                      - group "Zoom de las curvas" [ref=e367]:
                        - button "Acercar" [ref=e368] [cursor=pointer]
                        - button "Alejar" [ref=e372] [cursor=pointer]
                        - button "Restablecer zoom" [disabled] [ref=e375]
                      - generic [ref=e378]: Ventana 10 s
                      - group "Bucles" [ref=e379]:
                        - button "Sin bucle" [pressed] [ref=e380] [cursor=pointer]
                        - button "P-V" [ref=e381] [cursor=pointer]
                        - button "F-V" [ref=e382] [cursor=pointer]
                      - button "Congelar" [ref=e383] [cursor=pointer]
                      - button "Opciones de trazado" [ref=e388] [cursor=pointer]
                    - img "Curvas de presión, flujo y volumen" [ref=e394]
                - complementary "Controles" [ref=e395]:
                  - paragraph [ref=e396]:
                    - generic [ref=e397]: Modo
                    - strong [ref=e398]: VCV — Volumen control
                  - generic [ref=e399]:
                    - generic [ref=e400]:
                      - group "Modo ventilatorio" [ref=e401]:
                        - button "Volumen control" [pressed] [ref=e402] [cursor=pointer]:
                          - text: VOL
                          - generic [ref=e403]: CTRL
                        - button "Presión control" [ref=e404] [cursor=pointer]:
                          - text: PRES
                          - generic [ref=e405]: CTRL
                      - generic "Asesoría IA" [ref=e406]:
                        - button "Asesoría IA" [ref=e407] [cursor=pointer]
                    - button [ref=e411] [cursor=pointer]:
                      - text: Más modos
                      - generic [ref=e412]: (PSV, CPAP, SIMV)
                  - generic [ref=e415]:
                    - generic [ref=e416]:
                      - paragraph [aria-hidden] [ref=e417]:
                        - generic [ref=e418]: Insp
                        - generic [ref=e419]: Esp
                      - slider "Relación inspiración/espiración" [ref=e420] [cursor=pointer]: "22"
                    - status "Relación I:E" [ref=e421]:
                      - generic [ref=e423]: "1 : 3,6"
                    - generic [ref=e424]:
                      - spinbutton "Tiempo inspiratorio" [ref=e425]:
                        - generic [ref=e427]: "1.0"
                        - generic [ref=e428]: s
                      - generic [ref=e429]:
                        - button "Disminuir Ti" [ref=e430] [cursor=pointer]
                        - button "Aumentar Ti" [ref=e433] [cursor=pointer]
                      - paragraph [ref=e436]:
                        - generic [ref=e437]: 0.5–3 s
                        - status "Tiempo espiratorio" [ref=e438]: Te 3,62 s
                    - generic [ref=e439]:
                      - spinbutton "Pausa inspiratoria" [ref=e440]:
                        - generic [ref=e442]: "0.0"
                        - generic [ref=e443]: s
                      - generic [ref=e444]:
                        - button "Disminuir Pausa insp." [disabled] [ref=e445]
                        - button "Aumentar Pausa insp." [ref=e448] [cursor=pointer]
                      - paragraph [ref=e451]:
                        - generic [ref=e452]: 0–2 s
                    - generic [ref=e453]:
                      - spinbutton "Pausa espiratoria" [disabled] [ref=e454]
                      - paragraph [ref=e455]: No disponible en este simulador
                  - generic [ref=e456]:
                    - generic [ref=e457]:
                      - spinbutton "Frecuencia respiratoria" [ref=e458]:
                        - generic [ref=e460]: "13"
                        - generic [ref=e461]: rpm
                      - generic [ref=e462]:
                        - button "Disminuir FR" [ref=e463] [cursor=pointer]
                        - button "Aumentar FR" [ref=e466] [cursor=pointer]
                      - paragraph [ref=e469]:
                        - generic [ref=e470]: 5–40 rpm
                    - slider "Frecuencia respiratoria" [ref=e471] [cursor=pointer]: "13"
                  - button "Más parámetros" [ref=e473] [cursor=pointer]
                  - region [ref=e477]:
                    - heading "Estado de la mecánica" [level=3] [ref=e478]
                    - generic [ref=e479]:
                      - term [ref=e480]: Cst
                      - definition [ref=e481]:
                        - text: — mL/cmH2O
                        - generic [ref=e482]: derivada
                      - term [ref=e483]: Cdin
                      - definition [ref=e484]:
                        - text: — mL/cmH2O
                        - generic [ref=e485]: derivada
                  - paragraph [ref=e486]: Alertas (2)
                  - button "Ocultar alertas" [expanded] [ref=e487] [cursor=pointer]
                  - paragraph [ref=e490]: "Esc: cancelar · Enter: confirmar"
        - navigation "Secciones del simulador" [ref=e491]:
          - tablist "Secciones del simulador" [ref=e492]:
            - tab "Simular Paciente" [ref=e493] [cursor=pointer]
            - tab "Monitoreo" [selected] [ref=e497] [cursor=pointer]
            - tab "Conexión" [ref=e502] [cursor=pointer]
            - tab "Mis sesiones" [ref=e506] [cursor=pointer]
  - alert [ref=e510]: Simulador | VentyLab
```

# Test source

```ts
  10  | */
  11  | 
  12  | import { expect, type Page, test } from "@playwright/test";
  13  | import { boxOf, expectHorizontalOrder, expectVerticalOrder, TOLERANCE_PX } from "../support/layout-order";
  14  | import { COMPACT_VIEWPORT, CURVES_LABEL, finishWorkspaceSession, SIMULATOR_VIEWPORT, startPatientSession } from "../support/simulator";
  15  | 
  16  | async function checkOrder(page: Page): Promise<void> {
  17  |   const values = page.getByRole("region", { name: "Valores" });
  18  |   const curves = page.getByRole("region", { name: "Curvas" });
  19  |   const controls = page.getByRole("complementary", { name: "Controles" });
  20  | 
  21  |   await expectHorizontalOrder([["Valores", values], ["Curvas", curves], ["Controles", controls]]);
  22  | 
  23  |   // Left column.
  24  |   const confirm = values.getByRole("button", { name: "Confirmar" });
  25  |   const cancel = values.getByRole("button", { name: "Cancelar" });
  26  | 
  27  |   await expectVerticalOrder([
  28  |     ["logo VentyLab", values.getByRole("img", { name: "VentyLab" })],
  29  |     ["logo Univalle", values.getByRole("img", { name: "Univalle" })],
  30  |     ["Modo del monitor", values.getByRole("group", { name: "Modo del monitor" })],
  31  |     ["Paciente activo", values.getByRole("status", { name: "Paciente activo" })],
  32  |     ["Confirmar", confirm],
  33  |     ["pending status", values.getByRole("status").filter({ hasText: /cambios? pendientes?$/ })],
  34  |     ["Ajustar", values.getByRole("button", { name: "Ajustar" })],
  35  |     ["Valores del monitor", values.getByRole("list", { name: "Valores del monitor" })],
  36  |   ]);
  37  |   // Confirmar and Cancelar share one row (July's Enviar / Detener): compare x, not y.
  38  |   await expectHorizontalOrder([["Confirmar", confirm], ["Cancelar", cancel]]);
  39  |   expect(Math.abs((await boxOf(confirm, "Confirmar")).y - (await boxOf(cancel, "Cancelar")).y)).toBeLessThanOrEqual(TOLERANCE_PX);
  40  | 
  41  |   // Centre.
  42  |   const fio2 = page.getByRole("spinbutton", { name: "Fracción inspirada de oxígeno" });
  43  |   const chip = curves.getByRole("status", { name: "Estado de la señal" });
  44  |   const zoom = curves.getByRole("group", { name: "Zoom de las curvas" });
  45  | 
  46  |   await expectHorizontalOrder([
  47  |     ["FiO2", fio2],
  48  |     ["Volumen corriente", page.getByRole("spinbutton", { name: "Volumen corriente" })],
  49  |     ["PEEP", page.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" })],
  50  |   ]);
  51  |   await expectVerticalOrder([
  52  |     ["input row", fio2],
  53  |     ["Alarmas", page.getByRole("region", { name: "Alarmas" })],
  54  |     ["Estado de la señal", chip],
  55  |     ["curves", page.getByRole("img", { name: CURVES_LABEL })],
  56  |   ]);
  57  |   await expectHorizontalOrder([["Estado de la señal", chip], ["Zoom de las curvas", zoom]]);
  58  | 
  59  |   // Right column.
  60  |   const modes = controls.getByRole("group", { name: "Modo ventilatorio" });
  61  | 
  62  |   await expectHorizontalOrder([["Modo ventilatorio", modes], ["Asesoría IA", controls.getByRole("button", { name: "Asesoría IA", exact: true })]]);
  63  |   await expect(modes.getByRole("button", { name: /^Más modos/ })).toHaveCount(0);
  64  |   await expectVerticalOrder([
  65  |     ["Modo ventilatorio", modes],
  66  |     ["Más modos", controls.getByRole("button", { name: /^Más modos( \(PSV, CPAP, SIMV\)| \S+)$/ })],
  67  |     ["I:E slider", controls.getByRole("slider", { name: "Relación inspiración/espiración" })],
  68  |     ["Relación I:E", controls.getByRole("status", { name: "Relación I:E" })],
  69  |     ["Tiempo inspiratorio", controls.getByRole("spinbutton", { name: "Tiempo inspiratorio" })],
  70  |     ["Pausa inspiratoria", controls.getByRole("spinbutton", { name: "Pausa inspiratoria" })],
  71  |     ["Pausa espiratoria", controls.getByRole("spinbutton", { name: "Pausa espiratoria" })],
  72  |     ["Frecuencia respiratoria", controls.getByRole("spinbutton", { name: "Frecuencia respiratoria" })],
  73  |     ["rate slider", controls.getByRole("slider", { name: "Frecuencia respiratoria" })],
  74  |     ["Más parámetros", controls.getByRole("button", { name: "Más parámetros" })],
  75  |     ["Estado de la mecánica", controls.getByRole("region", { name: "Estado de la mecánica" })],
  76  |     ["Ver alertas detalladas", controls.getByRole("button", { name: "Ver alertas detalladas" })],
  77  |   ]);
  78  | 
  79  |   // Session strip.
  80  |   await expectHorizontalOrder([
  81  |     ["Control del tiempo", page.getByRole("group", { name: "Control del tiempo" })],
  82  |     ["Mostrar caso clínico", page.getByRole("button", { name: "Mostrar caso clínico" })],
  83  |     ["Finalizar sesión", page.getByRole("button", { name: "Finalizar sesión" })],
  84  |   ]);
  85  | }
  86  | 
  87  | for (const viewport of [SIMULATOR_VIEWPORT, COMPACT_VIEWPORT]) {
  88  |   test(`July Monitoreo control order at ${viewport.width}×${viewport.height}`, async ({ page }) => {
  89  |     test.setTimeout(180_000);
  90  |     await page.setViewportSize(viewport);
  91  |     await startPatientSession(page);
  92  |     const consoleZone = page.getByRole("region", { name: "Consola del ventilador" });
  93  | 
  94  |     await checkOrder(page);
  95  | 
  96  |     // Never a horizontal scroll; the curves keep at least 360 px.
  97  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  98  |     expect((await boxOf(page.getByRole("img", { name: CURVES_LABEL }), "curves")).height).toBeGreaterThanOrEqual(360 - TOLERANCE_PX);
  99  | 
  100 |     // The alerts drawer (380 px) overlays the console without resizing it; Escape closes it.
  101 |     const consoleBox = await boxOf(consoleZone, "console");
  102 |     const open = page.getByRole("button", { name: "Ver alertas detalladas" });
  103 | 
  104 |     await open.click();
  105 |     const drawer = page.getByRole("complementary", { name: "Alertas detalladas" });
  106 | 
  107 |     await expect(drawer).toBeVisible();
  108 |     expect(Math.abs((await boxOf(drawer, "drawer")).width - 380)).toBeLessThanOrEqual(TOLERANCE_PX);
  109 |     await expect(drawer.getByRole("region", { name: "Alertas de validación" })).toBeVisible();
> 110 |     expect(await boxOf(consoleZone, "console")).toEqual(consoleBox);
      |                                                 ^ Error: expect(received).toEqual(expected) // deep equality
  111 |     await page.keyboard.press("Escape");
  112 |     await expect(drawer).toHaveCount(0);
  113 |     await expect(open).toBeFocused();
  114 | 
  115 |     await finishWorkspaceSession(page);
  116 |   });
  117 | }
  118 | 
```