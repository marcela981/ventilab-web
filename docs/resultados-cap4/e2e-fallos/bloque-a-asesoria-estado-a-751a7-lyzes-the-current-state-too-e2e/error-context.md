# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bloque-a\asesoria-estado-actual.spec.ts >> ¿Cómo estabilizar? of the low SpO2 alarm analyzes the current state too
- Location: e2e\bloque-a\asesoria-estado-actual.spec.ts:110:5

# Error details

```
SyntaxError: Unexpected non-whitespace character after JSON at position 269 (line 3 column 1)
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - link "Saltar al contenido principal" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - generic [ref=e7]:
      - generic [ref=e8]:
        - link [ref=e9] [cursor=pointer]:
          - /url: /simulador
          - img "VentyLab" [ref=e10]
        - button "Contraer menú" [expanded] [ref=e11] [cursor=pointer]
      - navigation "Navegación principal" [ref=e14]:
        - list [ref=e15]:
          - link "Simulador Virtual" [ref=e16] [cursor=pointer]:
            - /url: /simulador
          - link "Módulo de Enseñanza" [ref=e22] [cursor=pointer]:
            - /url: /learn
          - link "Evaluación" [ref=e28] [cursor=pointer]:
            - /url: /evaluations
      - group "Herramientas" [ref=e34]:
        - button "Abrir asistente IA" [ref=e35] [cursor=pointer]
        - button "Notificaciones, 1 sin leer" [ref=e38] [cursor=pointer]:
          - generic [ref=e39]: "1"
      - group "Apariencia" [ref=e43]:
        - group "Modo" [ref=e45]:
          - button "Claro" [ref=e46] [cursor=pointer]
          - button "Oscuro" [pressed] [ref=e50] [cursor=pointer]
        - group "Paleta" [ref=e54]:
          - button "VentyLab" [pressed] [ref=e55] [cursor=pointer]
          - button "Univalle" [ref=e57] [cursor=pointer]
      - generic [ref=e59]:
        - link "Camila Rojas Estudiante" [ref=e60] [cursor=pointer]:
          - /url: /profile
          - generic [aria-hidden] [ref=e61]: CR
          - generic [ref=e62]:
            - generic [ref=e63]: Camila Rojas
            - generic [ref=e64]: Estudiante
        - button "Opciones" [ref=e65] [cursor=pointer]
      - paragraph [ref=e68]: VentyLab v0.1.0
    - main [ref=e70]:
      - generic [ref=e71]:
        - heading "Simulador" [level=1] [ref=e72]
        - tabpanel "Monitoreo" [ref=e74]:
          - region [ref=e75]:
            - heading "Monitoreo" [level=2] [ref=e76]
            - region "Consola del ventilador" [ref=e80]:
              - generic [ref=e83]:
                - group "Control del tiempo" [ref=e84]:
                  - paragraph [ref=e85]:
                    - generic [ref=e86]: Tiempo simulado
                    - status [ref=e87]: 1:07
                    - generic [ref=e88]: En pausa
                  - group "Velocidad" [ref=e89]:
                    - button "×1" [ref=e90] [cursor=pointer]
                    - button "×2" [ref=e91] [cursor=pointer]
                    - button "×4" [pressed] [ref=e92] [cursor=pointer]
                  - button "Reanudar" [ref=e93] [cursor=pointer]
                - generic [ref=e97]:
                  - button "Mostrar caso clínico" [ref=e98] [cursor=pointer]
                  - button "Finalizar sesión" [ref=e102] [cursor=pointer]
              - generic [ref=e103]:
                - region "Valores" [ref=e104]:
                  - generic [ref=e105]:
                    - img "VentyLab" [ref=e106]
                    - img "Univalle" [ref=e107]
                  - generic [ref=e108]:
                    - paragraph [aria-hidden] [ref=e109]: Modo del monitor
                    - group "Modo del monitor" [ref=e110]:
                      - button "Digital" [pressed] [ref=e111] [cursor=pointer]
                      - button "Real" [ref=e112] [cursor=pointer]
                  - status "Paciente activo" [ref=e113]:
                    - generic [ref=e116]: "Paciente: SDRA grave inestable"
                  - status "Estado del paciente" [ref=e117]: Crítico · gravedad 64 %
                  - generic [ref=e118]:
                    - button "Ajustar" [ref=e120] [cursor=pointer]
                    - list "Valores del monitor" [ref=e123]:
                      - listitem [ref=e124]:
                        - generic [ref=e126]:
                          - term [ref=e127]: Ppico
                          - definition [ref=e128]:
                            - generic [ref=e129]: "29"
                            - generic [ref=e130]: cmH2O
                      - listitem [ref=e131]:
                        - generic [ref=e133]:
                          - term [ref=e134]: Pmedia
                          - definition [ref=e135]:
                            - generic [ref=e136]: "9.4"
                            - generic [ref=e137]: cmH2O
                      - listitem [ref=e138]:
                        - generic [ref=e140]:
                          - term [ref=e141]: PEEP total
                          - definition [ref=e142]:
                            - generic [ref=e143]: "5.0"
                            - generic [ref=e144]: cmH2O
                      - listitem [ref=e145]:
                        - generic [ref=e147]:
                          - term [ref=e148]: Flujo máx
                          - definition [ref=e149]:
                            - generic [ref=e150]: "32"
                            - generic [ref=e151]: L/min
                      - listitem [ref=e152]:
                        - generic [ref=e154]:
                          - term [ref=e155]: Flujo mín
                          - definition [ref=e156]:
                            - generic [ref=e157]: "-83"
                            - generic [ref=e158]: L/min
                      - listitem [ref=e159]:
                        - generic [ref=e161]:
                          - term [ref=e162]: Vte
                          - definition [ref=e163]:
                            - generic [ref=e164]: "421"
                            - generic [ref=e165]: mL
                      - listitem [ref=e166]:
                        - generic [ref=e168]:
                          - term [ref=e169]: Pplat
                          - definition [ref=e170]:
                            - generic [ref=e171]: "22"
                            - generic [ref=e172]: cmH2O
                      - listitem [ref=e173]:
                        - generic [ref=e175]:
                          - term [ref=e176]: ΔP
                          - definition [ref=e177]:
                            - generic [ref=e178]: "17"
                            - generic [ref=e179]: cmH2O
                          - definition [ref=e180]: Alto
                      - listitem [ref=e183]:
                        - generic [ref=e185]:
                          - term [ref=e186]: Auto-PEEP
                          - definition [ref=e187]:
                            - generic [ref=e188]: "0.0"
                            - generic [ref=e189]: cmH2O
                      - listitem [ref=e190]:
                        - generic [ref=e192]:
                          - term [ref=e193]: Vt/kg PBW
                          - definition [ref=e194]:
                            - generic [ref=e195]: "6.0"
                            - generic [ref=e196]: mL/kg
                      - listitem [ref=e197]:
                        - generic [ref=e199]:
                          - term [ref=e200]: VE
                          - definition [ref=e201]:
                            - generic [ref=e202]: "9.3"
                            - generic [ref=e203]: L/min
                      - listitem [ref=e204]:
                        - generic [ref=e206]:
                          - term [ref=e207]: FR total
                          - definition [ref=e208]:
                            - generic [ref=e209]: "22"
                            - generic [ref=e210]: rpm
                      - listitem [ref=e211]:
                        - generic [ref=e213]:
                          - term [ref=e214]: I:E
                          - definition [ref=e215]:
                            - generic [ref=e216]: 1:2.4
                      - listitem [ref=e217]:
                        - generic [ref=e219]:
                          - term [ref=e220]: FiO2
                          - definition [ref=e221]:
                            - generic [ref=e222]: "90"
                            - generic [ref=e223]: "%"
                      - listitem [ref=e224]:
                        - generic [ref=e226]:
                          - term [ref=e227]: Potencia
                          - definition [ref=e228]:
                            - generic [ref=e229]: "18.1"
                            - generic [ref=e230]: J/min
                          - definition [ref=e231]: Alto
                      - listitem [ref=e234]:
                        - generic [ref=e236]:
                          - term [ref=e237]: SpO2
                          - definition [ref=e238]:
                            - generic [ref=e239]: "74"
                            - generic [ref=e240]: "%"
                          - definition [ref=e241]: Bajo
                          - definition [ref=e244]:
                            - img "Tendencia de SpO2" [ref=e245]
                      - listitem [ref=e247]:
                        - generic [ref=e249]:
                          - term [ref=e250]: PaO2
                          - definition [ref=e251]:
                            - generic [ref=e252]: "40"
                            - generic [ref=e253]: mmHg
                          - definition [ref=e254]: Bajo
                          - definition [ref=e257]:
                            - img "Tendencia de PaO2" [ref=e258]
                      - listitem [ref=e260]:
                        - generic [ref=e262]:
                          - term [ref=e263]: PaCO2
                          - definition [ref=e264]:
                            - generic [ref=e265]: "34"
                            - generic [ref=e266]: mmHg
                          - definition [ref=e267]: Bajo
                          - definition [ref=e270]:
                            - img "Tendencia de PaCO2" [ref=e271]
                      - listitem [ref=e273]:
                        - generic [ref=e275]:
                          - term [ref=e276]: pH
                          - definition [ref=e277]:
                            - generic [ref=e278]: "7.48"
                          - definition [ref=e279]: Alto
                          - definition [ref=e282]:
                            - img "Tendencia de pH" [ref=e283]
                      - listitem [ref=e285]:
                        - generic [ref=e287]:
                          - term [ref=e288]: PAM
                          - definition [ref=e289]:
                            - generic [ref=e290]: "68"
                            - generic [ref=e291]: mmHg
                          - definition [ref=e292]:
                            - img "Tendencia de PAM" [ref=e293]
                      - listitem [ref=e295]:
                        - generic [ref=e297]:
                          - term [ref=e298]: FC
                          - definition [ref=e299]:
                            - generic [ref=e300]: "114"
                            - generic [ref=e301]: lpm
                          - definition [ref=e302]: Alto
                          - definition [ref=e305]:
                            - img "Tendencia de FC" [ref=e306]
                - generic [ref=e308]:
                  - group "Parámetros principales" [ref=e309]:
                    - generic [ref=e310]:
                      - spinbutton "Fracción inspirada de oxígeno" [ref=e311]:
                        - generic [ref=e312]: FiO₂
                        - generic [ref=e313]: "90"
                        - generic [ref=e314]: "%"
                      - generic [ref=e315]:
                        - button "Disminuir FiO2" [ref=e316] [cursor=pointer]
                        - button "Aumentar FiO2" [ref=e319] [cursor=pointer]
                      - paragraph [ref=e322]:
                        - generic [ref=e323]: 21–100 %
                    - generic [ref=e324]:
                      - spinbutton "Volumen corriente" [ref=e325]:
                        - generic [ref=e326]: Volumen (VCV)
                        - generic [ref=e327]: "420"
                        - generic [ref=e328]: mL
                      - generic [ref=e329]:
                        - button "Disminuir Vt" [ref=e330] [cursor=pointer]
                        - button "Aumentar Vt" [ref=e333] [cursor=pointer]
                      - paragraph [ref=e336]:
                        - generic [ref=e337]: 200–800 mL
                    - generic [ref=e338]:
                      - spinbutton "Presión positiva al final de la espiración" [ref=e339]:
                        - generic [ref=e340]: PEEP
                        - generic [ref=e341]: "5"
                        - generic [ref=e342]: cmH2O
                      - generic [ref=e343]:
                        - button "Disminuir PEEP" [ref=e344] [cursor=pointer]
                        - button "Aumentar PEEP" [ref=e347] [cursor=pointer]
                      - paragraph [ref=e350]:
                        - generic [ref=e351]: 0–20 cmH2O
                  - region "Alarmas" [ref=e352]:
                    - generic [ref=e353]:
                      - list [ref=e355]:
                        - listitem [ref=e356]:
                          - button "¿Cómo estabilizar? SpO₂ baja" [ref=e357] [cursor=pointer]:
                            - generic [ref=e360]: Prioridad alta
                            - generic [ref=e361]: "SpO₂ baja: 74.4 (límite 90)"
                      - generic [ref=e362]:
                        - button "Silenciar 2 min" [ref=e363] [cursor=pointer]
                        - button "Sonido desactivado" [ref=e367] [cursor=pointer]
                        - button "Historial de alarmas (1)" [ref=e371] [cursor=pointer]
                  - complementary [active] [ref=e375]:
                    - generic [ref=e376]:
                      - heading "¿Cómo estabilizar?" [level=2] [ref=e377]
                      - button "Cerrar ¿Cómo estabilizar?" [ref=e378] [cursor=pointer]
                    - generic [ref=e383]:
                      - paragraph [ref=e384]:
                        - generic [ref=e385]: Alarma
                        - generic [ref=e386]: "SpO₂ baja: 74.4 (límite 90)"
                      - region [ref=e387]:
                        - heading "Qué revisar primero" [level=3] [ref=e388]
                        - list "Qué revisar primero" [ref=e389]:
                          - listitem [ref=e390]:
                            - generic [ref=e391]: Confirma la señal del oxímetro y revisa al paciente con DOPES antes de cambiar el ventilador.
                            - generic [ref=e392]: "Fuente: Hess y Kacmarek (2019)"
                          - listitem [ref=e393]:
                            - generic [ref=e394]: Ajusta la combinación PEEP/FiO2 según la tabla de ARDSNet; con shunt alto la FiO2 sola mejora poco y la PEEP recluta, vigilando la meseta y la PAM.
                            - generic [ref=e395]: "Fuente: ARDS Network (2000); Benatar et al. (1973)"
                          - listitem [ref=e396]:
                            - generic [ref=e397]: "Ante un deterioro agudo, revisa en orden: desplazamiento del tubo, obstrucción, neumotórax, falla del equipo y apilamiento de respiraciones (auto-PEEP)."
                            - generic [ref=e398]: "Fuente: American Heart Association (2020); Hess y Kacmarek (2019)"
                      - region [ref=e399]:
                        - heading "Sugerencia de la IA" [level=3] [ref=e400]
                        - paragraph [ref=e401]: Analizado en t = 01:07 · gravedad 64 %
                        - generic [ref=e402]:
                          - paragraph [ref=e404]: "ECO DEL ESTADO RECIBIDO: t = 01:07 · SpO2 74.4 % · PaO2 40 mmHg · PaCO2 33.7 mmHg · pH 7.48 · PAM 68 mmHg · FC 114 lpm · gravedad 64 % · alarmas LOW_SPO2 {\"source\":\"SIMULATION\",\"simTime\":\"01:07\",\"simTimeS\":67.1,\"status\":\"CRITICAL\",\"severityPercent\":64,\"spo2Percent\":74.4,\"pao2MmHg\":40,\"paco2MmHg\":33.7,\"ph\":7.48,\"mapMmHg\":68,\"heartRateBpm\":114,\"peakPressureCmH2O\":28.5,\"dataAgeS\":null,\"stale\":false,\"alarms\":[\"LOW_SPO2\"]}"
                          - generic [ref=e405]: "ECO DEL ESTADO RECIBIDO: t = 01:07 · SpO2 74.4 % · PaO2 40 mmHg · PaCO2 33.7 mmHg · pH 7.48 · PAM 68 mmHg · FC 114 lpm · gravedad 64 % · alarmas LOW_SPO2 {\"source\":\"SIMULATION\",\"simTime\":\"01:07\",\"simTimeS\":67.1,\"status\":\"CRITICAL\",\"severityPercent\":64,\"spo2Percent\":74.4,\"pao2MmHg\":40,\"paco2MmHg\":33.7,\"ph\":7.48,\"mapMmHg\":68,\"heartRateBpm\":114,\"peakPressureCmH2O\":28.5,\"dataAgeS\":null,\"stale\":false,\"alarms\":[\"LOW_SPO2\"]}"
                          - region [ref=e407]:
                            - generic [ref=e408]:
                              - heading "¿Te fue útil?" [level=3] [ref=e409]
                              - group "¿Te fue útil?" [ref=e410]:
                                - button "Sí, fue útil" [ref=e411] [cursor=pointer]
                                - button "No fue útil" [ref=e414] [cursor=pointer]
                        - paragraph [ref=e417]: "La IA solo sugiere: revisa cada cambio antes de aplicarlo en la consola."
                  - region "Curvas" [ref=e418]:
                    - generic [ref=e419]:
                      - status "Estado de la señal" [ref=e420]: Simulando
                      - group "Zoom de las curvas" [ref=e422]:
                        - button "Acercar" [ref=e423] [cursor=pointer]
                        - button "Alejar" [ref=e427] [cursor=pointer]
                        - button "Restablecer zoom" [disabled] [ref=e430]
                      - generic [ref=e433]: Ventana 10 s
                      - group "Bucles" [ref=e434]:
                        - button "Sin bucle" [pressed] [ref=e435] [cursor=pointer]
                        - button "P-V" [ref=e436] [cursor=pointer]
                        - button "F-V" [ref=e437] [cursor=pointer]
                      - button "Congelar" [ref=e438] [cursor=pointer]
                      - button "Opciones de trazado" [ref=e443] [cursor=pointer]
                    - img "Curvas de presión, flujo y volumen" [ref=e449]
                - complementary "Controles" [ref=e450]:
                  - paragraph [ref=e451]:
                    - generic [ref=e452]: Modo
                    - strong [ref=e453]: VCV — Volumen control
                  - generic [ref=e454]:
                    - generic [ref=e455]:
                      - group "Modo ventilatorio" [ref=e456]:
                        - button "Volumen control" [pressed] [ref=e457] [cursor=pointer]:
                          - text: VOL
                          - generic [ref=e458]: CTRL
                        - button "Presión control" [ref=e459] [cursor=pointer]:
                          - text: PRES
                          - generic [ref=e460]: CTRL
                      - generic "Asesoría IA" [ref=e461]:
                        - button "Asesoría IA" [ref=e462] [cursor=pointer]
                    - button [ref=e466] [cursor=pointer]:
                      - text: Más modos
                      - generic [ref=e467]: (PSV, CPAP, SIMV)
                  - generic [ref=e470]:
                    - generic [ref=e471]:
                      - paragraph [aria-hidden] [ref=e472]:
                        - generic [ref=e473]: Insp
                        - generic [ref=e474]: Esp
                      - slider "Relación inspiración/espiración" [ref=e475] [cursor=pointer]: "29"
                    - status "Relación I:E" [ref=e476]:
                      - generic [ref=e478]: "1 : 2,4"
                    - generic [ref=e479]:
                      - spinbutton "Tiempo inspiratorio" [ref=e480]:
                        - generic [ref=e482]: "0.8"
                        - generic [ref=e483]: s
                      - generic [ref=e484]:
                        - button "Disminuir Ti" [ref=e485] [cursor=pointer]
                        - button "Aumentar Ti" [ref=e488] [cursor=pointer]
                      - paragraph [ref=e491]:
                        - generic [ref=e492]: 0.5–3 s
                        - status "Tiempo espiratorio" [ref=e493]: Te 1,93 s
                    - generic [ref=e494]:
                      - spinbutton "Pausa inspiratoria" [ref=e495]:
                        - generic [ref=e497]: "0.0"
                        - generic [ref=e498]: s
                      - generic [ref=e499]:
                        - button "Disminuir Pausa insp." [disabled] [ref=e500]
                        - button "Aumentar Pausa insp." [ref=e503] [cursor=pointer]
                      - paragraph [ref=e506]:
                        - generic [ref=e507]: 0–2 s
                    - generic [ref=e508]:
                      - spinbutton "Pausa espiratoria" [disabled] [ref=e509]
                      - paragraph [ref=e510]: No disponible en este simulador
                  - generic [ref=e511]:
                    - generic [ref=e512]:
                      - spinbutton "Frecuencia respiratoria" [ref=e513]:
                        - generic [ref=e515]: "22"
                        - generic [ref=e516]: rpm
                      - generic [ref=e517]:
                        - button "Disminuir FR" [ref=e518] [cursor=pointer]
                        - button "Aumentar FR" [ref=e521] [cursor=pointer]
                      - paragraph [ref=e524]:
                        - generic [ref=e525]: 5–40 rpm
                    - slider "Frecuencia respiratoria" [ref=e526] [cursor=pointer]: "22"
                  - button "Más parámetros" [ref=e528] [cursor=pointer]
                  - region [ref=e532]:
                    - heading "Estado de la mecánica" [level=3] [ref=e533]
                    - generic [ref=e534]:
                      - term [ref=e535]: Cst
                      - definition [ref=e536]:
                        - text: 24 mL/cmH2O
                        - generic [ref=e537]: derivada
                      - term [ref=e538]: Cdin
                      - definition [ref=e539]:
                        - text: 18 mL/cmH2O
                        - generic [ref=e540]: derivada
                  - paragraph [ref=e541]: Alertas (2)
                  - button "Ver alertas detalladas" [ref=e542] [cursor=pointer]
        - navigation "Secciones del simulador" [ref=e545]:
          - tablist "Secciones del simulador" [ref=e546]:
            - tab "Simular Paciente" [ref=e547] [cursor=pointer]
            - tab "Monitoreo" [selected] [ref=e551] [cursor=pointer]
            - tab "Conexión" [ref=e556] [cursor=pointer]
            - tab "Mis sesiones" [ref=e560] [cursor=pointer]
  - alert [ref=e564]
```

