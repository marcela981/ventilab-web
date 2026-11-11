<!--
Funcionalidad: Diseño de los ajustes post-revisión, Bloque A (Simulador)
Descripción: Auditoría (Fase 1) y plan de ejecución de los ajustes del simulador: aplicación automática de parámetros en digital, real y EXAM; realismo fisiológico con un modelo de evolución determinista (mejoría, deterioro, paro y "Paciente fallecido" con debriefing); IA opcional en el simulador (interpretación del caso, coaching, alarmas clicables "¿Cómo estabilizar?" en digital y real); logo del panel; E2E. v0.2 (2026-11-10, rama feat/real-mode-control): se versiona en el repositorio web y se agrega la nota de reversión de la aplicación/envío automático (A-1 a A-4) tras la tabla del §7b.
Versión: 0.2
Autor: Marcela Mazo Castro
Proyecto: VentyLab
Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
Institución: Universidad del Valle
Contacto: marcela.mazo@correounivalle.edu.co
-->

# Diseño de los ajustes post-revisión, Bloque A: Simulador

Fecha: 2026-11-04.

Estado: **Fase 2 en ejecución** (desvíos en el §10). Las decisiones del §7b se aplicaron con sus valores por defecto. Ramas `feat/ajustes-a-simulador` en `ventylab-server` (desde `main` a517dd7) y `ventilab-web` (desde `master` 102b106).

Rutas abreviadas (como en el Bloque 5):

- `srv/` = `ventylab-server/` (worktree `wt-a-server`); `ENG/` = `srv/src/features/simulation/domain/engine/`
- `web/` = `ventilab-web/` (worktree `wt-a-web`); `SVC/` = `web/src/shared/ventilator-console/application/`; `SIM/` = `web/src/features/simulator/application/`; `LAB/` = `web/src/features/ventilator-lab/application/`

Fuentes de la Fase 1: cuatro informes de subagentes (motor, consola web, IA del servidor, literatura). Las citas `archivo:línea` vienen de esos informes. Las convenciones de los Bloques 1 a 5 (§9 y §13) siguen vigentes.

---

## 1. Alcance y principio

| Cambia | No cambia |
|---|---|
| Consola de julio (digital, real y EXAM): los cambios se aplican solos; desaparecen Confirmar, Cancelar y el contador de pendientes | Consola clásica (repetición, editor y vista previa de casos, reproductor de grabaciones): conserva su confirmación (D28 del Bloque 5) |
| Motor: modelo de evolución (gravedad bidireccional), FC, estado del paciente (estable → crítico → paro → fallecido), alarmas del paciente, sobredistensión | Ecuación de movimiento, formas de onda por modo, determinismo (semilla + eventos), paso de 1 ms y actualización lenta cada 100 ms |
| IA: interpretación del caso al iniciar, coaching con tendencias, alarmas clicables, asistencia en modo real | Pasarela, registro de prompts versionados, cadena de proveedores, telemetría y respaldos deterministas existentes (se reutilizan) |
| Logo de VentyLab del panel más chico | Orden de controles del §6.3 del Bloque 5 (salvo Confirmar/Cancelar, que se quitan) |

Principio rector: **el motor es la fuente de verdad**. La IA nunca dibuja curvas ni envía comandos: propone parámetros (que se validan y se acotan antes de entrar al motor) o sugiere acciones (que el usuario aplica).

---

## 2. Auditoría

### 2.1 Motor (`ENG/`)

