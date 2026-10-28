<!--
* Funcionalidad: Registro de pruebas en cuarentena
* Descripción: Lista de las pruebas de vitest desactivadas de forma explícita (it.skip/describe.skip con el comentario `// QUARANTINE(<motivo>, ver docs/quarantine.md)`), con su causa conocida o probable, cómo reproducirlas y el criterio de salida. Registra también los fallos preexistentes que se corrigieron en lugar de ponerse en cuarentena (Ola 0, CI en verde).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Registro de pruebas en cuarentena

Una prueba en cuarentena es una prueba que falla por una causa ajena al cambio en curso y que se desactiva de forma explícita para que
el CI siga siendo una señal confiable. Nunca se borra ni se "arregla" a ciegas: queda marcada, registrada aquí y con un criterio de salida.

## Estado actual

**No hay pruebas en cuarentena.** Los fallos preexistentes encontrados en la Ola 0 se corrigieron de raíz (ver
[Fallos resueltos sin cuarentena](#fallos-resueltos-sin-cuarentena)).

| Archivo | Prueba | Causa | Desde | Criterio de salida |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

## Cómo poner una prueba en cuarentena

1. Usar el alcance más estrecho posible: `it.skip` antes que `describe.skip`, y nunca un archivo completo si basta con una prueba.
2. Añadir justo encima el comentario `// QUARANTINE(<motivo corto>, ver docs/quarantine.md)`.
3. Agregar una fila a la tabla de [Estado actual](#estado-actual) con archivo, nombre exacto de la prueba, causa conocida o probable,
   fecha y criterio de salida, y describir la reproducción en una sección propia.
4. Para encontrar todas las pruebas en cuarentena: `rg -n "QUARANTINE\(" src scripts config`.

## Fallos resueltos sin cuarentena

### 1. Pruebas SSE/streaming en Node 24 (59 pruebas, 9 archivos)

**Síntoma.** Con Node 24 las pruebas que consumen un stream SSE a través de `fetch` (interceptado por msw) terminaban en
`ApiError: No se pudo conectar con el servidor` (`network.unavailable`, lanzado en `src/shared/api-client/sse-stream.ts`). Con Node 22,
la versión fijada en `.nvmrc`, `.node-version` y `ci.yml`, las mismas pruebas pasan.

**Causa.** El entorno jsdom de vitest reemplaza `AbortController`/`AbortSignal` globales por las clases de jsdom. `sse-stream.ts` pasa
esa señal a `fetch`; el interceptor de msw construye un `Request` de Node y el `fetch` de Node 24 (undici 7) la rechaza con
`TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal`, que el cliente traduce a
`network.unavailable`. undici 6 (Node 22) no hace esa comprobación.

**Corrección.** `vitest.environment.ts` envuelve el entorno jsdom integrado y, después de instalarlo, devuelve al global las clases
nativas de Node (la misma idea de `jest-fixed-jsdom`). `vitest.config.ts` usa ese entorno. Es solo infraestructura de pruebas: el código
de la aplicación no cambia.

| Archivo | Pruebas que fallaban |
| --- | --- |
| `src/features/ai-chat/application/components/chat-panel.test.tsx` | 4 |
| `src/features/ai-chat/application/hooks/use-chat-session.test.tsx` | 12 |
| `src/features/ai-chat/application/pages/assistant.page.test.tsx` | 2 |
| `src/features/learning/application/components/tutor/deepen-panel.test.tsx` | 11 |
| `src/features/learning/application/components/tutor/questions-panel.test.tsx` | 7 |
| `src/features/learning/application/hooks/use-ai-stream.test.tsx` | 5 |
| `src/features/simulator/application/components/assist-panel.test.tsx` | 6 |
| `src/shared/ai-conversation/application/use-streaming-response.test.tsx` | 11 |
| `src/shared/api-client/sse-stream.test.ts` | 1 |

**Reproducción del fallo original** (Node 24, forzando el entorno jsdom sin envolver):

```bash
npx vitest run --environment jsdom --maxWorkers=2
```

Resultado esperado sin la corrección: `9 failed` archivos y `59 failed` pruebas. Con el entorno del repositorio (`npx vitest run`) todas
pasan, tanto en Node 22 como en Node 24.

### 2. `SimulatorWorkspacePage > reads nothing until the router is ready` (1 prueba)

**Síntoma.** `TestingLibraryElementError: Unable to find role="heading" and name "Conexión"` de forma determinista en Windows, con
Node 22 y Node 24.

**Causa.** El panel Conexión real se carga de forma diferida; la primera importación del módulo tarda más que el 1 s por defecto de
`findBy`. Las pruebas posteriores del mismo archivo ya encuentran el módulo en caché.

**Corrección.** `simulator-workspace.page.test.tsx` espera el panel diferido con `LAZY_PANEL_WAIT` (4 s, por debajo de los 5 s de tiempo
límite por prueba de vitest), el mismo patrón que ya usaba para el ejecutor de sesiones diferido.

**Reproducción:**

```bash
npx vitest run src/features/simulator-workspace/application/pages/simulator-workspace.page.test.tsx
```

## Criterio de salida de una cuarentena

Una prueba sale de cuarentena cuando se quita el `skip`, se corrige la causa (en la prueba o en el código) y la prueba pasa en el CI
en tres ejecuciones seguidas. Al salir se borra su fila de la tabla y, si la causa merece memoria, se documenta en
[Fallos resueltos sin cuarentena](#fallos-resueltos-sin-cuarentena).
