<!--
* Funcionalidad: Capturas del simulador, julio frente al nuevo (Bloque 1)
* Descripción: Índice de las capturas por pestaña del simulador unificado (/simulador) tomadas en W12 y comparación con la versión de julio (worktree _legacy-web-jul, commit 62c9d68). Explica por qué la app de julio no se pudo capturar y remite a las secciones de FLUJOS_JULIO.md que describen esas pantallas. v0.2 (W6-fix): las dos capturas del defecto de Monitoreo se reemplazan por las del layout corregido a 1280, 1440 y 1920 px (digital con el caso largo, caso oculto y vista real).
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Capturas del simulador: julio frente al nuevo

Las capturas se tomaron el 2026-10-26 con Playwright (Chromium 156) en una ventana de 1920×1080. Se usó el build de
producción `fd46ac5` (`next start`) contra el backend local con el código del Bloque 1 (`ventylab-server` `4b45459`).
El usuario es el estudiante `estudiante01` de la semilla demo.

No hay ventilador físico conectado: el broker MQTT está deshabilitado en el stack local. Por eso el modo real muestra
"Equipo sin datos".

## App nueva (`/simulador`), por pestaña

| Pestaña | Estado | Archivo |
|---|---|---|
| Simular Paciente | Diálogo "Cargar caso clínico" (casos publicados, con filtros) | `nuevo-simular-cargar-caso.png` |
| Simular Paciente | Paso 1 "Paciente y Condición" con el caso de julio "Neumonía grave con hipoxemia" cargado | `nuevo-simular-paso1.png` |
| Simular Paciente | Paso 2 "Estado Actual y Resumen" con los parámetros sugeridos | `nuevo-simular-paso2.png` |
| Monitoreo | Guía vacía, sin sesión ("Ir a Simular Paciente" / "Ir a Conexión") | `nuevo-monitoreo-guia-vacia.png` |
| Monitoreo | Digital con curvas, chip "Simulando" (caso "Pulmón normal: postoperatorio inmediato") | `nuevo-monitoreo-digital.png` |
| Monitoreo | Resultado de la sesión en diálogo después de "Finalizar sesión" | `nuevo-monitoreo-resultado.png` |
| Monitoreo | Real, conectado y con control, sin datos del equipo | `nuevo-monitoreo-real-sin-datos.png` |
| Conexión | Sin reserva ("Reserva: Disponible", "Reservar ahora") | `nuevo-conexion-sin-reserva.png` |
| Conexión | Con reserva ("Activa · 30 min restantes"), antes de conectar | `nuevo-conexion-reservado.png` |
| Conexión | Conectado, "Controlas el equipo" | `nuevo-conexion-conectado.png` |
| Mis sesiones | Lista unificada con el filtro por tipo | `nuevo-sesiones-lista.png` |
| Mis sesiones | Repetición dentro del panel, en solo lectura | `nuevo-sesiones-repeticion.png` |

## App de julio: no se pudo capturar

La app de julio se intentó levantar desde el worktree `_legacy-web-jul` (commit `62c9d68`), así:

- `npm ci --ignore-scripts`: se omitieron los scripts de postinstall porque regeneran
  `src/features/teaching/data/lessons.manifest.json`, que está versionado.
- `next dev --webpack -p 3100`.

**Ninguna página renderiza.** `/simulador` responde 500 con el error
`ReferenceError: changePassword is not defined` en `src/shared/services/authService.js:511`:

- El objeto exportado por defecto aún lista `changePassword`.
- Pero la función se eliminó del servicio; el comentario de la línea 456 dice que se movió a `profile.api.ts`.
- El servicio se importa desde `pages/_app.js` (`AuthContext` → `useAuth` → `authService`), así que el error rompe todas
  las rutas, en el servidor y en el cliente.

Arreglarlo exige modificar un archivo versionado del worktree de julio, y eso estaba fuera de las reglas de W12 (julio es
solo lectura). Lo único que renderiza es la pantalla de error: `julio-simulador-error-arranque.png`.

Además, aunque arrancara, faltan piezas para capturar varios estados:

- El backend Express de julio (`_legacy-server-jul`) no está levantado.
- Faltan sus `.env`: ni la web ni el server de julio tienen `.env` en el worktree.

