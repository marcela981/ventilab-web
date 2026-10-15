# Fase 1 — Auditoría: ai-chat (asistente IA de chat libre)

Fecha: 2026-10-15 · Repo: ventilab-web (master, HEAD 57231b5) · Solo lectura. Backend consultado en solo lectura: ventylab-server (rama `main`).

## Premisas del pedido que NO se cumplen (verificado)

- **No existe un chat IA legado alcanzable.** Hay código legado de chat (`AITutorChat`, `TutorAIPopup`, `AITopicExpander`, `useAITutor`), pero ninguna ruta activa lo monta: el visor legado se abre solo con `/teaching?moduleId=&lessonId=`, y esa URL ya redirige (307) a `/learn/...` desde el servidor (`pages/teaching/index.js`, `getServerSideProps` → `resolveLegacyLessonUrl`, `src/features/learning/application/entities/learning-urls.ts:66`). No hay página `pages/assistant` ni `pages/chat`.
- **Estructura de la feature.** Las features migradas usan `api/{dtos,services,mappers}`, `application/{entities,hooks,components,pages}`, `UI/` e `index.ts`, no `{components,hooks,services,UI,types,config}`. Además, la regla de fronteras de ESLint solo clasifica como `feature` las carpetas `{api,application,UI}` (`eslint.config.mjs:184-190`). Con la estructura pedida, los archivos caerían en el tipo `legacy` y la frontera no se aplicaría. **Recomendación:** seguir la estructura real (`src/features/ai-chat/{api,application,UI}/…`), igual que en la auditoría de evaluaciones (regla de continuidad).
- **No hay endpoint de chat propio.** El chat libre es `POST /api/tutor/conversations` con `scope: "FREE"`, el mismo recurso que ya usan los paneles de learning. Rename, delete, paginación, filtro por scope y 404 por propiedad **sí existen** en la API.
- **No hay Playwright ni E2E.** Solo hay Vitest con jsdom.
- **El `done` NO incluye `sources`.** Solo trae `{aiCallId, messageId, conversationId}`.

## a) Chat IA legado

| Archivo | Rol | ¿Alcanzable? |
|---|---|---|
| `src/features/ensenanza/shared/components/ai/AITutorChat.jsx` (525 l.) | chat flotante: Enter envía, scroll automático, "La IA está respondiendo…", cancelar stream (`:24,85-93,123-129,173-176,424`) | **No.** Solo lo exportan `components/ai/index.js:1`, que nadie importa |
| `src/features/ensenanza/shared/hooks/useAITutor.js` (337 l.) | estado del chat: messages, isStreaming, provider, `clearHistory`, `cancelStream` (`:313-333`) | Solo a través de AITutorChat |
| `.../ai/ChatMessage.jsx` (347 l.) | burbuja con avatar y un parser de markdown casero (`parseBasicMarkdown`, `:21,210`) | Solo a través de AITutorChat |
| `.../ai/TutorAIPopup.jsx` (932 l.) | popup con pestañas suggestions/notes/saved (`:856-868`); usa `react-markdown` + `remark-gfm` (`:54-55`), `sendLessonAI` y notesService | Desde `LessonViewer.jsx:75,801` → `TeachingLessonView` → `TeachingModule.jsx:988-990` → `/teaching?moduleId&lessonId`, que **redirige** |
| `.../ai/AITopicExpander.jsx` (1641 l.) + Results/Suggestions/ChatMessage | "Expandir tema" en `TheorySection.jsx:12` (lazy) | Igual que el anterior: no alcanzable |
| `src/features/ai-feedback/services/{chatService.js,tutorService.js,aiExpandService.js,sharedAI.ts,AIServiceManager.js,providers/GeminiProvider.js}` | transporte | `AIServiceManager` también lo usa el simulador (`useAIAnalysis.js:2`, `useAIFeedback.js:2`): **queda fuera de alcance** |

Endpoints que consumía el legado. **Ninguno existe en `openapi.json`**: el backend NestJS los retiró.