| Área | Estado actual | Brecha |
|---|---|---|
| Ecuación de movimiento | `Paw = V/C + R·V' − Pmus`, solución exacta (`respiratory-mechanics.ts:19,30`) | — |
| VCV | Flujo cuadrado o desacelerado, pico y meseta emergentes, pausa (`ventilation-modes.ts:106,155-176`) | — |
| PCV | Escalón ideal a PEEP + Pinsp, flujo desacelerado exponencial | Sin tiempo de subida (rise time). Backlog |
| PSV/CPAP | Disparo por flujo o presión, ciclado por % del flujo pico (`ventilation-modes.ts:144-153,222-248`), respaldo de apnea | — |
| Auto-PEEP | Emergente (`cycle-metrics.ts:100`) y probado | — |
| Asincronías | No se modelan ni se detectan | Backlog (esfuerzos inefectivos, doble disparo, hambre de flujo). Se documenta |
| Bucles P-V y F-V | Derivables de las muestras (presión, flujo, volumen) | — |
| Intercambio gaseoso | PaCO₂ = 0,863·VCO₂/VA, pH por Henderson-Hasselbalch, PAO₂, shunt por curva de PEEP, PaO₂ por mezcla, SpO₂ por Severinghaus, retardos de primer orden (`gas-exchange.ts`; `simulation.ts:429-457`) | Reclutamiento instantáneo; sin sobredistensión (más PEEP nunca empeora); espacio muerto fijo; sin componente metabólico |
| Corazón-pulmón | PAM = PAM₀ − k·max(0, Pmedia − umbral) (`hemodynamics.ts:17`) | Sin FC; sin efecto de hipoxemia, acidosis ni gravedad sobre la PAM |
| Evolución | `deteriorationLevel` sube mientras haya un objetivo pedagógico sin cumplir; nunca baja (`simulation.ts:465-471`) | Depende de objetivos y no de la fisiología; sin mejoría; sin paro ni muerte |
| Alarmas | Presión alta, Vt bajo/alto, FR alta, apnea, auto-PEEP, desconexión (`alarms.ts`) | Sin alarmas del paciente (SpO₂, PAM, FC, paro) |
| Versión | `ENGINE_VERSION = "1.0.0"`; la repetición solo avisa si difiere | Un cambio de fisiología alteraría la repetición y la nota de sesiones viejas |

### 2.2 Consola web

- Ediciones pendientes en un store por consola (`SVC/console-pending-store.ts:33`) con el reducer `SVC/console-controls.reducer.ts` (`clampToLimit` :56, `buildConfirmation` :135). La disposición de julio usa `JulyConfirmActions` (`SVC/july-confirm.tsx:199-244`), Enter/Esc (`:135`) y el contador; el slider llama `onChange` en cada evento (`SVC/july-controls.tsx:316`).
- Digital: `confirm` (`SIM/hooks/use-sim-session.ts:566-605`) valida y envía `applyEvent PARAM_CHANGE` al worker; la cola de eventos sube cada ~3 s.
- Real: `onConfirm` (`LAB/hooks/use-ventilator-commands.ts:321-377`) mapea, envía `POST /api/ventilator/commands` y sigue el estado (`command-state.ts:665-692`). Mientras hay un comando ocupado la consola entera queda en solo lectura (`LAB/components/live-console.tsx:67-84`). Los límites del cliente vienen de `buildCommandLimits` (`LAB/entities/command-mapper.ts:177-204`) y el servidor vuelve a validar (`ventilator-command-validator.ts`, `ventilator-command-safety-limits.ts:21`, PEEP máx. 15).
- Alarmas: los ítems de `SVC/alarms-bar.tsx:150-154` no son interactivos.
- Asesoría IA: SSE a `POST /api/simulation/sessions/{id}/assist`; valoración `SIM_ASSIST`/`SIMULATOR_ASSIST`; no muestra la etiqueta de respaldo.
- Logo VentyLab: alto `var(--vl-space-8)` = 64 px (`SVC/../UI/july-layout.module.css:100-105`), 148×40 bajo 1100 px.
- Paciente: SpO₂, PaO₂, PaCO₂, pH, PAM (`frame-binding.ts:117-129`); no hay FC.

### 2.3 IA del servidor

- Registro de prompts versionados (`ai/domain/prompts/prompt-registry.ts`), pasarela con cuotas y respaldo determinista (`ai-orchestrator.ts:556-584`, `source: LLM | DETERMINISTIC`), telemetría en `ai_call_logs`, circuito por proveedor.
- No hay validación de esquema JSON genérica: cada consumidor parsea a mano (precedente: `notes-analysis-response.parser.ts`).
- `SIM_ASSIST` ya existe (SSE, contexto por repetición del servidor, asesor determinista `domain/assist/deterministic-assist-advisor.ts`, política EXAM `isAssistanceAllowed`).
- Enums Prisma para casos de uso, superficies y tipos de objetivo de valoración: agregar valores exige una migración `ALTER TYPE … ADD VALUE`.

---

## 3. A1: aplicación automática

### 3.1 Digital y EXAM

