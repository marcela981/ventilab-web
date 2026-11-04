# Referencias visuales de VentyLab (versión de julio)

Capturas de la interfaz web de julio de 2026 (commit `62c9d68`, worktree `_legacy-web-jul`), tomadas el 2026-11-03 como referencia visual para el Bloque 5 (Fase 1, Paso 0).

Cada pantalla se capturó a **1280×720** (`-1280`) y a **1920×1080** (`-1920`), con `deviceScaleFactor` 1. Los archivos con sufijo `-completa` son capturas de página completa: los contenedores con scroll interno se expandieron antes de capturar, así que el sidebar fijo solo aparece en la parte superior.

## Archivos

| Archivo | Ruta | Estado y rol |
|---|---|---|
| `01-login` | `/auth/login` | Sin sesión |
| `02-sidebar-expandido-estudiante` | `/teaching` | Sidebar global expandido, estudiante |
| `02b-sidebar-expandido-docente` | `/teaching` | Sidebar expandido con el ítem "Panel de Administración", docente |
| `03-sidebar-colapsado` | `/teaching` | Sidebar colapsado (64 px), estudiante |
| `04-simulador-monitoreo-sin-datos` (+ `-completa` a 1280) | `/simulador`, pestaña Monitoreo | Sin telemetría: chip "Sin señal" y texto guía, estudiante |
| `05-simulador-monitoreo-con-datos` (+ `-completa`) | `/simulador`, pestaña Monitoreo | Telemetría sintética, paciente "Caso 1" configurado, "Paciente Simulado" y "Simular Gráficas" activos: 3 curvas y tarjetas con valores, estudiante |
| `05b-simulador-monitoreo-telemetria-sin-paciente` | `/simulador`, pestaña Monitoreo | Llega telemetría pero no hay paciente: el placeholder sigue visible y las tarjetas ya muestran valores, estudiante |
| `06-simulador-simular-paciente` (+ `-completa`) | `/simulador`, pestaña Simular Paciente | Formulario vacío, paso 1, estudiante |
| `06b-simulador-simular-paciente-caso-cargado` (+ `-completa`) | `/simulador`, pestaña Simular Paciente | "Caso 1" de `patientSimulatedData.js` cargado, estudiante |
| `07-simulador-conexion` | `/simulador`, pestaña Conexión | Sin reserva, broker sin conexión, estudiante |
| `08-simulador-analisis-ia` | `/simulador` | Drawer "Análisis con IA" abierto sobre Monitoreo con datos, estudiante |
| `08b-simulador-analisis-ia-sin-paciente` | `/simulador` | Drawer "Análisis con IA" abierto sin datos, estudiante |
| `09-teaching-dashboard-tarjetas` (+ `-completa`) | `/teaching`, pestaña Dashboard | Tarjetas del dashboard del estudiante |
| `10-teaching-curriculum-acordeones` (+ `-completa`) | `/teaching`, pestaña Curriculum | Acordeón "Aprendizaje Mecánica respiratoria" abierto, con las tarjetas de módulo del Nivel Principiante. Los acordeones VentyLab y Prerrequisitos se ven cerrados porque al abrir uno se cierra el otro. |
| `11-leccion` (+ `-completa`) | `/teaching/module-01-inversion-fisiologica/module-01-inversion-fisiologica` | Visor de lección, estudiante |
| `11b-leccion-tutorai-abierto` | La misma lección | Popup TutorAI abierto (pestaña Sugerencias) |
| `12-evaluation-estudiante` (+ `-completa`) | `/evaluation` | Lista de quizzes, talleres y exámenes. Un quiz aparece completado y hay dos entregas: una calificada y otra enviada. Estudiante. |
| `12b-evaluation-docente` | `/evaluation` | Vista de docente |
| `13-panel-docente` (+ `-completa` a 1280) | `/panel` | Dashboard del panel con su `PanelSidebar`, docente (sin "Profesores" ni "Configuración", que son solo para admin) |
| `14-profile` (+ `-completa` a 1280) | `/profile` | Perfil, estudiante |

## Cómo se produjeron

- **Servidor:** `next dev --webpack -p 3200` en `_legacy-web-jul` con `NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:4999`, que es un backend inexistente: todas las llamadas se interceptan. Para `05*` y `08` se volvió a arrancar el servidor con `NEXT_PUBLIC_DEV_VENT_EMITTER=1` y `NEXT_PUBLIC_DEV_VENT_EMITTER_HZ=30`.
- **Parche local (no commiteado):** en `src/shared/services/authService.js` se quitaron del export por defecto `changePassword`, `getProfile`, `updateProfile`, `uploadAvatar` y `getProfileStats`. Esas funciones ya no existen en el archivo y su referencia lanzaba un `ReferenceError` al cargar.
- **Sesión simulada:** Playwright responde `GET /api/auth/session` (NextAuth) con un usuario `STUDENT` ("Laura Gómez") o `TEACHER` ("Marcela Mazo") y `GET /api/auth/backend-token` con un token falso. También se escribe `ventilab_auth_token` en `localStorage`. Para el login, la sesión es vacía.
- **Respuestas del backend:** `page.route` responde con datos de ejemplo del propio repositorio de julio:
  - El currículo (`/levels/curriculum`, `/modules/*`) se arma desde `curriculum/*/modules.js`.
  - Las evaluaciones (`/evaluation/quizzes`, `/evaluation/activities`) salen de los JSON de `ensenanza/shared/data/evaluation/`.
  - El paciente es el "Caso 1" de `patientSimulatedData.js`, cargado desde la interfaz.
  - Las estadísticas, los estudiantes del panel, las entregas y la respuesta de `/simulation/patient/configure` son datos ficticios mínimos.
  - El resto de las rutas responde `{ success: true, data: [] }`.
- **Telemetría:** es el emisor sintético de desarrollo de julio (`conexion/websocket/dev/syntheticVentilatorEmitter.ts`), que alimenta `ventilatorStreamStore` sin socket. El socket real hacia el backend falla y no afecta la captura.
- **Indicador de Next:** se ocultó con CSS (`nextjs-portal`) porque no forma parte de la UI.
- **Script:** `capturar.js` y `mocks.js`, en el scratchpad de la sesión (carpeta `julio-capturas/`). Se ejecutan con el Playwright de `ventilab-web`.

## Advertencias

- En las tarjetas de módulo de `/teaching` aparece el chip "NaNh". Puede ser una consecuencia de la forma de los datos simulados (`estimatedTime` numérico) y no del backend real. Hay que verificarlo antes de tomarlo como comportamiento de julio.
- El error "Presión pico debe ser mayor que PEEP" que aparece en Monitoreo es la validación propia de julio con los valores por defecto.