- `POST {BACKEND}/ai/chat/completions` (SSE, `chatService.js:239,426`; `tutorService.js:268`)
- `GET/POST /ai/tutor/cache` (`tutorService.js:152,217`)
- `GET /ai/providers` (`tutorService.js:439`; `chatService.js:554`)
- `POST /ai/expand-topic` (`aiExpandService.js:432`)
- `useAITutor.js:227` llama a **Gemini directamente desde el navegador** con `NEXT_PUBLIC_GEMINI_API_KEY` (`GeminiProvider.js:64-69`). Es un riesgo de exposición de clave; el reemplazo lo elimina del camino del chat.

`pages/api/` solo contiene `auth` y `curriculum`: no hay ruta Next de chat.

## b) Streaming actual en learning ("Profundizar" y "Preguntas")

**Archivos**

| Archivo | Función |
|---|---|
| `src/shared/api-client/sse-stream.ts` (336 l.) | helper SSE compartido. `postEventStream`/`runEventStream`/`createSseParser` usan fetch + ReadableStream (no EventSource) con bearer. En 401 reintenta una vez con refresh single-flight. Los errores previos al stream se convierten en `ApiError` (`apiErrorFromResponse`, con `retryAfter` desde la cabecera `Retry-After` o desde `data.retryAfter`/`resetAt`, `:169-190`). `event: error` se emite como evento. Si el stream se cierra sin `done`/`error`, produce `network.stream_interrupted`. Si se aborta, termina sin emitir nada. Tipos: `TutorStreamDone`, `EventStreamEvent` (`:29-38`). Se exporta desde `@shared/api-client` (`index.ts:31-39`) |
| `src/features/learning/application/hooks/use-ai-stream.ts` (125 l.) | `useAiStream()`. Estado `idle\|streaming\|done\|error\|aborted`. Los deltas se acumulan con `text: current.text + event.text` (`:84-86`). `start()` aborta el stream anterior; `isCurrent()` descarta frames de streams reemplazados. `stop()` aborta y conserva el texto parcial (`:47-57`). El desmontaje aborta (`:117-120`). El resultado lleva `streamStarted` para distinguir un rechazo previo de una interrupción. Único acoplamiento a learning: el tipo `TutorStreamRequest` (`../entities/tutor.entity`) |
| `.../hooks/use-scope-conversation.ts` (125 l.) | Busca la conversación LESSON/MODULE por refId **del lado del cliente**: pagina `GET /api/tutor/conversations?scope=` con 100 por página y un máximo de 5 páginas (BACKEND GAP: no hay filtro `refId`). Luego hace `GET /{id}`. `adopt(id)` siembra la caché SWR tras el primer `done`; `refresh()` revalida |
| `.../components/tutor/tutor-answer.tsx` (51 l.) | burbuja del asistente: "Pensando…" mientras no llega texto, `RichContent` para el markdown, notas "detenida/incompleta" y `AiRatingWidget` (`targetType="MESSAGE"`, `targetId` = id del mensaje del asistente, `:37-50`) |
| `.../components/tutor/questions-panel.tsx` (208 l.) | "Preguntas": selector LESSON/MODULE, historial, `QUESTION_MESSAGE_MAX = 4000` (`:34`), `maxLength` en el TextField (`:159`) y botón "Detener" (`:163`). Si el rechazo llega antes del stream, devuelve la pregunta al input (`:103-109`); si no, `adopt` o `refresh` (`:111-117`) |
| `.../components/tutor/deepen-panel.tsx` (151 l.) | "Profundizar": `POST /pages/{pageId}/deepen`, historial local por página y `conversationId` adoptado solo desde `done` (`:96-100`) |
| `.../entities/ai-error-messages.ts` | mensajes en español. `ai.quota_exceeded` se muestra con la hora local de reinicio (`formatResetTime(retryAfter)`, `:37-54`). También cubre 429 genérico, 503/`ai.providers_unavailable` y stream interrumpido |
| `.../entities/tutor.entity.ts` | `canRateMessage` = ASSISTANT con `aiCallId !== null` (`:48-50`) y `findScopeConversation` |
| `.../api/services/tutor.service.ts` | paths y builders `{path, body}` (`deepenPageRequest`, `startConversationRequest`, `sendMessageRequest`, `getConversationResult`) |
| `src/features/learning/UI/tutor-panel.module.css` | estilos de burbujas, thread, hint y note |
| `.../pages/lesson-viewer.page.tsx:57-62,251,258` | los paneles se cargan como chunks lazy (`React.lazy` + `retryImport`) |