- La consola de julio recibe `applyMode="auto"` (nuevo, por defecto en julio). La clásica sigue con `"confirm"`.
- Se conserva el store de pendientes como **búfer de rebote**: cada edición entra al store y un programador la confirma sola:
  - entradas discretas (botones +/−, flechas, valor escrito, toggle de modo, menú "Más modos"): **0 ms** (en el mismo tick);
  - slider y rueda: **300 ms** después del último cambio (`AUTO_APPLY_DEBOUNCE_MS.continuous`).
- Confirmar llama el mismo `adapter.onConfirm` de hoy, así que el evento sigue siendo `PARAM_CHANGE` con el tiempo simulado efectivo que asigna el worker: repetición y nota siguen deterministas.
- Un cambio inválido (validación cruzada del motor) no entra: el control vuelve al valor aplicado y se muestra el aviso existente.
- Teclado: Enter aplica de inmediato lo que esté en rebote; Esc descarta lo que esté en rebote (no hay nada más que cancelar).
- Se quitan Confirmar, Cancelar, el contador "n cambios pendientes", la pista "Esc: cancelar · Enter: confirmar" y la alerta de validación "cambios pendientes sin confirmar".
- EXAM aplica igual que digital.

### 3.2 Real

Misma consola con un programador propio (`LAB/entities/auto-send.ts`, puro y probado):

1. **Rebote de 500 ms** después del último cambio de cualquier parámetro.
2. **Validación de rango seguro** antes de enviar con los límites que ya usa el cliente (`buildCommandLimits`: límites del motor acotados por `commands.safety.*` del laboratorio). Un valor fuera de rango **nunca** se envía: queda "Rechazado: fuera del rango seguro" y el control vuelve al último valor aplicado. Los límites del equipo físico (protocolo del fabricante) no están en el repositorio: se usan los actuales del servidor, conservadores, y se marcan para validar (§7b A-7).
3. **Un comando en vuelo a la vez**: mientras hay uno en vuelo, los cambios nuevos se acumulan (coalescencia: gana el último valor de cada parámetro) y salen en un solo comando cuando el anterior termina.
4. **Estado visible por parámetro**: "Enviando", "Aplicado", "Rechazado" (con el motivo del servidor), junto al control (`data-send-status`), anunciado con `aria-live`.
5. **Deshacer último cambio**: botón en la columna izquierda que reenvía los valores aplicados antes del último comando (pasa por el mismo pipeline y validación).
- La consola deja de pasar a solo lectura con un comando en vuelo (los cambios se encolan); sigue en solo lectura sin control del operador, sin equipo o con cuenta regresiva de 429.
- Se quita el `ConfirmDialog` de resumen ("Enviar al ventilador").

### 3.3 Orden de controles (actualiza el §6.3 del Bloque 5)

Izquierda (y): `img "VentyLab"` < `img "Univalle"` < `group "Modo del monitor"` (no en EXAM) < `status "Paciente activo"` (Real: "Reserva activa") < `button "Deshacer último cambio"` < `button "Ajustar"` < `list "Valores del monitor"`. El resto del §6.3 no cambia.

---

## 4. A2: realismo fisiológico y evolución

### 4.1 Versión y compatibilidad

- El motor pasa a `ENGINE_VERSION = "2.0.0"`. El comportamiento nuevo vive en un bloque opcional del caso, `evolution`; sin ese bloque el motor hace exactamente lo de la v1 (la prueba de determinismo de la v1 se conserva).
- El mapeador de casos (`SimulationCaseMapper.toDefinition`) agrega `evolution` solo si la sesión es de la versión 2: las sesiones guardadas con `engineVersion = "1.0.0"` se repiten sin evolución y su nota no cambia. Las nuevas usan el bloque del caso o uno derivado de su `deterioration` (§4.4).

### 4.2 Modelo de evolución (actualización lenta, cada 100 ms)

Reloj del paciente: igual que el deterioro actual, el tiempo transcurrido se multiplica por el multiplicador de la sesión (`slowDynamicsMultiplier`). Todos los tiempos de caso están en minutos del paciente.

1. **Agresiones** (cada una con fuente, §4.5): hipoxemia (SpO₂ < mínimo del objetivo o 88 %), acidosis (pH < 7,20), lesión inducida por el ventilador (Pmeseta > 30 o ΔP > 15 cmH₂O), atrapamiento (auto-PEEP > máximo del caso o 5), hipotensión (PAM < 65 mmHg).
2. **Gravedad** `s ∈ [0, 1]` (reemplaza a `deteriorationLevel` con evolución):
   - con alguna agresión: `ds/dt = progressionRatePerMin` (+ `viliRatePerMin` si hay lesión por ventilador);
   - sin agresiones: `ds/dt = −recoveryRatePerMin` (mejoría progresiva, nunca por debajo de `minSeverity`).
