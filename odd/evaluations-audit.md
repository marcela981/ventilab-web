# Fase 1 — Auditoría: evaluations · evaluation-authoring · grading

Fecha: 2026-10-14 · Repo: ventilab-web (master) · Solo lectura.

## Premisas del prompt que NO se cumplen (verificado)

- `content-editor` **todavía no existe**: otra sesión (tesis-62) lo está implementando ahora (C1–C6). El componente de subida de medios saldrá en su tarea C5 (`src/features/content-editor/**`). La promoción a `shared/media-upload` depende de eso.
- La estructura real de las features migradas es `api/{dtos,services,mappers}`, `application/{entities,hooks,components,pages}`, `UI/`, `index.ts`, y no `{components,hooks,services,UI,types}`. Se sigue la estructura real (regla de continuidad).
- No hay "api-client generado" con funciones: `shared/api-client/generated/schema.d.ts` solo tiene tipos (openapi-typescript). Las llamadas pasan por `useApiQuery`, `apiPost`, `apiPatch`, `apiPut` y `apiDelete`.
- La carga diferida se hace con `React.lazy` + `retryImport` + `RouteErrorBoundary` + `Suspense`, no con `next/dynamic`.
- `@hello-pangea/dnd` solo se usa en código legado. Content-editor (C2) será la primera feature nueva que lo use; se usa la misma librería.
- No existe E2E (Playwright) ni scripts `npm run typecheck`/`lint` sobre todo el repo: `typecheck` = `tsc -p tsconfig.strict.json`; `lint` = lista explícita de rutas nuevas.
- Next.js es **16**, no 15.

## a) Implementación legada

| Ruta | Componentes | Rol |
|---|---|---|
| `pages/evaluation/index.js` | `ActivityList.jsx`, `EvaluationCard.jsx`, `usePublicActivities`, `useQuizzes`, `useMySubmissions` | estudiante |
| `pages/evaluation/[activityId].js` | `QuizRenderer`, `TallerRenderer`, `ExamRenderer`, `ResultsScreen`, `SubmissionForm`, `GradeResult`, `SubmissionStatusBadge` | estudiante (vista docente: stub) |
| `pages/evaluation/manage/index.js` | lista inline agrupada por tipo | staff |
| `pages/evaluation/manage/new.js`, `[activityId]/edit.js` | `builder/ActivityBuilder.jsx`, `GroupAssignmentSelector.jsx` | staff |
| `pages/evaluation/grade/index.js` | lista inline | staff |
| `pages/evaluation/grade/[activityId].js` | `grading/GradingDashboard.jsx`, `SubmissionReviewer.jsx` | staff |
| `pages/panel/students/[id].jsx` | `PanelStudentDetail.jsx` (pestañas Evaluaciones y Calificaciones) | teacher (fuera de alcance; usa `/scores`) |

Código muerto: `TeacherEvaluationDashboard.jsx`, `SubmitHandler.jsx`/`QuestionRenderer.jsx`, `student/ActivityCard.jsx`, `EvaluationContext.jsx`, `useEvaluations.ts` (stub).

Endpoints legados (todos del modelo viejo Activity/Quiz/Submission):

- `/evaluation/activities`, `/activities/*`
- `/evaluation/quizzes/*`
- `/activity-submissions/*`
- `/api/activity-assignments` (con `/api` duplicado → `/api/api/...`, bug)
- `/api/groups?myGroups=true` (mismo bug)
- `/cases/*`

Las preguntas legadas viven como JSON dentro de `activity.instructions` y **la nota se calcula en el cliente**. Ningún componente legado usa socket.

## b) Endpoints del openapi.json (copia web = copia server, byte a byte)

**evaluations (estudiante)**