**Markdown de las respuestas.** Se usa `RichContent` de `@shared/rich-content`, que detecta el formato y carga de forma lazy `markdown-view.tsx` (react-markdown + remark-gfm, `skipHtml`, `:21`) o `math-markdown-view.tsx` (+ remark-math + rehype-katex, CSS de KaTeX en el chunk, `skipHtml`, `trust:false`, `:26-29`). Ver la sección e.

**Qué pasaría a `src/shared/ai-conversation`** (shared solo puede importar shared, `eslint.config.mjs:205`):

| Pieza | Origen | Nota |
|---|---|---|
| `useStreamingResponse` | `use-ai-stream.ts` (se mueve casi tal cual) | se mueve `TutorStreamRequest` (`{path, body}`) a un tipo propio de shared |
| `MessageBubble` (usuario/asistente) + nota de interrupción + rating | `tutor-answer.tsx` + `MessageView` de questions-panel | depende de `@shared/rich-content` y `@shared/ai-rating` (ambos shared: OK) |
| `StreamingMessage` | rama "pending" de questions-panel / turno actual de deepen | |
| `MessageList` | `<ul aria-live="polite">` de questions-panel | autoscroll (nuevo; el legado lo tenía) |
| `Composer` | form + TextField `maxLength` + Enviar/Detener de questions-panel | límite por prop (4000 chat, 1000 deepen) |
| `TypingIndicator` | "Pensando…" de tutor-answer | |
| `AiMarkdown` | envoltorio de `RichContent` con `emptyLabel=""` | **no** duplicar react-markdown; reutilizar rich-content |
| mensajes de error IA | `ai-error-messages.ts` (el núcleo genérico: cuota, 503, interrumpido) | la parte de 404 "página no publicada" queda en learning |
| UI CSS | parte de `tutor-panel.module.css` → `src/shared/ai-conversation/UI/*.module.css` | |

**Queda en learning:** `useScopeConversation` (búsqueda por refId LESSON/MODULE), `deepen-panel`, `questions-panel` (selector de scope), `tutor.service.ts`, DTOs, mapper y el entity `findScopeConversation`. Los paneles pasarían a componer las piezas compartidas, lo que obliga a revisar los tests existentes.

**Tests que cubren esto** (Vitest + jsdom; no hay E2E):

- `src/shared/api-client/sse-stream.test.ts` (13)
- `src/features/learning/application/hooks/use-ai-stream.test.tsx` (5) y `use-ai-stream-eof.test.tsx` (3), con helper `sse-test-helpers.ts`
- `.../hooks/use-scope-conversation.test.tsx` (2)
- `.../components/tutor/questions-panel.test.tsx` (10) y `deepen-panel.test.tsx` (11)
- `.../entities/ai-error-messages.test.ts` (9)
- `.../pages/lesson-viewer.page.test.tsx` (11)
- `src/shared/ai-rating/ai-rating-widget.test.tsx` (6)
- `src/shared/rich-content/rich-content.test.tsx`

## c) Contrato OpenAPI (`openapi/openapi.json`, idéntico md5 al del backend) + verificación en backend

Todas las rutas exigen el permiso `ai-tutor:use` y rol mínimo STUDENT.

| Método y ruta | operationId | Request | Response |
|---|---|---|---|
| GET `/api/tutor/conversations` | getConversations | query: `page` (≥1, def. 1), `limit` (1–100, def. 10), `ids`, `createdAtFrom/To`, `sortOrder` asc/desc, `scope` FREE\|LESSON\|MODULE\|PAGE | envelope `data: AiConversationDTO[]` + `pagination` (`APIPagination`: total, pages, page, limit, next, previous). Orden: más reciente por actividad |
| POST `/api/tutor/conversations` | startConversation | `StartAiConversationDTO {scope: FREE\|LESSON\|MODULE (req.), message (req., **maxLength 4000**), refId? (req. en LESSON/MODULE, ignorado en FREE), currentPageId?}` | `text/event-stream` |
| GET `/api/tutor/conversations/{id}` | getConversation | — | `AiConversationDetailDTO` = `AiConversationDTO` + `messages: AiConversationMessageDTO[]` (orden cronológico) |
| PATCH `/api/tutor/conversations/{id}` | renameConversation | `RenameAiConversationDTO {title (req., maxLength 120; se colapsan espacios y se guarda hasta 60)}` | `data: null` |
| DELETE `/api/tutor/conversations/{id}` | deleteConversation | — | `data: null` |
| POST `/api/tutor/conversations/{id}/messages` | sendConversationMessage | `SendAiConversationMessageDTO {message (req., maxLength 4000), currentPageId?}` | `text/event-stream` |
| POST `/api/tutor/pages/{pageId}/deepen` | deepenPage | `DeepenPageDTO {conversationId?, question? (maxLength 1000)}` | `text/event-stream` (lo usa learning) |
| PUT `/api/ai-ratings`, GET `/api/ai-ratings/mine` | upsertAiRating / getMyAiRating | `UpsertAiRatingDTO {targetType: MESSAGE…, targetId, helpful, aiCallId?, comment? ≤2000, Likert 1–5}` | ya cubierto por `@shared/ai-rating` |