3. **Efectos de la gravedad**: la distensibilidad baja y el shunt sube (los campos actuales `maxComplianceLossFraction` y `maxShuntIncrease`); la PAM baja con la gravedad, la acidosis grave y la hipoxemia grave.
4. **Sobredistensión**: con Pmeseta > 30 cmH₂O, el shunt y el espacio muerto suben de forma proporcional (así subir la PEEP mejora la PaO₂ hasta un punto y después la empeora y baja la PAM).
5. **Frecuencia cardíaca**: FC = FC₀ + taquicardia por hipoxemia, hipercapnia y caída de la PAM (barorreflejo); bradicardia en fase crítica; 0 en paro. FC₀ sale de los signos vitales del caso (si no hay, 80 lpm).
6. **Estado del paciente** (`patient.status`): `STABLE` (sin agresiones) → `UNSTABLE` (con agresiones) → `CRITICAL` (SpO₂ < 75 %, pH < 7,00 o PAM < 50) → `ARREST` cuando la exposición crítica acumulada supera `arrestAfterCriticalMin` → `DECEASED` después de `deathAfterArrestMin`. La exposición crítica baja cuando la causa se corrige (rescate posible antes del paro). El paro es irreversible (no hay RCP en el simulador).
7. **Fallecido**: el motor congela la fisiología, ignora cambios posteriores (sin error) y lo informa en las métricas. El cliente cierra la sesión sola y abre el debriefing.
8. **Garantía**: con los ajustes iniciales de un caso **estable** (sin agresiones al inicio) el paciente nunca llega a `CRITICAL` por esperar. Una prueba recorre todos los casos sembrados durante 60 min del paciente.

### 4.3 Alarmas nuevas (solo con evolución)

`LOW_SPO2` (< 90 %), `LOW_MAP` (< 65 mmHg), `TACHYCARDIA` (> 120 lpm), `BRADYCARDIA` (< 50 lpm), `CARDIAC_ARREST`. Umbrales por caso (opcionales) con estos valores por defecto.

### 4.4 Parámetros por caso

Bloque `evolution` del caso (Json `mechanics.evolution`, sin migración): `initialSeverity`, `minSeverity`, `progressionRatePerMin`, `viliRatePerMin`, `recoveryRatePerMin`, `arrestAfterCriticalMin`, `deathAfterArrestMin`, `baselineHeartRateBpm`, umbrales opcionales. Rangos válidos en `clinical-case-physiological-ranges.ts` (editor y validación).

- Casos sin bloque: se deriva `progressionRatePerMin = deterioration.ratePerMin`, `recoveryRatePerMin = ratePerMin / 2` y tiempos de paro por defecto (10 y 2 min).
- Caso nuevo `engine-ards-unstable` ("SDRA grave inestable"): arranca con PEEP baja y FiO₂ alta (hipoxemia refractaria), progresión que lleva al paro en ~15 min del paciente sin intervención; mejora con PEEP más alta dentro de la tabla de ARDSNet y Vt protector. Lo inserta el bootstrap de casos (solo si falta).
- Todos los valores de evolución que no tienen una cifra en la literatura (tasas, tiempos al paro, ganancias de FC) son **convenciones de simulación educativa** y quedan "pendiente de validación experta" (§4.5).

### 4.5 Fuentes y validación

- Mecánica: ecuación de movimiento y constantes de tiempo (Hess y Kacmarek, 2019; Lucangelo et al., 2005); valores típicos de Crs y R (Arnal et al., 2018).
- Intercambio gaseoso: West y Luks (2021); Severinghaus (1979); Brackett et al. (1965); shunt y FiO₂ (Benatar et al., 1973); tiempos de equilibrio (Cakar et al., 2001; Taskar et al., 1995).
- Ventilación protectora: ARDS Network (2000); Amato et al. (2015); Fan et al. (2017); Grasselli et al. (2023).
- Corazón-pulmón: Pinsky (2018); Luecke y Pelosi (2005); acidosis (Kraut y Madias, 2010); hipercapnia (Curley et al., 2010).
- PAM objetivo de 65 mmHg: Evans et al. (2021).
- Paro: no existe un umbral validado de SpO₂ o duración (Mort, 2004): el modelo es una convención educativa.
- Registro: `srv/docs/cierre/validacion-contenido.md`, sección "Bloque A", con la lista de parámetros para el colaborador médico.

