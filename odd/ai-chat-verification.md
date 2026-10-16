<!--
Funcionalidad: Verificación final de la migración del asistente IA (ai-chat)
Descripción: Registro de las comprobaciones de tipos, lint, pruebas, greps de convenciones, build de producción y medición del JS de primera carga tras la migración de ai-chat (master e64b306).
Versión: 1.0
Autor: Marcela Mazo Castro
Proyecto: VentyLab
Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
Institución: Universidad del Valle
Contacto: marcela.mazo@correounivalle.edu.co
-->

# Verificación de ai-chat (master e64b306, 2026-10-15)

Comprobaciones de solo lectura sobre el código fuente. El build de producción se ejecutó una sola vez, con autorización explícita, sin otros procesos `next` activos (solo el node de Adobe CC; ~1,2–1,5 GB libres).

## 1. `npm run typecheck`

`tsc -p tsconfig.strict.json --noEmit` → **código de salida 0, 0 errores**. CUMPLE.

## 2. `npm run lint`

`eslint --no-error-on-unmatched-pattern …` (incluye `src/shared/ai-conversation`, `src/features/ai-chat`, `pages/assistant/index.tsx`, `pages/assistant/[conversationId].tsx`) → **código de salida 0, sin errores ni avisos**. CUMPLE.

## 3. `npx vitest run` (suite completa)

```
 Test Files  3 failed | 147 passed (150)
      Tests  3 failed | 1193 passed (1196)
   Duration  374.59s
```

Código de salida 1 (por las 3 fallas). Cada archivo fallido se volvió a ejecutar solo:

| Archivo | Falla en la suite completa | Ejecución aislada | Diagnóstico |
|---|---|---|---|
| `src/shared/rich-content/rich-content.test.tsx` | "renders math with KaTeX…": `Test timed out in 5000ms` | 5/5 pasan | flake por carga (KaTeX diferido, conocido) |
| `src/features/ai-chat/application/components/conversation-list.test.tsx` | "moves back to the last existing page…": `Unable to find role="link"` (espera de `findBy` agotada) | 6/6 pasan | flake por carga |
| `src/features/evaluation-authoring/application/pages/evaluation-builder.page.test.tsx` | "picks a published clinical case…": `Unable to find … Cambios guardados.` | 20/20 pasan | flake por carga (fuera de ai-chat) |

Resultado: CUMPLE con salvedad — sin fallas reales; 3 flakes por tiempo bajo carga (la suite completa satura la máquina: setup 321 s, environment 753 s).

## 4. Greps de convenciones

| Comprobación | Resultado |
|---|---|
| `grep -rnE "sx=\|style=\{\|styled\(" src/features/ai-chat src/shared/ai-conversation` | 0 coincidencias |
| `grep -rnE "#[0-9a-fA-F]{3,6}\b\|rgb\(" … --include=*.module.css` | 0 coincidencias |
| `grep -rL "Autor: Marcela Mazo Castro" src/features/ai-chat src/shared/ai-conversation` | vacío (todos los archivos tienen header) |
| `grep -rn "dangerouslySetInnerHTML" src/features/ai-chat src/shared/ai-conversation` | 0 coincidencias |

CUMPLE.

## 5. `npm run build` + JS de primera carga

`next build --webpack` → **código de salida 0**, `✓ Compiled successfully in 71s`, `✓ Generating static pages … (50/50) in 13.5s`. Sin errores ni avisos relevantes en la salida.

Método idéntico a `odd/baseline-bundle.md` / `odd/ai-chat-audit.md` §g: `.next/build-manifest.json` → `polyfillFiles` + `pages['/_app']` + `pages[ruta]`, sin duplicados, solo `*.js`, gzip con .NET `GzipStream` (Optimal), en KiB.