- `AiConversationDTO`: `{id, scope, refId: string|null, title, createdAt, updatedAt}`.
- `AiConversationMessageDTO`: `{id, role: USER|ASSISTANT, content, aiCallId: string|null, isIncomplete, createdAt}`.
- `GET /api/me/summary` → `MySummaryDTO.latestConversations` (`MyConversationDTO[]`) sirve para un acceso rápido en el dashboard.

**Formato real del SSE** (`ventylab-server/src/features/ai-tutor/presentation/sse/tutor-sse.ts`):

- `event: delta` / `data: {"text": "…"}` (`:38-39`).
- `event: done` / `data: {"aiCallId","messageId","conversationId"}` (`:44`). **Sin `sources`** ni título.
- `event: error` / `data: {"code","message"}`, solo cuando el fallo ocurre **después** de abrir el stream (`:92-93`). El código es el del `DomainError` (p. ej. `ai.stream_interrupted`) o `ai-tutor.stream_failed` (`ai-tutor.controller.ts:58,287-293`).
- Comentario `: keep-alive` cada 15 s (`:79-83`).
- Se espera el primer evento **antes** de abrir el stream (`:75-77`), así que validación, 403, 404, 429 y 503 llegan como JSON envelope con su status HTTP.
- Al cerrarse la conexión se aborta la llamada a la IA y se guarda la parte recibida con `isIncomplete: true`.

**Rechazo fuera de tema (solo `scope: FREE`, si `topicCheckEnabled !== false`)** (`tutor-turn.service.ts:104-109,172-195`):

- **No hay señal propia.** Responde HTTP 200 con el stream normal: un `delta` con el texto fijo `OFF_TOPIC_REPLY` ("Lo siento, solo puedo ayudarte con temas de ventilación mecánica, fisiología respiratoria y temas clínicos relacionados. ¿Tienes alguna pregunta sobre esos temas?", `topic-guard.ts:11-12`) y luego un `done` con `aiCallId` (llamada registrada como bloqueada), `messageId` y `conversationId`.
- El mensaje se persiste como ASSISTANT con `aiCallId`, de modo que `canRateMessage` lo muestra como calificable.
- La UI solo podría detectarlo comparando el texto, lo cual es frágil. GAP.
- LESSON y MODULE no pasan por el filtro de tema.

**429 por cuota** (`ai.errors.ts:19-34`, `http-exception.filter.ts:259-265`):

- Código `ai.quota_exceeded`, mensaje traducido "Alcanzaste tu límite de uso de IA, intenta de nuevo a partir de {resetAt}" (`resetAt` = `YYYY-MM-DD HH:mm UTC`, medianoche UTC siguiente).
- Cabecera `Retry-After` en segundos, expuesta por CORS (`cors-origins.ts:38-44`). `data: null`: la hora de reinicio solo va en el mensaje y en `Retry-After`.
- El 429 del throttler usa `common.too_many_requests`.
- El front ya resuelve ambos casos: `sse-stream.ts:169-190` y `ai-error-messages.ts:51-54`.