### 4.6 Visible desde el mismo estado

FC y estado del paciente entran en `toPatientValues` (tarjetas y monitor), las alarmas nuevas en la barra, la gravedad y el estado en el chip de estado, y los objetivos del caso siguen desde `targets`. Sin muestreo nuevo: todo llega en el mismo marco de métricas (≥ 50 fps y ≤ 4 commits/s se conservan; la actualización lenta sigue a 100 ms).

### 4.7 Debriefing

El resumen de la sesión (`summary`) agrega `outcome` (`status`, momentos de inicio crítico, paro y fallecimiento) y `timeline` (decisiones `PARAM_CHANGE` con su diferencia, alarmas al aparecer, cambios de estado del paciente), calculado por la repetición del servidor. La pantalla de resultado muestra "Paciente fallecido" y la línea de tiempo.

---

## 5. A3: IA en el simulador

| Función | Servidor | Web | Sin IA |
|---|---|---|---|
| Interpretación del caso | Caso de uso nuevo `SIM_CASE_INTERPRETATION`, prompt 1.0.0 con salida JSON estricta (mecánica, intercambio gaseoso, hemodinamia, trayectoria). Parser y validador propios: cada valor dentro de los rangos fisiológicos **y** dentro de ±30 % del valor curado (la IA solo ajusta). Se ejecuta al iniciar una sesión FREE (catálogo o paciente propio) con un tope de 8 s. Se persiste en `patientProfile.interpretation` (`promptVersion`, `aiCallId`, `source`, `proposed`, `applied`, `rejected`) y la repetición usa `applied` | Chip "Parámetros interpretados por IA" / "Parámetros del caso" en el drawer del caso | Valores curados; nunca bloquea el inicio. EXAM: siempre curados |
| Coaching | `SIM_ASSIST` 1.2.0: el contexto suma tendencias (últimos 5 min del paciente, una muestra por minuto) y el estado del paciente; la salida pide sugerencias priorizadas (qué cambiar, por qué y qué esperar ver en las curvas) | Asesoría IA (sin cambios de UI salvo la etiqueta de respaldo) | Asesor determinista existente |
| Alarmas clicables | `POST /api/simulation/sessions/:id/alarm-help` (SSE): evento `rules` con las sugerencias deterministas por tipo de alarma y contexto (con referencia), luego `delta`/`done` de la IA (caso de uso `SIM_ALARM_HELP`). Registra `AI_HELP` (penaliza en EXAM con penalización) | Cada alarma es un botón que abre el drawer "¿Cómo estabilizar?" con las reglas y la sugerencia en streaming; valoración "¿Te fue útil?" con superficie `SIM_ALARM` | Solo reglas, con "Sugerencia automática (IA no disponible)" |
| Modo real | `POST /api/ventilator/assist` y `POST /api/ventilator/alarm-help` (SSE) con la telemetría reciente que envía el cliente (DTO validado: ajustes informados, métricas recientes, alarmas del equipo, límites del cliente, caso opcional). Ningún código de IA importa los comandos del ventilador | Mismos paneles en la consola real | Reglas |
| EXAM | Política de la evaluación (`isAssistanceAllowed`): DISABLED → 403 para asistencia y ayuda de alarmas | DISABLED: el panel de alarma muestra solo la descripción ("Ayuda no disponible durante el examen") | — |

Valoraciones: tipo de objetivo nuevo `AI_CALL` (`targetId` = `aiCallId`, del propio usuario y de un caso de uso valorable) para la ayuda de alarmas y la asistencia real; la Asesoría IA digital conserva `SIM_ASSIST`.

---

## 6. A4: logo

- `.logoVentyLab`: alto `var(--vl-space-6)` (verificar el valor del token en la Fase 2; objetivo ≈ 40 px a 1920 y ≈ 32 px bajo 1100 px), ancho automático proporcional, sin tokens nuevos. Univalle se ajusta al mismo ancho visual.
- Verificación con capturas a 1280×720 y 1920×1080: la altura útil de las curvas no baja frente a `master`.