- `GET /api/my-evaluations`: sin filtros ni paginación; trae `state` UPCOMING|ACTIVE|CLOSED, `type`, intentos y `canStart`.
- `GET /api/my-evaluations/grades`.
- `POST /api/my-evaluations/{assignmentId}/attempts`: idempotente, devuelve `created`.
- `GET /api/evaluation-attempts/{attemptId}`: trae `serverNow`, `deadlineAt`, `questions`, `scenarios`, `published`, `grade` y `passed`.
- `PUT /api/evaluation-attempts/{attemptId}/answers/{questionId}`: `selectedOptionIds`, `textAnswer`, `simulationSessionId`.
- `POST /api/evaluation-attempts/{attemptId}/submit`: idempotente.
- `GET /api/evaluation-attempts/{attemptId}/feedback`: 404 hasta que se publica.

**evaluation-authoring**

- Evaluaciones: `GET/POST /api/evaluations` (type, status, search, mine, page, limit); `GET/PATCH/DELETE /api/evaluations/{id}`; `PATCH …/status` (sirve para archivar); `POST …/duplicate`.
- Escenarios, preguntas y opciones: CRUD completo más `PUT …/order` (reordenamiento por lote).
- Asignaciones: `POST/GET /api/evaluations/{id}/assignments`, `PATCH`, `POST …/{assignmentId}/close` ("Cerrar ahora") y `DELETE`.
- `GET /api/clinical-cases?status=PUBLISHED`.
- `GET /api/groups` (grupos gestionados).

**grading**

- `GET /api/evaluation-grading/queue`: solo PENDING_REVIEW; filtros evaluationId, groupId y paginación.
- `GET /api/evaluation-grading/attempts/{attemptId}`: trae `passingGrade`.
- `PUT …/attempts/{attemptId}/answers/{questionId}`: `{manualScore, comment}`. Errores 422: `evaluation.manual_score_invalid` y `evaluation.grade_override_comment_required`.
- `POST …/attempts/{attemptId}/publish`.
- `POST /api/evaluation-grading/publish`: `{evaluationId, groupId?}`, devuelve `{publishedCount}`.
- `GET/POST …/attempts/{attemptId}/feedback(/regenerate)`.
- `GET /api/analytics/evaluations/{evaluationId}/stats`: promedio, mediana, tasa de aprobación, histograma, preguntas y `passingGrade`.

**Socket**

- `evaluation:activated` (sala del grupo).
- `grade:published` (sala del usuario).
- `notification:new` con tipo `FEEDBACK_READY` y data `{evaluationId, attemptId, feedbackId}`.

**Verificado en el backend:** el payload del intento para el estudiante NO incluye `isCorrect`, `explanation` ni `rubric` hasta que se publica (`student-evaluations.mapper.ts:70,178-184,196-197`).

### Faltantes en la API (se reportan, no se inventan)

1. **Hora del servidor:** NO falta. `serverNow` viene en el intento.
2. **Contador de pendientes:** FALTA. Se usa `GET /evaluation-grading/queue?limit=1` → `pagination.total`, que es un endpoint existente.
3. **Nota mínima aprobatoria:** la expone `passingGrade` en `GradingAttemptDTO` y `EvaluationAnalyticsDTO` (setting `evaluation.passingGrade`). Al estudiante no se le expone el umbral, solo `passed`, y la UI usa `passed`. El listado de settings requiere ADMIN.
4. **Estadísticas por pregunta:** existen (`questions[]` en analytics). FALTA el filtro `groupId` en estadísticas.
5. **Resultados por evaluación** (tabla estudiante × nota): FALTA. Ningún endpoint lista intentos o notas por evaluación. La tabla no se puede construir sin inventar; se reporta y la vista muestra estadísticas + publicación masiva.
6. **Comentario del profesor para el estudiante:** FALTA (`StudentQuestionDTO` no tiene `teacherComment`).
7. **Desglose de rúbrica para el estudiante:** FALTA (`practicalScore` solo existe del lado docente).
8. **Introducción de una evaluación:** no hay endpoint propio. Se usa el ítem de `GET /my-evaluations`.
9. **Rúbrica:** en OpenAPI es un `object` sin tipar. El esquema real del backend (`simulation-rubric.ts`) es `{criteria:[{parameter, expectedValue, min?, max?, priority?}], justification?}`. **No existen** pesos, umbrales ni política de asesoría IA para preguntas de evaluación (esos campos son de la rúbrica de casos clínicos). El editor implementa el esquema real.
10. **Errores 422:** `evaluation.not_ready` no trae `issues` en el body, y la validación no da mapa por campo. Se re-consulta `readinessIssues` del detalle para mapear errores a preguntas.
11. **Calificar el intento completo:** no hay endpoint; se califica por respuesta. "Guardar" = guardar cada respuesta modificada. El estado GRADED lo calcula el backend.
12. **Evento de socket propio para feedback:** no existe. Se usa `notification:new` con tipo FEEDBACK_READY, más polling de respaldo.