**Tipos generados.** `src/shared/api-client/generated/schema.d.ts` (13-oct 08:41) ya contiene las rutas `/api/tutor/conversations*` (`:6082,6110,6144`) y los DTO Start/Rename. La spec local y la del backend son idénticas (md5 9f84a7ce…), así que **no hace falta regenerar**. Generación: `scripts/generate-api.mjs` copia `../ventylab-server/openapi/openapi.json` → `openapi/openapi.json` y ejecuta openapi-typescript → `schema.d.ts` (solo tipos; las llamadas van por `useApiQuery`/`apiPatch`/`apiDelete`).

## d) Endpoints necesarios que no existen

| Necesidad | Estado |
|---|---|
| Uso o cuota restante del estudiante (consumidas / límite / reinicio) | **FALTA.** Solo se conoce al recibir el 429 (`Retry-After`). `StudentAiUsageDTO` solo aparece en el dashboard docente (`StudentDashboardRowDTO.aiUsage`) y no incluye el límite |
| Búsqueda de conversaciones por título | **FALTA** (no hay `q`/`search`). Alternativa: filtrar la página cargada en el cliente |
| Renombrar | existe (PATCH) |
| Borrar | existe (DELETE) |
| Paginación | existe (`page`, `limit` ≤ 100, `pagination`) |
| Filtro por scope | existe (`scope`) |
| Filtro por `refId` | **FALTA** (learning lo resuelve paginando en el cliente) |
| 404 por propiedad (conversación ajena) | existe (`ai-tutor.conversation_not_found`) |
| `conversationId` antes de `done` | **FALTA.** Si un primer mensaje FREE se detiene o falla tras empezar, no hay id para adoptar. Recuperación: revalidar `GET ?scope=FREE&limit=1` (el más reciente) |
| Señal explícita de "fuera de tema" | **FALTA** (ver sección c) |
| `sources` en `done` | **FALTA** |
| Título devuelto en `done` | **FALTA.** Hay que revalidar la lista y el detalle tras el primer `done` (`buildConversationTitle(firstMessage)` en el backend) |

## e) Markdown y sanitización

- `package.json`: `react-markdown ^10.1.0`, `remark-gfm ^4.0.1`, `remark-math ^6.0.0`, `rehype-katex ^7.0.1`, `katex ^0.16.25`, `dompurify ^3.3.0`. Todos están en `node_modules`. **No hay** `rehype-sanitize`, `marked` ni `isomorphic-dompurify`.
- Salida de IA: se renderiza con `RichContent` y **`skipHtml`** (el HTML crudo se descarta). El `urlTransform` por defecto de react-markdown elimina protocolos inseguros. Los enlaces externos usan `noopener noreferrer` (`markdown-components.tsx`) y KaTeX corre con `trust: false`. No se usa DOMPurify para IA: solo `blocks/html-view.tsx` lo usa, para el `{html}` legado de bloques, también cargado de forma lazy.
- Carga diferida: `rich-content.tsx:20-25`. `React.lazy` + `retryImport` cargan `markdown-view` o `math-markdown-view` solo cuando hacen falta. KaTeX y su CSS se descargan solo si el contenido tiene `$` (`content-format.ts`). Queda así fuera del First Load JS.
- **Recomendación:** `AiMarkdown` envuelve `RichContent`, sin nueva dependencia ni sanitizador adicional.

## f) Checklist de paridad (legado → nuevo)

El legado no es alcanzable, así que esta lista es de referencia de comportamientos, no un requisito estricto.