---

## 7. A5: pruebas

- Motor (jest, servidor): propiedades fisiológicas (PEEP en SDRA: PaO₂ sube hasta un punto y la PAM baja; FR baja en EPOC: menos auto-PEEP; Vt alto: más Pmeseta y ΔP), evolución (inacción en el caso inestable → fallecido en el tiempo del caso; ajuste correcto → baja la gravedad y sube la SpO₂; caso estable → nunca crítico en 60 min, para todos los casos sembrados), determinismo con evolución, compatibilidad v1.
- Servidor: parser y validador de la interpretación, fusión acotada, respaldo; reglas de alarmas; endpoints (unit + contrato); política EXAM.
- Web (vitest): programador de aplicación automática (0/300 ms), programador de envío real (500 ms, coalescencia, un comando en vuelo, rechazo por rango, deshacer), panel de alarma.
- E2E (Playwright, `e2e/bloque-a/`): aplicación automática digital; deterioro por inacción en el caso inestable hasta "Paciente fallecido" con ×4; mejoría con el ajuste correcto; clic en alarma → reglas + IA (LLM falso); modo real con el equipo simulado (rebote, rechazo por rango, deshacer); repetición idéntica a la sesión en vivo.

---

## 7b. Decisiones por defecto

| # | Decisión | Por defecto | Alternativa |
|---|---|---|---|
| A-1 | Rebote digital | 0 ms discretos, 300 ms slider y rueda | Todo a 300 ms |
| A-2 | Rebote real | 500 ms desde el último cambio de cualquier parámetro, un solo comando con todos | Un comando por parámetro |
| A-3 | Deshacer | "Deshacer último cambio" solo en Real (como pide el encargo) | También en digital |
| A-4 | Esc / Enter | Esc descarta el rebote en curso, Enter lo aplica ya | Sin atajos |
| A-5 | Versión del motor | 2.0.0; sesiones 1.0.0 se repiten sin evolución | Copia congelada del motor v1 |
| A-6 | Paro | Irreversible, sin RCP; fallecimiento a los 2 min del paciente | Permitir rescate en paro |
| A-7 | Rangos seguros reales | Los actuales (motor + seguridad del laboratorio + servidor), marcados para validar con el protocolo del equipo | Rangos nuevos más estrechos |
| A-8 | Interpretación IA | Solo FREE, ±30 % del valor curado, tope de 8 s | También EXAM |
| A-9 | Ayuda de alarmas en EXAM | Sigue la política: DISABLED no muestra reglas ni IA | Reglas siempre visibles |
| A-10 | Valoración | Tipo `AI_CALL` + superficie `SIM_ALARM` | Reusar `SIM_ASSIST` |
| A-11 | Reloj de evolución | Tiempo del paciente = tiempo simulado × multiplicador (como el deterioro actual) | Solo tiempo simulado |
| A-12 | Asincronías y rise time | Documentados como brechas (backlog) | Implementarlos ahora |

**Nota 2026-11-10 (reversión de la aplicación/envío automático, A-1 a A-4).** Se revierte la aplicación y el envío automático (commits ae20f7a y 6dbae27; §3.1 y §3.2): en Digital y Real cada cambio queda pendiente (resaltado) hasta pulsar **Enviar**, que aplica el conjunto completo una vez (motor en Digital; un comando con la configuración completa del modo en Real). Efecto por decisión:

| # | Antes | Ahora |
|---|---|---|
| A-1 | Rebote digital de 0 ms / 300 ms con aplicación automática | Revertida: sin rebote; se aplica solo con Enviar |
| A-2 | Rebote real de 500 ms, un solo comando con todos | Se revierte el rebote; se conserva "un solo comando con todos", la cola de un comando en vuelo, la validación de rango seguro y el estado por parámetro |
| A-3 | "Deshacer último cambio" solo en Real | Se conserva Deshacer y se extiende a Digital en la misma posición (reversión aprobada) |
| A-4 | Esc descarta el rebote, Enter lo aplica | Se conservan los atajos: Esc descarta los pendientes, Enter envía |