## c) Checklist de paridad (legado → nuevo)

| # | Comportamiento legado (evidencia) | Dónde queda cubierto |
|---|---|---|
| 1 | Listado agrupado por tipo (`ActivityList.jsx:27-42`) | `/evaluations`: filtro por tipo + pestañas por estado |
| 2 | Skeleton, error con "Reintentar" y vacío (`ActivityList.jsx:118-155`) | listado: LoadingState, ErrorState y EmptyState |
| 3 | Botón "Actualizar" (`index.js:33-37`) | revalidación por socket + reintento |
| 4 | Tarjeta: tipo, descripción, nota al completar (`EvaluationCard.jsx:47-102`) | tarjeta nueva: tipo, título, ventana, duración, intentos y nota publicada |
| 5 | "Ver resultados" vs. "Iniciar" (`EvaluationCard.jsx:108-125`) | tarjeta → introducción → Comenzar/Continuar/Resultado |
| 6 | Bloqueo por intento único, 409 (`[activityId].js:205-273`) | `maxAttempts` + `canStart` de la API |
| 7 | Reintentar envío conservando el payload (`[activityId].js:189-309`) | cola de reintentos del autoguardado + envío idempotente |
| 8 | Encabezado: tipo, puntaje, tiempo (`[activityId].js:385-401`) | introducción |
| 9 | Paginación Anterior/Siguiente y "Paso i de N" (`TallerRenderer.jsx:126-240`) | navegador de preguntas + Anterior/Siguiente |
| 10 | Temporizador mm:ss con colores ≤10/≤5 min y autoenvío en 0 (`ExamRenderer.jsx:33-99`) | temporizador del servidor con avisos a 5 y 1 min + autoenvío |
| 11 | Aviso "N preguntas sin responder" (`ExamRenderer.jsx:190-200`) | diálogo de confirmación de envío |
| 12 | Feedback inmediato en quiz/taller (`QuizRenderer.jsx:144-155`) | resultado inmediato si la API publica (`showResultsImmediately`); ya no se adelanta la respuesta correcta durante el intento (decisión de seguridad del backend) |
| 13 | Pistas en taller (`TallerRenderer.jsx:143-157`) | **sin equivalente en la API nueva** (no hay campo hint) → reportado |
| 14 | Pantalla de resultado: %, aprobado/reprobado, "X de N correctas", pendiente de revisión (`ResultsScreen.jsx:50-82`) | resultado: nota es-CO, `passed`, puntaje por pregunta, "Pendiente de calificación" |
| 15 | Borrador/entrega de texto libre (`SubmissionForm.jsx`) | OPEN_TEXT con autoguardado |
| 16 | Insignias de estado (`SubmissionStatusBadge.jsx`) | insignias IN_PROGRESS/SUBMITTED/PENDING_REVIEW/GRADED |
| 17 | Gestión agrupada por tipo, estado y nº de entregas; Editar/Calificar (`manage/index.js`) | `/evaluations/manage` con filtros y acciones |
| 18 | Constructor: título, descripción, tipo, puntaje, tiempo, fecha (`ActivityBuilder.jsx`) | constructor nuevo (puntaje = suma de puntos; fechas en activaciones) |
| 19 | Asignación por grupo con "visible desde/fecha límite" (`GroupAssignmentSelector.jsx`) | `/evaluations/manage/[id]/assignments` |
| 20 | Guardar borrador / Publicar (`ActivityBuilder.jsx:52-62`) | guardado explícito + estado READY |
| 21 | Calificar: lista de entregas, filtro por grupo, estadísticas simples (`GradingDashboard.jsx`) | `/grading` (cola con filtros) + `/grading/evaluations/[id]` |
| 22 | Puntaje + feedback por entrega (`SubmissionReviewer.jsx`) | calificación por pregunta + comentario |
| 23 | "Reiniciar intento" (`GradingDashboard.jsx:50-55`) | **sin endpoint equivalente** en la API nueva → reportado |
| 24 | Calificaciones manuales en el panel del estudiante (`PanelStudentDetail.jsx`) | fuera de alcance (`/scores`, panel docente) |