| # | Comportamiento legado (evidencia) | Dónde queda cubierto |
|---|---|---|
| 1 | Enviar con Enter; Shift+Enter, salto de línea (`AITutorChat.jsx:173-176`) | Composer |
| 2 | Placeholder "La IA está respondiendo…" durante el stream (`:424`) | Composer deshabilitado + TypingIndicator |
| 3 | Scroll automático al final (`:123-129`) | MessageList (nuevo comportamiento a testear) |
| 4 | Respuesta progresiva (stream) (`useAITutor.js`) | useStreamingResponse (SSE backend) |
| 5 | Cancelar stream (`cancelStream`) | "Detener" + abort (el backend guarda el parcial con `isIncomplete`) |
| 6 | Limpiar historial (`clearHistory`) | DELETE de la conversación + "Nueva conversación" |
| 7 | Markdown básico en burbujas (`ChatMessage.jsx:21,210`) / react-markdown + gfm (`TutorAIPopup.jsx:54-55`) | AiMarkdown (RichContent, + KaTeX lazy) |
| 8 | Avatar por rol (`ChatMessage.jsx:295-310`) | MessageBubble |
| 9 | Selector de proveedor/modelo (`setProvider`) | **sin equivalente**: el backend elige el proveedor (no se expone) |
| 10 | Preguntas sugeridas (`SuggestedQuestions.jsx`, `suggestions.ts`) | sugerencias estáticas en el estado vacío (sin endpoint) |
| 11 | Historial solo en memoria | **mejora**: conversaciones persistidas, lista paginada, renombrar y borrar |
| 12 | Gemini directo desde el navegador con clave pública (`GeminiProvider.js:64-69`) | **eliminado**: todo pasa por el backend con cuota, filtro de tema y telemetría |
| 13 | Mensaje "configura una API Key" (`AIServiceManager.js:139`) | 503 `ai.providers_unavailable` → "El tutor no está disponible" |
| 14 | Pestaña "saved" (respuestas guardadas como notas, `TutorAIPopup.jsx:720-754`) | fuera de alcance (notas de learning) |
| 15 | Calificación de respuesta | **nuevo**: `AiRatingWidget` MESSAGE |

## g) Bundle, AppShell, navegación y lint

**Build en disco:** `.next/build-manifest.json` y `BUILD_ID` con fecha 2026-10-15 08:26–08:27. Es una build de producción **anterior a HEAD** (57231b5, 14:15): no incluye `/evaluations*`, `/grading*` ni `/content`… (39 rutas). Método idéntico a `odd/baseline-bundle.md`: `pages[route] + pages['/_app'] + polyfillFiles`, solo `*.js`, gzip con .NET GzipStream Optimal, en KiB.

| Ruta | raw KiB | gzip KiB | Registrado antes |
|---|---|---|---|
| `/_app` | 876,7 | 282,9 | baseline 273 (62c9d68); 282,6 en final-verification |
| `/learn` | 1032,2 | 336,7 | no registrado |
| `/learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber]` | 1032,5 | 336,8 | no registrado |
| `/profile` | 1015,0 | 331,2 | baseline 329; 330,4 en final-verification |

Los paneles Profundizar y Preguntas no suman al First Load porque son chunks lazy. Antes de cerrar la feature conviene **remedir con una build de HEAD** (solo con autorización de la autora; está prohibido `npm run build`/`next build` sin su pedido).

**AppShell:** `src/shared/layouts/app-shell.tsx`.

- Barra superior: `AppBar > Toolbar` (`:176-211`) con orden menú móvil → título `APP_NAME` → `RealtimeIndicator` → avatar y menú de usuario. El lanzador ("Asistente IA") iría entre `RealtimeIndicator` y el avatar.
- `AppShellProps` solo tiene `children` (`:48-50`): no hay slot de acciones. Para que shared no importe la feature, habría que agregar un slot (`headerActions`) o un registro compartido, como el patrón `nav-badges` que alimenta la feature desde `_app`.
- Solo las páginas con `getLayout` (`withStudentLayout`, p. ej. `pages/learn/index.tsx:19`) muestran el AppShell. Las páginas legadas (dashboard, simulador) no tendrían lanzador.

**Navegación:** `src/shared/layouts/nav.config.ts:47-64` (`NAV_ITEMS`). La entrada "Asistente IA" (`/assistant`, `roles: EVERYONE`; el permiso es `ai-tutor:use` con mínimo STUDENT) requiere declarar la ruta en `src/shared/session/routes.config.ts`, porque `nav.config.test.ts` comprueba que cada ítem exista en `ROUTES` y admita esos roles.

**Provider:** el precedente es `pages/_app.js:38,136` (`GradingPendingBadgeSync` importado por ruta directa a un componente lazy de la feature, dentro de `NavBadgeProvider`). `_app` es la raíz de composición; shared no puede importar features.

**Lint y fronteras.** Hay que registrar `ai-chat` y `ai-conversation` en cada lista, en las mismas cuatro configuraciones:

- `package.json:10`: script `lint` con la lista explícita de carpetas y páginas.
- `eslint.config.mjs`:
  - `NEW_SHARED_MODULES` (`:62`), `NEW_FEATURES` (`:63`) y `LEGACY_FREE_FEATURES` (`:68`).
  - `NEW_PAGE_FILES` (`:77-110`, con corchetes escapados `[[]x[]]`).
  - Patrón `feature` `{auth,…,grading}/{api,application,UI}` (`:187`).
  - Reglas `element-types`: shared→shared; feature→shared/feature-index/misma feature; page→shared/feature-index (`:198-210`).
- `vitest.config.ts:15-16` (`NEW_SHARED`, `NEW_FEATURES`).
- `tsconfig.strict.json:18-40` (`include`). Es un archivo protegido por la regla de zonas intocables (`tsconfig*`); requiere el visto bueno explícito de la autora, como en las features anteriores.

**Tests:** Vitest 3 con `environment: "jsdom"`, `vitest.setup.ts` (jest-dom) y Testing Library. **No hay Playwright** (no existe `playwright.config.*` ni carpeta `e2e/`).

## h) Plan archivo por archivo (riesgo)

| Bloque | Archivos | Riesgo |
|---|---|---|
| S1 | `src/shared/ai-conversation/{use-streaming-response.ts, message-list.tsx, message-bubble.tsx, streaming-message.tsx, composer.tsx, typing-indicator.tsx, ai-markdown.tsx, ai-error-messages.ts, ai-conversation.entity.ts, index.ts, UI/*.module.css}` + tests (se mueven los de use-ai-stream y ai-error-messages) | Medio: extracción desde learning |
| S2 | learning: `use-ai-stream.ts` (re-export o eliminación), `tutor-answer.tsx`, `questions-panel.tsx`, `deepen-panel.tsx`, `ai-error-messages.ts`, `tutor.entity.ts` (tipo `TutorStreamRequest`) | **Medio-alto**: toca una feature cerrada con 21 tests de paneles; deben seguir verdes sin cambiar comportamiento |
| Reg | `eslint.config.mjs`, `package.json` (lint), `vitest.config.ts`, `tsconfig.strict.json` | Bajo técnico; `package.json` y `tsconfig*` son zonas protegidas → aprobación de la autora |
| F1 | `src/features/ai-chat/api/{dtos/ai-chat.dto.ts, services/ai-chat.service.ts (list/detail/rename/delete + stream requests FREE), mappers/ai-chat.mapper.ts}` | Bajo |
| F2 | `src/features/ai-chat/application/{entities (conversación, límites 4000/120, detección off-topic por texto fijo, sugerencias), hooks (use-conversations paginado + búsqueda local, use-conversation, use-chat-turn con adopt/refresh y recuperación sin id), components (sidebar de conversaciones, rename/delete con diálogo, estado vacío, aviso de cuota), pages (assistant.page, conversation.page)}`, `UI/*.module.css`, `index.ts` | Medio: flujo de primer mensaje sin id y revalidación de título |
| F3 | Lanzador: `src/shared/layouts/app-shell.tsx` (slot `headerActions` o registro tipo nav-badges) + componente lazy de la feature montado desde `_app` | Medio: layout compartido y `_app` (raíz de composición) |
| N1 | `src/shared/layouts/nav.config.ts` (+ `nav.config.test.ts`), `src/shared/session/routes.config.ts` (`/assistant`, `/assistant/[conversationId]`) | Bajo-medio |
| P1 | `pages/assistant/index.tsx`, `pages/assistant/[conversationId].tsx` (rutas delgadas, `getLayout = withStudentLayout`) | Bajo |
| R1 | Redirecciones: no hay rutas legadas de chat; nada que redirigir (opcional `/chat` → `/assistant`, no recomendado por YAGNI) | — |
| API | Regenerar `api-client`: **no hace falta** (tipos presentes; specs idénticas) | — |
| B1 | Remedir el bundle (`/_app`, `/assistant`, `/learn/...[pageNumber]`) | Requiere build autorizada |
| P2 | Borrar el legado `ensenanza/shared/components/ai/*` y `useAITutor.js` (no alcanzables) | **Solo con aprobación de la autora**; `ai-feedback/services` sigue vivo por el simulador |

Gaps de backend para reportar (no se inventan): uso o cuota del estudiante, búsqueda por título, filtro `refId`, señal off-topic, `conversationId` o título antes de `done`, `sources`.