Botonera idéntica en ambos modos, como en julio: [Enviar][Detener], "Deshacer último cambio", contador de pendientes, [Ajustar][Restablecer tarjetas] y tarjetas. El botón "Cancelar" no vuelve (Esc cumple esa función). **Detener** queda visible en su posición de julio pero deshabilitado ("Disponible próximamente"), pendiente del hardware: en julio enviaba una trama de parada por puerto serie y hoy no existe un comando STOP por MQTT.

**Valores base en Real.** Mientras el equipo no informe `mode` ni `settings`, el operador define una configuración inicial completa (modo y todos los campos obligatorios, precargados con los valores por defecto de Digital); el primer envío exige revisar y confirmar todos los campos obligatorios. Desde ahí, la última configuración enviada es la base, y junto al panel se muestra "Configuración no confirmada por el equipo" hasta que el equipo informe su configuración o confirme un comando. Pendiente del hardware: que el firmware informe `mode` y `settings` en cada trama.

---

## 8. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Cambiar la fisiología altera la nota de sesiones viejas | Puerta por versión en el mapeador (§4.1) y prueba de compatibilidad v1 |
| R2 | Un caso de julio se vuelve inestable con la evolución derivada | Prueba "estable nunca crítico" sobre todos los casos sembrados; si falla, el caso recibe su bloque propio |
| R3 | La IA propone valores fuera de rango o JSON inválido | Parser estricto, acotado a ±30 % y a los rangos; si falla, valores curados |
| R4 | Envío automático real con una ráfaga de cambios | Rebote + un comando en vuelo + coalescencia; el token bucket del servidor sigue como última barrera |
| R5 | Contrato compartido con otros bloques | Regenerar OpenAPI y cliente en la rama; en un rebase se regeneran |
| R6 | E2E largos por la evolución | Multiplicador ×4 y caso inestable con tiempos cortos |

---

## 9. Plan de la Fase 2 (commits)

Servidor:

1. `feat(simulation): patient evolution, heart rate and outcome in the engine (v2.0.0)`
2. `feat(clinical-cases): evolution parameters and the unstable ARDS case`
3. `feat(simulation): outcome and debrief timeline in the session summary`
4. `feat(ai): case interpretation at session start` (migración `20261105140000_simulator_ai_block_a`)
5. `feat(simulation): coaching with trends in SIM_ASSIST 1.2.0`
6. `feat(simulation): alarm help with deterministic rules and AI streaming`
7. `feat(ventilator-commands): real-mode assist and alarm help`
8. `docs(cierre): Bloque A content validation and AI context`

Web:

1. `chore(sim-engine): sync engine 2.0.0` + `chore(api-client): regenerate`
2. `feat(console): apply July console changes automatically`
3. `feat(ventilator-lab): auto-send real commands with debounce, coalescing and undo`
4. `feat(simulator): heart rate, patient status and the deceased debrief`
5. `feat(console): clickable alarms with "¿Cómo estabilizar?"`
6. `feat(ventilator-lab): AI assist and alarm help in real mode`
7. `style(console): smaller VentyLab logo`
8. `test(e2e): Bloque A simulator`

Coordinación: migración anotada en `_coord/migrations.md`; sin tokens nuevos (si hacen falta, `_coord/token-requests.md`); sin entradas de menú.

---

## 10. Desvíos respecto del diseño (Fase 2)

Registrados durante la ejecución (2026-11-04 y 2026-11-05). Todos son reversibles.

### Servidor