# Test source

```ts
  1   | /*
  2   | * Funcionalidad: E2E — the AI help analyzes the current state of the patient (fix sim-assist-current-state)
  3   | * Descripción: In the unstable ARDS case at ×4, touching nothing until the patient status chip says "Crítico" (the
  4   | *   deterioration produces no event, so the server used to replay only up to t = 0 and the AI saw the stable initial
  5   | *   patient), the simulation is paused and the AI help is asked with the fake LLM in `echo` mode, which answers with the
  6   | *   values of the state block it received: (1) "Asesoría IA" and (2) "¿Cómo estabilizar?" of the low SpO2 alarm send
  7   | *   the console simulated time and snapshot, and the echoed SpO2 and severity match the screen (±2 %), the patient is
  8   | *   CRITICAL with the LOW_SPO2 alarm and the answer header says "Analizado en t = mm:ss · gravedad X %"; (3) with the
  9   | *   fake LLM in `claims-stable` mode (it claims a stable patient with SpO2 89 %) the answer is regenerated and then
  10  | *   replaced by the deterministic suggestion with "La IA no pudo analizar el estado actual"; (4) from 1440 px the open
  11  | *   drawer pushes the console (its curves end before the drawer). The fake LLM mode is set through its admin route and
  12  | *   restored after each test. Needs the fake LLM (scripts/e2e/fake-llm.mjs, E2E_FAKE_LLM_URL, default
  13  | *   http://127.0.0.1:4910). Depends on @playwright/test and the e2e support helpers.
  14  | * Versión: 1.0
  15  | * Autor: Marcela Mazo Castro
  16  | * Proyecto: VentyLab
  17  | * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
  18  | * Institución: Universidad del Valle
  19  | * Contacto: marcela.mazo@correounivalle.edu.co
  20  | */
  21  | 
  22  | import { expect, type APIRequestContext, type Locator, type Page, test } from "@playwright/test";
  23  | import { boxOf } from "../support/layout-order";
  24  | import { cardValue, patientCondition, startCaseSession, UNSTABLE_CASE_ID } from "../support/bloque-a";
  25  | import { CURVES_LABEL, finishWorkspaceSession, SIMULATOR_VIEWPORT } from "../support/simulator";
  26  | 
  27  | test.use({ viewport: SIMULATOR_VIEWPORT });
  28  | 
  29  | const FAKE_LLM_URL = process.env.E2E_FAKE_LLM_URL ?? "http://127.0.0.1:4910";
  30  | // First line of an echo answer (scripts/e2e/fake-llm-core.mjs ECHO_MARKER); the JSON of the received values follows.
  31  | const ECHO_MARKER = "ECO DEL ESTADO RECIBIDO";
  32  | 
  33  | type Echo = { simTime: string | null, status: string | null, severityPercent: number | null, spo2Percent: number | null, alarms: string[] };
  34  | 
  35  | async function setFakeLlmMode(request: APIRequestContext, mode: string): Promise<void> {
  36  |   const response = await request.put(`${FAKE_LLM_URL}/__fake-llm/mode`, { data: { mode } });
  37  | 
  38  |   expect(response.ok()).toBe(true);
  39  | }
  40  | 
  41  | /** Waits for the "Crítico" status chip (no adjustment at all), then pauses so the screen stops changing. */
  42  | async function criticalAndPaused(page: Page): Promise<{ spo2: number, severity: number }> {
  43  |   await expect(patientCondition(page)).toHaveAttribute("data-status", "CRITICAL", { timeout: 90_000 });
  44  |   await page.getByRole("button", { name: "Pausar" }).click();
  45  |   await expect(page.getByText("En pausa")).toBeVisible();
  46  | 
  47  |   const spo2 = await cardValue(page, "SpO2");
  48  |   const severity = Number(/gravedad (\d+) %/u.exec(await patientCondition(page).innerText())?.[1]);
  49  | 
  50  |   expect(spo2).not.toBeNull();
  51  | 
  52  |   return { spo2: spo2 ?? 0, severity };
  53  | }
  54  | 
  55  | async function echoIn(container: Locator): Promise<Echo> {
  56  |   await expect(container).toContainText(ECHO_MARKER, { timeout: 60_000 });
  57  | 
  58  |   const text = await container.innerText();
  59  |   const json = text.slice(text.indexOf("{", text.indexOf(ECHO_MARKER)), text.lastIndexOf("}") + 1);
  60  | 
> 61  |   return JSON.parse(json) as Echo;
      |               ^ SyntaxError: Unexpected non-whitespace character after JSON at position 269 (line 3 column 1)
  62  | }
  63  | 
  64  | function expectMatchesScreen(echo: Echo, screen: { spo2: number, severity: number }): void {
  65  |   expect(echo.status).toBe("CRITICAL");
  66  |   expect(echo.alarms).toContain("LOW_SPO2");
  67  |   // The screen rounds the SpO2 to whole percent; ±2 % of the shown value.
  68  |   expect(Math.abs((echo.spo2Percent ?? 0) - screen.spo2)).toBeLessThanOrEqual(screen.spo2 * 0.02 + 0.5);
  69  |   expect(Math.abs((echo.severityPercent ?? 0) - screen.severity)).toBeLessThanOrEqual(2);
  70  |   // The initial patient (stable, SpO2 ~ 89-90 %) is not what the AI analyzed.
  71  |   expect(echo.spo2Percent ?? 100).toBeLessThan(85);
  72  | }
  73  | 
  74  | test.afterEach(async ({ request }) => {
  75  |   await setFakeLlmMode(request, "ok");
  76  | });
  77  | 
  78  | test("Asesoría IA analyzes the critical patient on screen, not the initial one", async ({ page, request }) => {
  79  |   test.setTimeout(240_000);
  80  |   await setFakeLlmMode(request, "echo");
  81  |   const { sessionId } = await startCaseSession(page, request, UNSTABLE_CASE_ID, 4);
  82  |   const screen = await criticalAndPaused(page);
  83  |   const assistRequest = page.waitForRequest((sent) => sent.method() === "POST" && sent.url().endsWith(`/api/simulation/sessions/${sessionId}/assist`));
  84  | 
  85  |   await page.getByRole("complementary", { name: "Controles" }).getByRole("button", { name: "Asesoría IA", exact: true }).click();
  86  |   const drawer = page.getByRole("complementary", { name: "Asesoría IA" });
  87  | 
  88  |   await drawer.getByRole("button", { name: "Solicitar asesoría" }).click();
  89  | 
  90  |   const body = (await assistRequest).postDataJSON() as { simTimeMs: number, clientSnapshot: { status: string } };
  91  | 
  92  |   expect(body.simTimeMs).toBeGreaterThan(30_000);
  93  |   expect(body.clientSnapshot.status).toBe("CRITICAL");
  94  | 
  95  |   const echo = await echoIn(drawer);
  96  | 
  97  |   expectMatchesScreen(echo, screen);
  98  |   await expect(drawer.getByText(new RegExp(`^Analizado en t = ${echo.simTime ?? ""} · gravedad \\d+ %$`, "u"))).toBeVisible();
  99  | 
  100 |   // From 1440 px the open drawer pushes the console: the curves end before the drawer starts.
  101 |   const curves = await boxOf(page.getByRole("img", { name: CURVES_LABEL }), "curves");
  102 |   const panel = await boxOf(drawer, "AI drawer");
  103 | 
  104 |   expect(curves.x + curves.width).toBeLessThanOrEqual(panel.x + 1);
  105 | 
  106 |   await page.keyboard.press("Escape");
  107 |   await finishWorkspaceSession(page);
  108 | });
  109 | 
  110 | test("¿Cómo estabilizar? of the low SpO2 alarm analyzes the current state too", async ({ page, request }) => {
  111 |   test.setTimeout(240_000);
  112 |   await setFakeLlmMode(request, "echo");
  113 |   const { sessionId } = await startCaseSession(page, request, UNSTABLE_CASE_ID, 4);
  114 |   const screen = await criticalAndPaused(page);
  115 |   const helpRequest = page.waitForRequest((sent) => sent.method() === "POST" && sent.url().endsWith(`/api/simulation/sessions/${sessionId}/alarm-help`));
  116 | 
  117 |   await page.getByRole("region", { name: "Alarmas" }).getByRole("button", { name: "¿Cómo estabilizar? SpO₂ baja" }).click();
  118 |   const drawer = page.getByRole("complementary", { name: "¿Cómo estabilizar?" });
  119 | 
  120 |   expect((await helpRequest).postDataJSON()).toMatchObject({ alarmCode: "LOW_SPO2", language: "es", simTimeMs: expect.any(Number) });
  121 |   expectMatchesScreen(await echoIn(drawer), screen);
  122 |   await expect(drawer.getByText(/^Analizado en t = \d{2}:\d{2} · gravedad \d+ %$/u)).toBeVisible();
  123 | 
  124 |   await page.keyboard.press("Escape");
  125 |   await finishWorkspaceSession(page);
  126 | });
  127 | 
  128 | test("an AI answer that claims stability with a critical patient is replaced by the deterministic suggestion", async ({ page, request }) => {
  129 |   test.setTimeout(240_000);
  130 |   await setFakeLlmMode(request, "claims-stable");
  131 |   await startCaseSession(page, request, UNSTABLE_CASE_ID, 4);
  132 |   await criticalAndPaused(page);
  133 | 
  134 |   await page.getByRole("complementary", { name: "Controles" }).getByRole("button", { name: "Asesoría IA", exact: true }).click();
  135 |   const drawer = page.getByRole("complementary", { name: "Asesoría IA" });
  136 | 
  137 |   await drawer.getByRole("button", { name: "Solicitar asesoría" }).click();
  138 |   await expect(drawer.getByText("La IA no pudo analizar el estado actual")).toBeVisible({ timeout: 60_000 });
  139 |   await expect(drawer).not.toContainText("El paciente está estable");
  140 |   await expect(drawer.getByText("¿Te fue útil?")).toHaveCount(0);
  141 | 
  142 |   await page.keyboard.press("Escape");
  143 |   await finishWorkspaceSession(page);
  144 | });
  145 | 
```