| Ruta | raw KiB | gzip KiB | Base auditoría (gzip) | Δ gzip |
|---|---|---|---|---|
| `/_app` | 882,9 | 285,5 | 282,9 | +2,6 |
| `/learn` | 1045,8 | 340,7 | 336,7 | +4,0 |
| `/learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber]` | 1046,0 | 340,8 | 336,8 | +4,0 |
| `/profile` | 1028,8 | 335,6 | 331,2 | +4,4 |
| `/assistant` | 1038,9 | 339,5 | — (ruta nueva) | — |
| `/assistant/[conversationId]` | 1038,9 | 339,5 | — (ruta nueva) | — |

### Atribución de los deltas

La build base de la auditoría (2026-10-15 08:26) es anterior a los commits de evaluaciones (57231b5) y de ai-chat, por lo que el delta mezcla ambos.

- **`/_app` (+2,6 KiB):** los módulos de ai-chat presentes en `pages/_app-59a0bfb4723d384d.js`, medidos módulo por módulo (gzip individual, cota superior), son: `AiChatProvider` (995 B, contiene `"ai-chat-drawer"` como `AI_CHAT_DRAWER_ID` y el `lazy(() => retryImport(...))` del drawer), `AiChatLauncher` con su ícono (539 B, `"Abrir asistente IA"`), `TopBarActionsProvider` (181 B) y la constante de ruta `/assistant` (128 B). Total ≈ **1,8 KiB**. `useToast` y `retryImport` ya los usaban otros módulos (ToastProvider, insignia de grading). El resto (~0,8 KiB) no se puede separar sin una build en 57231b5; es atribuible a los commits de evaluaciones o a la variación del gzip del chunk completo.
- **Rutas de página (+1,4 a +1,8 KiB adicionales sobre `/_app`):** provienen de los chunks compartidos (1040, 634, 4825, …), que cambiaron por el slot de acciones del AppShell (7 líneas en `app-shell.tsx`) y por los commits de evaluaciones (nav/routes). No es separable con esta build; no contienen código del chat (ver abajo).

### Carga diferida comprobada (búsqueda de cadenas en los chunks)

| Cadena | Chunks de primera carga de `/_app`, `/learn`, lección | Dónde aparece |
|---|---|---|
| `Abrir asistente IA` | `_app` (lanzador, esperado) | solo `_app` |
| `ai-chat-drawer` | `_app` (solo la constante del id en el provider) | componente del drawer en el chunk asíncrono `1377.3dcc…js` |
| `KaTeX parse error` (librería KaTeX) | ninguno | asíncrono `2bd9703c.c3c2…js` |
| `micromark` (react-markdown) | ninguno | asíncronos `6336.3afc…js`, `8185.f1bd…js` |
| `Mensajes de la conversaci` (ChatPanel) | ninguno | asíncrono `484.1dbf…js` |
| `Alcanzaste el l…` (errores de ai-conversation) | ninguno | `9518-…js` (primera carga solo de `/assistant*`) y asíncrono `2003.…js` |

`katex-display` aparece solo como selector CSS de MarkdownRenderer (falso positivo) y no se usó como indicador. Los chunks de primera carga de `/assistant*` tampoco contienen KaTeX, micromark ni ChatPanel.

Resultado: CUMPLE — drawer, ChatPanel, markdown y KaTeX no están en la primera carga de `/_app` ni de `/learn*`.

## 6. Resumen

| Requisito | Estado |
|---|---|
| typecheck 0 errores | CUMPLE |
| lint 0 errores | CUMPLE |
| vitest | CUMPLE con salvedad (1193/1196; 3 flakes por carga, pasan aislados) |
| greps de convenciones (sx/style/styled, colores literales, header, dangerouslySetInnerHTML) | CUMPLE |
| build de producción | CUMPLE (exit 0) |
| drawer/ChatPanel/markdown/KaTeX fuera de la primera carga | CUMPLE |
| costo de ai-chat en `/_app` | ≈ 1,8 KiB gzip (cota superior por módulo) de +2,6 KiB totales |