| Tarea | Diseño | Hecho | Motivo |
|---|---|---|---|
| Entorno | `.env` del worktree | Variables locales en línea al arrancar procesos | La escritura de `.env` está bloqueada por permisos |
| Ejecución | Subagentes escritores por worktree | El servidor lo escribió el líder; la web, dos subagentes en serie | El límite de subagentes concurrentes estaba lleno por los otros bloques |
| §4.2 | Agresión de hipoxemia "mínimo del objetivo o 88 %" | Siempre 88 % (umbral configurable por caso) | Los objetivos son pedagógicos; la evolución depende de la fisiología |
| §4.4 | FC basal desde los signos vitales del caso | Desde el bloque `evolution` (80 lpm por defecto) | La instantánea del caso que usa el motor no incluye `initialVitals` |
| §4.4 | Evolución derivada con umbrales absolutos | Umbrales de hipotensión y PAM crítica por debajo de la PAM basal del caso (5 y 20 mmHg) | El caso de julio "SDRA con sepsis" arranca en choque (PAM 58) y moría solo por su PAM basal, sin vasopresores en el simulador |
| §4.2 / §7 | "Un caso estable nunca llega a crítico" | Caso estable **al inicio** (sin agresiones en los primeros 2 min): nunca crítico en 60 min; caso inestable al inicio: al menos 30 min antes del fallecimiento | El caso séptico de julio es inestable al inicio por diseño (acidosis, Pmeseta 32, choque) |
| §5 | Valoración en simulación digital con `SIM_ASSIST` | Ayuda de alarmas (digital y real) y asistencia real con `AI_CALL` (targetId = aiCallId) | Un solo tipo para respuestas sin persistencia propia |
| §9 | Commits 6 y 7 separados (ayuda de alarmas; modo real) | Un commit: comparten controlador, eventos SSE y reglas | Revisión más simple |
| §9 | Respaldo determinista de la ayuda de alarmas = reglas | Respaldo = asesor determinista existente (contextual) | Las reglas ya se envían en el evento `rules`; repetirlas no aporta |
| — | — | Resultados EXAM retenidos hasta la liberación docente (pedido C → A); la rama del servidor se basó en `feat/ajustes-c-evaluacion` (PR #13) para usar `answersReleasedAt` | Fuga detectada por el Bloque C; la política C1 aplica a todas las evaluaciones |
| — | — | Editar un caso desde el editor elimina su bloque `evolution` propio (el mapper de gestión no lo transporta) y el caso vuelve a la evolución derivada | El editor de casos es del Bloque D; queda en el backlog |
| Verificación | — | La prueba de tiempo UPPAAL S4 (p99 ≤ 5 ms) falla en local con la máquina cargada por cuatro bloques; pasó en una corrida anterior | Dependiente de la carga; la CI decide |

### Web

| Tarea | Diseño | Hecho | Motivo |
|---|---|---|---|
| Rama | Desde `master` | Rebasada sobre `feat/ajustes-c-evaluacion` (PR web #31); respaldo en `backup/ajustes-a-web-pre-rebase` | El contrato del servidor del Bloque A parte del Bloque C; sin la base de C se rompían sus consumidores |
| §3.2 | Rebote real dentro de la consola | La consola Real usa retardos 0/0 y el rebote de 500 ms vive solo en la cola de envío (`LAB/entities/auto-send.ts`) | Un solo temporizador por envío |
| §3.2 | Mostrar el valor informado por el equipo | Mientras un valor está en cola o en vuelo se muestra el pedido, con su estado | Evita que el control "salte" al valor viejo |
| §3.2 | Resultados sin estado exacto | Aviso de arrastre = "Rechazado: no se envió"; desenlace desconocido = "Rechazado: sin confirmación del equipo" | El protocolo no da una confirmación en esos casos |
| §3.2 | Confirmar/Cancelar eliminados | Se conservan detrás de `applyMode="confirm"` (consola clásica y pruebas) | Reversible sin código nuevo |
| §3.2 | Deshacer | Alterna: tras deshacer, vuelve a enviar los valores previos al deshacer | Comportamiento simétrico |
| §6 | Univalle al mismo ancho que VentyLab | Univalle proporcional (112 px; 88 px bajo 1100 px) | A 80 px el logotipo mide unos 9 px de alto y no se lee |
| §5 | Ayuda de alarmas en EXAM con penalización automática | Se pide de forma explícita (como la Asesoría IA) | Cada respuesta penaliza la nota |
| A5 | Rechazo por rango en Real (e2e) | El e2e comprueba que en el máximo seguro el control queda deshabilitado y no se envía nada | La consola acota los valores: no se puede escribir uno fuera de rango |
| A5 | E2E del modo real en la CI | Solo local (necesita Mosquitto y `scripts/e2e/fake-ventilator.mjs`) | La CI no levanta MQTT |
| — | — | `e2e/bloque5/monitoreo-orden` espera "Equipo sin datos": falla si el ventilador simulado está transmitiendo | Documentado en `scripts/e2e/README.md` |
| — | — | `AiRatingWidget` deja el foco en el body tras valorar (accesibilidad, componente compartido) | Backlog |
| CI | Verde antes de mergear | Los jobs del web hacen checkout de `ventylab-server` `main`: `check:api` y los e2e fallan hasta mergear el servidor | Precedente del Bloque 3 |