Sin backend no hay inicio de sesión ni las llamadas `POST /api/simulation/patient/configure` y `/start` que llenan
Monitoreo. Tampoco habría reserva ni conexión.

En lugar de las capturas de julio, estas secciones de `FLUJOS_JULIO.md` (raíz del workspace) describen esas pantallas
con diagramas derivados del código:

| Pestaña nueva | Referencia de julio en `FLUJOS_JULIO.md` |
|---|---|
| Simular Paciente (pasos 1 y 2) | §a.3 "Diagrama de la pestaña Simular Paciente" y §a.4 "Pasos del usuario" |
| Monitoreo digital y guía vacía | §a.2 "Diagrama de la pestaña Monitoreo", §a.4 pasos 1 y 6 (switch "Paciente Simulado" + "Simular Gráficas"), §a.6 y §a.9 |
| Monitoreo real | §b.5 paso 4 (chip "Conectado (Físico)", `NoSignalBanner`) |
| Conexión (sin reserva / reservado / conectado) | §b.3 "Diagrama de la pestaña Conexión", §b.4 FSM y §b.5 pasos |
| Mis sesiones | No existía en julio (§a.1: solo había tres pestañas; la sesión se guardaba al desmontar, §a.4 paso 9) |

Diferencias visibles entre ambas versiones, según esas secciones:

- Julio tenía tres pestañas; ahora hay cuatro (se agrega Mis sesiones).
- Ahora hay un selector explícito Digital/Real. En julio el modo era implícito y dependía de los switches
  "Datos Reales / Paciente Simulado" y "Simular Gráficas".
- El resultado de la sesión se muestra en un diálogo.
- La reserva inmediata usa "Reservar ahora", con duraciones de 15, 30, 45 y 60 min.

## Monitoreo responsive (W6-fix)

Durante la toma de W12 apareció un defecto de diseño en Monitoreo: a 1280×720 (y a 1440×900) la columna de curvas medía
~1 px; a 1920×1080, con el caso largo "Neumonía grave con hipoxemia", el panel "Caso clínico" se montaba sobre la consola;
"Ocultar caso clínico" dejaba el texto del caso a todo el ancho y la consola desaparecía; y el texto de "Historia clínica"
tenía muy poco contraste sobre el fondo oscuro. Se corrigió solo con CSS (W6-fix) y las capturas del defecto se
reemplazaron por estas, tomadas con el build de producción y el mismo caso largo:

| Archivo | Tamaño | Qué muestra |
|---|---|---|
| `monitoreo-digital-caso-largo-1280.png` | 1280×720 | Las curvas ocupan todo el ancho de la consola (canvas de 882 px); métricas y controles quedan debajo, y el panel del caso se apila bajo la consola. |
| `monitoreo-digital-caso-largo-1440.png` | 1440×900 | Consola en tres columnas compactas (curvas de 552 px, 53 % de la consola); el panel del caso se apila debajo. |
| `monitoreo-digital-caso-largo-1920.png` | 1920×1080 | El panel del caso es una columna lateral con scroll propio y no tapa la consola (curvas de 598 px, 53 %). "Historia clínica" con el texto claro de la consola (contraste AA). |
| `monitoreo-digital-caso-oculto-1920.png` | 1920×1080 | Después de "Ocultar caso clínico": queda solo la barra "Mostrar caso clínico" arriba y la consola toma todo el ancho (curvas de 844 px). |
| `monitoreo-real-1280.png`, `monitoreo-real-1440.png`, `monitoreo-real-1920.png` | 1280, 1440 y 1920 | Vista real (conectado, "Equipo sin datos"): el mismo layout por ancho de la consola (curvas de 882, 552 y 844 px). |

Cómo se resolvió: la consola elige su distribución según el ancho que realmente recibe (contenedor CSS `vl-console`
declarado por el monitor de sesión y por la vista real), no según la ventana. El panel del caso es lateral solo desde
1600 px y se apila debajo en pantallas menores. El E2E `simulator-student.spec.ts` comprueba a 1280×720, con el caso
largo, que el canvas de curvas mide al menos 300 px, que el panel no se monta sobre la consola y que al ocultarlo la
consola sigue visible con todo su ancho.