## d) Componente de subida de medios

**No existe todavía.** Lo crea content-editor en su tarea C5, dentro de `src/features/content-editor/**`, en la otra sesión. El legado de evaluaciones no tiene subida de archivos.

Plan: cuando C5 esté commiteado,

1. mover el componente, su hook, su servicio y sus estilos a `src/shared/media-upload/` (con `index.ts`);
2. registrar `media-upload` en `NEW_SHARED_MODULES` de eslint, tsconfig.strict, vitest y lint;
3. cambiar los imports de content-editor a `@shared/media-upload`;
4. correr los tests de content-editor sin cambios en su comportamiento.

Va en un commit propio.

## e) Línea base de bundle (gzip, `odd/baseline-bundle.md`, master 62c9d68)

| Ruta | gzip kB |
|---|---|
| /_app | 273 (282,6 después de la plantilla) |
| /evaluation | 306 (315,7 remedido) |
| /evaluation/[activityId] | 313 (331,7) |
| /evaluation/manage | 299 |
| /evaluation/manage/new | 314 |
| /evaluation/manage/[activityId]/edit | 314 |
| /evaluation/grade | 297 |
| /evaluation/grade/[activityId] | 307 (321,0) |

Las rutas nuevas `/evaluations/*`, `/grading/*` y `/evaluations/manage/*` se comparan contra su equivalente legado.

## f) Plan archivo por archivo (riesgo)

| Bloque | Archivos | Riesgo |
|---|---|---|
| S1 | `src/shared/media-upload/**` (movido desde content-editor) + imports de content-editor | Medio: toca una feature ajena (después de C6) |
| S2 | `src/shared/charts/{load-bar-chart.ts,bar-chart.tsx,index.ts}` + UI | Bajo |
| S3 | `src/shared/lib/format.ts` (nota es-CO, fecha America/Bogota) | Bajo |
| S4 | `src/shared/layouts/{nav.config.ts,app-shell.tsx}` (badge opcional), `src/shared/session/routes.config.ts` (rutas nuevas) | Medio: layout compartido |
| E1–E4 | `src/features/evaluations/**` + `pages/evaluations/**` | Medio (temporizador y autoguardado) |
| A1–A5 | `src/features/evaluation-authoring/**` + `pages/evaluations/manage/**` | Medio-alto (constructor, dnd) |
| G1–G4 | `src/features/grading/**` + `pages/grading/**` | Medio |
| R1 | `pages/evaluation/**` → redirecciones a las rutas nuevas | Medio: rutas legadas |
| Reg | `eslint.config.mjs`, `package.json` (script lint), `tsconfig.strict.json`, `vitest.config.ts` | Bajo, pero compartido con la otra sesión |
| P1 | `odd/evaluations-parity.md` | — |
| P2 | Borrado del legado | **solo con aprobación de la autora** |
