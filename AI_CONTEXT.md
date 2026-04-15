# VentyLab — Contexto para IA

## Descripción del proyecto
Sistema Ciberfísico Educativo para enseñanza de ventilación mecánica.
Tesis de Marcela Mazo Castro — Universidad del Valle.

**Stack:**
- Frontend: Next.js 15 (Pages Router), React 19, Material UI v7, Chart.js, Socket.io-client
- Base de datos: PostgreSQL + Prisma ORM
- Auth: NextAuth v4
- IA: @google/generative-ai (Gemini), Anthropic/OpenAI via proxy

---

## Arquitectura: Modular Fractal

```
src/
  features/
    admin/        — Panel admin/teacher, gestión de grupos y estudiantes
    ai-feedback/  — Retroalimentación con LLM (Gemini)
    auth/         — Guards de autenticación
    dashboard/    — Dashboard por rol (student/teacher/admin)
    ensenanza/    — Módulo principal: curriculum, lecciones, editor
    evaluation/   — Actividades, talleres, exámenes, calificaciones
    profile/      — Perfil de usuario
    progress/     — Seguimiento de progreso, logros, XP
    settings/     — Configuración de usuario
    simulador/    — Simulador de ventilador (WebSocket + modo paciente)
  shared/         — Componentes, contexts, hooks, servicios globales
  styles/         — Variables CSS globales (theme.css, animations.js)
  theme/          — Tema MUI
  i18n/           — Internacionalización (es/en)

pages/            — Rutas Next.js (Pages Router)
contracts/        — Interfaces TypeScript por dominio
lib/              — Prisma client, auth helpers
prisma/           — Schema PostgreSQL
```

### Reglas de arquitectura (OBLIGATORIAS)
1. Estilos: SOLO en archivos `.css` externos dentro de subcarpeta `ui/` de cada módulo. PROHIBIDO `sx={{}}`, `style={{}}`, styled-components.
2. Cada archivo inicia con header de comentario indicando funcionalidad, versión, autor.
3. Principios: SOLID, KISS, YAGNI.

---

## Árbol de archivos completo

```
contracts/
  admin.contracts.ts
  evaluation.contracts.ts
  hooks.contracts.ts
  profile.contracts.ts
  simulator.contracts.ts
  teaching.contracts.ts

lib/
  auth.ts
  db-logger.ts
  prisma.ts

pages/
  _app.js                                  ← Providers: Session, Auth, Socket, Theme, Notification, PatientData
  index.js                                 ← Redirect → /dashboard
  achievements/index.jsx
  admin/search-analytics/index.jsx
  api/
    auth/
      [...nextauth].js                     ← NextAuth handler
      backend-token.js                     ← JWT para backend externo
    curriculum/
      lessons/[lessonId]/
        index.js                           ← GET/PATCH lesson
        sections/
          index.js                         ← GET/PATCH sections
          [sectionIndex].js
          reorder.js
      levels/[levelId].js
      modules/[moduleId].js
  auth/
    access-denied/index.jsx
    error/index.jsx
    forgot-password/index.jsx
    login/index.jsx
    register/index.jsx
  dashboard/index.js
  evaluation/
    index.js                               ← Lista evaluaciones (estudiante)
    [activityId].js                        ← Submission activa
    grade/
      index.js                             ← Dashboard calificaciones (teacher)
      [activityId].js
      UI/grade.module.css
    manage/
      index.js                             ← Gestión actividades (teacher)
      new.js
      [activityId]/edit.js
      UI/manage.module.css
    UI/evaluation.module.css
  flashcards/index.js
  panel/
    index.jsx                              ← Admin dashboard
    admin/index.jsx                        ← Gestión de teachers (admin+)
    settings/index.jsx                     ← Config plataforma (admin+)
    students/
      index.jsx
      [id].jsx
  profile/index.js
  search/index.jsx
  settings/index.js
  simulador/index.js
  teaching/
    index.js
    [moduleId]/[lessonId].js

prisma/
  seed.ts

src/
  config/env.ts
  contracts/
    patient.contracts.ts
    simulator.contracts.ts

  features/

    ── admin/ ─────────────────────────────────────────────────
    components/
      index.js
      panel/
        index.js
        PanelLayout.jsx
        PanelSidebar.jsx
        ProtectedPanelRoute.jsx
        pages/
          PanelAdmin.jsx
          PanelDashboard.jsx
          PanelSettings.jsx
          PanelStudentDetail.jsx
          PanelStudents.jsx
        ui/
          DashboardHero.jsx
          GlassStatCard.jsx
          GroupBuilderModal.jsx
          QuickActionsGrid.jsx
          RecentActivityFeed.jsx
      StudentCard.jsx
      StudentRow.jsx
      StudentsList.jsx
    hooks/
      useUserManagement.js
    services/
      adminService.js
      groupsService.js
      scoresService.js
      studentsService.js
      teachingService.js
    useStudents.ts

    ── ai-feedback/ ────────────────────────────────────────────
    ai.api.ts
    ai.types.ts
    hooks/
      useAIFeedback.js
      useAITutor.js
    services/
      AIServiceManager.js                  ← Singleton multi-proveedor (Gemini→OpenAI→Claude)
      GeminiProvider.js
      aiExpandService.js
      chatService.js
      contextBuilder.ts
      sharedAI.ts
      suggestions.ts
      tutorService.js
      types.ts
      prompts/system.ts
    useAITutor.ts

    ── auth/ ────────────────────────────────────────────────────
    auth.api.ts
    auth.types.ts
    components/
      ProtectedRoute.jsx
      withAuth.jsx

    ── dashboard/ ──────────────────────────────────────────────
    DashboardTab.tsx
    types.ts
    components/
      ActivityFeed.tsx
      AdminDashboard.jsx
      CaseSpotlight.tsx
      CohortPulse.tsx
      DashboardOverviewCard.tsx
      FocusTimer.tsx
      KPIsStrip.tsx
      NotificationsCenter.tsx
      QuickActions.tsx
      RecommendationsCarousel.tsx
      StudentDashboard.jsx
      TasksTodo.tsx
      TeacherDashboard.jsx
      UpcomingSchedule.tsx
      WeeklyPlan.tsx
    hooks/
      useDashboardData.js

    ── ensenanza/ ──────────────────────────────────────────────
    index.ts
    curriculum/
      ensenanzaRespiratoria/modules.js
      ensenanzaVentylab/modules.js
      preRequisitos/modules.js
    shared/
      contexts/TeachingModuleContext.jsx
      components/
        ai/
          AIExpanderChatMessage.jsx
          AIExpanderResults.jsx
          AIExpanderSuggestions.jsx
          AITopicExpander.jsx
          AITutorChat.jsx
          ChatMessage.jsx
          ContentGeneratorPanel.jsx
          SuggestedQuestions.jsx
          TutorAIPopup.jsx
        clinical/
          ClinicalCaseLockedView.jsx
          ClinicalCaseResults.jsx
          ClinicalCaseStep.jsx
          ClinicalCaseViewer.jsx
          DecisionPoint.jsx
          DecisionRenderer.jsx
          ExpertComparison.jsx
          useClinicalCaseScoring.js
        edit/
          BlockInjector/, BlockPill.jsx, DependencyModal/
          DragHandle/, EditableSectionWrapper/
          EditModeContext.jsx, EditModeToggle.jsx
          EmojiPicker/, EstimatedTime/, GhostAccordion/
          GhostCard/, LessonEditBanner/
          NotionCurriculumEditor.jsx
          RichTextEditor/ (Tiptap), TagBadge/
          UnsavedChangesAlert/
        evaluation/
          ReadinessIndicator.jsx
        leccion/
          content/
            ClinicalCase.jsx, InteractiveChecklist.jsx
            InteractiveQuiz.jsx, LessonHeader.jsx
            MarkdownRenderer.jsx, MedicalCodeBlock.jsx
            ModalityComparisonTable.jsx, ParameterTable.jsx
            PersonalNotes.jsx, SectionNavigation.jsx
            StyledTable.jsx, VideoPlayer.jsx
            WaveformVisualization.jsx, ZoomableImage.jsx, ZoomableSVG.jsx
          sections/
            AnalogiesSection.jsx, AssessmentSection.jsx
            CompletionPage.jsx, IntroductionSection.jsx
            KeyPointsSection.jsx, ParameterTablesSection.jsx
            PracticalCaseSection.jsx, ReferencesSection.jsx
            TheorySection.jsx, VisualElementsSection.jsx, WaveformsSection.jsx
          LessonContentRenderers.jsx, LessonErrorState.jsx
          LessonHeader.jsx, LessonIndexNavigator.jsx
          LessonLoadingSkeleton.jsx, LessonNavigation.jsx
          LessonPageRenderer.jsx, LessonProgressBar.tsx
          LessonViewer.jsx, LessonViewerWrapper.jsx
          MediaBlocksContainer.jsx, ModuleCompletionCelebration.jsx
          SaveProgressButton/, TeachingLessonView.jsx
          useLessonViewerState.js, CompletionConfetti.tsx
        media/
          ImageGallery.jsx, InteractiveDiagram.jsx, VideoPlayer.jsx
        modulos/
          CurriculumPanel/, CurriculumSections/
          FlashcardSystem.jsx, LessonCard.jsx
          LessonCard{Body,Footer,Header,Meta}.jsx
          LevelStepper/, Module03CurriculumView/
          ModuleCard/ (Header,Body,Footer,Meta,Tabs,StatusIcons,PrerequisiteTooltip)
          ModuleCardOverlay.jsx, ModuleGrid.jsx
          ModuleInfoPanel.jsx, ModuleLessonNavigator.jsx
          ModuleLessonsList/ (LessonItem, ModuleLessonsList)
        navigation/
          ModuleCategoryNav.jsx
          ModuleNavigationRouter.jsx
        pages/
          LessonViewerRouteAdapter.jsx
          TeachingModule.jsx
          TeachingTabs.jsx
      dashboard/
        components/
          ContinueLearningSection/, DashboardHeader/
          DashboardStats/, FlashcardDashboard/
          Module3ProgressDashboard/, ModuleInfoPanel/
          ProgressOverview/, ProgressTabSkeleton.jsx
          QuickAccessLessons/, ReadinessIndicator/
          SessionStats/
        FlashcardDashboardPage.jsx
      data/
        clinicalCases/index.js
        curriculum/
          index.js, meta.js, modules.generated.js, selectors.js
        curriculumData.js
        helpers/lessonLoader.js
        lessons/mecanica/level03-avanzado/index.js
      hooks/
        useAITutor.js, useChecklistState.js
        useCurriculumProgress.js, useLesson.js
        useLessonAvailability.js, useLessonContent.js
        useLessonNavigation.js, useLessonPages.js
        useLessonProgress.ts, useLevelContent.js
        useLevelsCurriculum.js, useModuleAvailability.js
        useModuleLessonsCount.js, useModuleProgress.js
        useModuleProgress.ts, useProgress.ts
        useProgressTree.js, useQuestionSuggestions.js
        useTeachingModule.js, useTopicContext.js, useUserProgress.js
      progreso/
        components/
          ModuleLessonProgressBar.tsx
          ModuleProgressCard.jsx, ProgressDashboard.jsx
          ProgressTree.jsx
        ProgressTracker.jsx
      services/
        clinicalCasesService.js
        contentGenerator.js
        curriculumService.ts
        notesService.ts
        teachingContentService.js
      utils/
        computeModuleProgress.js

    ── evaluation/ ─────────────────────────────────────────────
    index.ts
    evaluation.api.ts
    evaluation.types.ts
    useEvaluations.ts
    api/
      activity.api.ts
      assignment.api.ts
      submission.api.ts
    components/
      builder/
        ActivityBuilder.jsx
        GroupAssignmentSelector.jsx
      dashboard/
        TeacherEvaluationDashboard.jsx
      grading/
        GradingDashboard.jsx
        SubmissionReviewer.jsx
      student/
        ActivityCard.jsx
        ActivityList.jsx
        GradeResult.jsx
        SubmissionForm.jsx
        SubmissionStatusBadge.jsx
    context/
      EvaluationContext.jsx
    data/
      clinicalCases/index.js
    hooks/
      useActivities.ts
      useActivityBuilder.ts
      useSubmissions.ts
    services/
      evaluation.service.js
      evaluationService.js
    shared/services/
      evaluationService.ts
    UI/
      evaluation.module.css

    ── profile/ ────────────────────────────────────────────────
    profile.api.ts
    profile.types.ts
    useProfile.ts
    components/
      ChangePasswordForm.jsx, EditProfileForm.jsx
      ProfileInfo.jsx, UserStatsPanel.jsx

    ── progress/ ───────────────────────────────────────────────
    AchievementContext.jsx
    LearningProgressContext.jsx
    types.ts
    components/
      AchievementCard.jsx, AchievementNotification.jsx
      AchievementProgress.jsx, Achievements.tsx
      AchievementsDashboard.jsx, AchievementsGallery.jsx
      AchievementsGrid.tsx, BossFightCard.tsx
      CalendarCard.tsx, Challenges.tsx
      ComprehensionPanel.tsx, FeedbackStrip.tsx
      LeaderboardCompact.tsx, Milestones.tsx
      ModuleMilestones.tsx, NarrativeProgress.tsx
      ProgressContent.tsx, ProgressDebugPanel.tsx
      ProgressOverviewCard.tsx, ProgressSyncBadge.jsx
      ProgressTab.tsx, SkillTree.tsx
      StreakCard.tsx, StreakWidget.tsx
      StudyCalendar.tsx, XpLevelCard.tsx
    hooks/
      useAchievementNotifications.js
      useAchievementProgress.js, useAchievements.js
      useLegacyFeatures.js, useOutboxReconciliation.js
      useProgressLoader.js, useProgressPersistence.js
      useProgressUpdater.js, useTokenManager.js
    services/
      http.ts, progressService.js, progressService.ts
      ProgressSource.ts, selectors.js, selectors.ts
    utils/
      analytics.ts, constants.js, legacyProgressHelpers.js
      progressHelpers.js

    ── settings/ ───────────────────────────────────────────────
    settings.api.ts, settings.types.ts, useSettings.ts
    components/LevelSettings.jsx

    ── simulador/ ──────────────────────────────────────────────
    index.ts
    components/RealVentilatorPanel.tsx
    ui/RealVentilatorPanel.module.css
    compartido/
      api/simulator.api.ts
      componentes/
        AIAnalysisButton.jsx, ChangeHistoryPanel.jsx
        ConnectionPanel.tsx, DiffViewer.jsx
        ModeToggle.jsx, ReservationDialog.tsx, ValidatedInput.jsx
      constantes/ventilator-limits.ts
      hooks/
        useDataExport.ts, useDataRecording.js
        useMockData.js, useNotifications.ts, useQRBridge.js
      navegacion/SimuladorTabs.jsx
      tipos/simulator.types.ts
      utils/
        simulatedRealTimeData.js
        ventilatorCalculations.js
    conexion/
      index.ts
      serial/
        componentes/ConnectionTab.jsx, ConnectionTabContent.jsx, WhatsAppTransfer.jsx
        hooks/useSerialConnection.js, useVentilatorData.js
        utils/serialCommunication.js
      websocket/
        hooks/
          useRemoteVentilator.ts
          useVentilatorConnection.ts
          useVentilatorData.ts
        registro/ChartRegistry.ts
    graficas/GraficasTab.jsx
    simuladorPaciente/
      index.ts
      casosClinicos/datos/patientSimulatedData.js
      componentes/PatientSimulatorTab.jsx
      contexto/PatientDataContext.js
      FormularioPaciente/
        index.tsx
        componentes/PatientForm.tsx, PatientForm.styles.ts
        hooks/usePatientForm.ts
      hooks/usePatientData.js, useSimulation.ts
    simuladorVentilador/
      index.ts
      dashboard/
        componentes/
          ChartsColumn.jsx, ControlsColumn.jsx
          EditableCard.jsx, GraphsTab.jsx
          LoopChart.jsx, MetricColumn.jsx
          MonitoringTab.jsx, ParameterInputRow.jsx
          RealTimeCharts.jsx, VentilatorCharts.jsx
          VentilatorDashboard.jsx, VentilatorDashboardWrapper.tsx
          estilos/SimulatorStyles.js
        hooks/useCardConfig.ts, useDashboardState.ts
        utils/cardDataBuilder.js
      graficasMonitor/
        componentes/MonitoringCards.jsx
        hooks/
          useChartCalculations.ts
          useComplianceCalculation.ts
          useSignalProcessing.js
      IAMonitor/
        componentes/AIAnalysisPanel.jsx
        hooks/useAIAnalysis.js
      panelControl/
        componentes/
          ComplianceStatus.jsx, ControlPanel.tsx
          ParameterControls.jsx, ValidationAlerts.jsx
        hooks/
          useErrorDetection.ts, useParameterValidation.js
          useVentilatorControls.ts

  hooks/
    useModuleProgressDirect.js
    useVentilatorData.ts

  i18n/i18n.ts

  lib/
    apiAuth.js, auth-config.js
    curriculumResolver.js, prisma.js, roles.js, swrKeys.ts

  providers/Providers.jsx

  shared/
    components/
      ClientOnly.jsx, ErrorBoundary.jsx, Layout.jsx
      LevelBadge.jsx, Navbar.jsx, ProfileDropdown.jsx
      RoleGuard.jsx, SearchBar.jsx, SearchFilters.jsx
      SearchHistory.jsx, Sidebar.jsx, SidebarUserCard.jsx
      UserProfileButton.jsx
    contexts/
      AuthContext.jsx, NotificationContext.jsx
      SidebarContext.js, SocketContext.tsx, ThemeContext.tsx
    hooks/
      useAnimations.js, useAuth.js, useFetch.ts
      useRole.ts, useScrollCompletion.js
      useSearch.js, useSocket.ts
    services/
      api/http.ts                          ← Axios + interceptors + retry
      authService.js
      http.ts
    types/common.types.ts
    utils/
      debounce.ts, debug.ts, formatters.ts
      highlightText.js, passwordValidator.js
      progressOutbox.js, redirectByRole.js
      requestId.ts, serverAuth.js
      suggestions.es.js, timeFormat.ts, validators.ts

  styles/
    animations.js, chart-theme.js
    curriculum.module.css, mui-overrides.js, theme.css

  telemetry/aiTopicExpander.ts

  theme/
    teachingModuleTheme.js, theme.js, ventilatorTheme.js

  types/progress.d.ts
```

---

## Rutas principales (pages/)

| Ruta | Descripción | Rol |
|------|-------------|-----|
| `/` | Redirect → /dashboard | todos |
| `/auth/login` | Login (NextAuth) | público |
| `/auth/register` | Registro | público |
| `/dashboard` | Dashboard por rol | todos |
| `/simulador` | Simulador ventilador | todos |
| `/teaching` | Lista módulos de enseñanza | todos |
| `/teaching/[moduleId]/[lessonId]` | Lección individual | todos |
| `/evaluation` | Lista evaluaciones | estudiante |
| `/evaluation/[activityId]` | Evaluación activa / submission | estudiante |
| `/evaluation/manage` | Gestión actividades | teacher/admin |
| `/evaluation/manage/new` | Crear actividad | teacher/admin |
| `/evaluation/manage/[activityId]/edit` | Editar actividad | teacher/admin |
| `/evaluation/grade` | Dashboard calificaciones | teacher/admin |
| `/evaluation/grade/[activityId]` | Calificar actividad | teacher/admin |
| `/panel` | Panel admin dashboard | teacher/admin |
| `/panel/admin` | Gestión de teachers | admin+ |
| `/panel/students` | Lista estudiantes | teacher/admin |
| `/panel/students/[id]` | Detalle estudiante | teacher/admin |
| `/panel/settings` | Config plataforma | admin+ |
| `/profile` | Perfil usuario | todos |
| `/achievements` | Logros y XP | todos |
| `/flashcards` | Tarjetas de estudio | todos |
| `/search` | Búsqueda global | todos |
| `/settings` | Configuración | todos |

---

## APIs Next.js (pages/api/)

### Autenticación
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | ALL | NextAuth handler (session, signin, signout, csrf, callback) |
| `/api/auth/backend-token` | GET | JWT para servicios externos |

### Curriculum (requiere rol teacher+)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/curriculum/lessons/[lessonId]` | PATCH | Actualizar título/metadata de lección |
| `/api/curriculum/lessons/[lessonId]/sections` | GET/PATCH | Leer/actualizar secciones |
| `/api/curriculum/lessons/[lessonId]/sections/[sectionIndex]` | PATCH | Actualizar sección específica |
| `/api/curriculum/lessons/[lessonId]/sections/reorder` | POST | Reordenar secciones |
| `/api/curriculum/modules/[moduleId]` | GET | Datos del módulo |
| `/api/curriculum/levels/[levelId]` | GET | Datos del nivel |

---

## APIs backend externo (Express, puerto variable)

El frontend llama al backend externo a través de `src/shared/services/api/http.ts`.
Base URL: `NEXT_PUBLIC_API_URL` (env var).

### Evaluation
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/evaluation/activities` | GET | Listar actividades |
| `/api/evaluation/activities` | POST | Crear actividad |
| `/api/evaluation/activities/:id` | GET | Obtener actividad |
| `/api/evaluation/activities/:id` | PUT | Actualizar actividad |
| `/api/evaluation/activities/:id` | DELETE | Eliminar actividad |
| `/api/evaluation/activities/:id/publish` | POST | Publicar actividad |
| `/api/evaluation/activities/:id/submissions` | GET | Listar submissions de actividad |
| `/api/activity-submissions/my` | GET | Mis submissions (estudiante) |
| `/api/activity-submissions/:id` | GET | Obtener submission |
| `/api/activity-submissions` | POST | Crear/obtener submission |
| `/api/activity-submissions/:id` | PUT | Guardar borrador |
| `/api/activity-submissions/:id/submit` | POST | Enviar submission |
| `/api/activity-submissions/:id/grade` | PUT | Calificar submission |
| `/api/activity-assignments` | GET | Listar asignaciones (by activityId) |
| `/api/activity-assignments` | POST | Crear/actualizar asignación |
| `/api/activity-assignments/:id` | DELETE | Eliminar asignación |

### Simulator
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/simulation/reserve` | POST | Reservar ventilador físico |
| `/api/simulation/session` | POST | Crear sesión de simulación |
| `/api/simulation/session/save` | POST | Guardar datos de sesión |
| `/api/simulation/command` | POST | Enviar comando al ventilador |
| `/api/simulation/status` | GET | Estado del ventilador |
| `/api/simulation/sessions` | GET | Listar sesiones guardadas |

---

## Módulo de Enseñanza (`src/features/ensenanza/`)

### Currículum (3 módulos)
- `preRequisitos` — Fundamentos previos
- `ensenanzaRespiratoria` — Fisiología y mecánica respiratoria
- `ensenanzaVentylab` — Ventilación mecánica avanzada

### Estructura de una lección
Secciones renderizadas por `LessonPageRenderer`:
`Introduction → Theory → VisualElements → KeyPoints → ParameterTables → Analogies → PracticalCase → Assessment → References → Completion`

### Componentes de contenido interactivo
- `InteractiveQuiz` — Quiz con corrección inmediata
- `InteractiveChecklist` — Lista de verificación con persistencia
- `WaveformVisualization` — Ondas de presión/flujo/volumen (Chart.js)
- `ParameterTable` — Tabla de parámetros clínicos
- `ModalityComparisonTable` — Comparación de modos ventilatorios
- `ClinicalCaseViewer` — Caso clínico con puntos de decisión
- `ZoomableImage / ZoomableSVG` — Imágenes con zoom
- `MarkdownRenderer` — Contenido con MDX
- `MedicalCodeBlock` — Bloques de código médico
- `PersonalNotes` — Notas personales del estudiante

### AI en enseñanza
- `AITutorChat` — Chat con tutor IA contextual a la lección
- `AITopicExpander` — Expande cualquier tema con Gemini
- `ContentGeneratorPanel` — Genera contenido de lección (teacher)
- `TutorAIPopup` — Popup flotante de ayuda IA
- `SuggestedQuestions` — Preguntas sugeridas por IA

### Hooks principales
| Hook | Descripción |
|------|-------------|
| `useLesson(moduleId, lessonId)` | Carga lección desde curriculum data |
| `useLessonProgress` | Guarda/carga progreso de lección en BD |
| `useCurriculumProgress` | Progreso global del curriculum |
| `useModuleAvailability` | Prerrequisitos de módulo cumplidos |
| `useLessonAvailability` | Prerrequisitos de lección cumplidos |
| `useAITutor` | Estado del chat con tutor IA |

---

## Módulo de Evaluación (`src/features/evaluation/`)

### Tipos
```typescript
ActivityType = 'EXAM' | 'QUIZ' | 'WORKSHOP' | 'TALLER'
SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'GRADED' | 'LATE'

Activity {
  id, title, description, instructions
  type: ActivityType
  maxScore: number
  timeLimit?: number     // ms
  dueDate?: string       // ISO
  isPublished, isActive
  createdBy: string      // userId
  assignments?: ActivityAssignment[]
  submissions?: ActivitySubmission[]
}

ActivitySubmission {
  id, activityId, userId, groupId
  status: SubmissionStatus
  content: unknown       // JSON libre
  submittedAt?, score?, maxScore?, feedback?
  gradedBy?, gradedAt?
}

ActivityAssignment {
  id, activityId, groupId, assignedBy
  visibleFrom?, dueDate?, isActive
}
```

### Flujo estudiante
1. `/evaluation` → `ActivityList` → lista actividades asignadas a mi grupo
2. Click en actividad → `/evaluation/[activityId]`
3. `submissionApi.getOrCreateForActivity(activityId)` → obtiene o crea submission
4. `SubmissionForm` → `saveDraft` periódico → `submit` al finalizar
5. Ver resultado en `GradeResult`

### Flujo teacher
1. `/evaluation/manage` → `TeacherEvaluationDashboard` → CRUD de actividades
2. `ActivityBuilder` → crear/editar actividad con `GroupAssignmentSelector`
3. `activityApi.publish(id)` → publicar
4. `/evaluation/grade/[activityId]` → `GradingDashboard` → `SubmissionReviewer` → calificar

---

## Módulo Simulador (`src/features/simulador/`)

### Dos modos
| Modo | Descripción |
|------|-------------|
| **Ventilador Real** | Conecta al hardware físico vía WebSocket (Socket.io). Requiere reserva previa. |
| **Simulador Paciente** | Genera datos simulados a partir de parámetros del paciente ingresados en `PatientForm`. |

### Tipos principales
```typescript
VentilatorData {
  pressure, flow, volume   // cmH₂O, L/min, mL
  fio2, volumen, qMax, peep
  frecuencia, presionMax
}

ControlPanelState {
  mode: 'VCV' | 'PCV' | 'SIMV' | 'PSV'
  tidalVolume, respiratoryRate, peep
  fio2, pressureLimit, inspiratoryTime
}

DetectedError {
  type: 'PIP_ERROR' | 'PEEP_ERROR' | 'VOLUME_ERROR' | 'FLOW_ERROR' | 'COMPLIANCE_WARNING'
  message, severity: 'high' | 'medium'
  suggestedAdjustment?: number
}

ComplianceResult {
  compliance: number       // mL/cmH₂O
  calculationStatus
  debug: { cycleCount, sampleCount, pipArray, peepArray, volumeArray }
}
```

### Socket.io — Eventos de ventilador
| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `ventilator:data` | server→client | Waveforms en tiempo real (30–60 Hz) |
| `ventilator:alarm` | server→client | Alarma disparada |
| `ventilator:status` | server→client | Estado de conexión/reserva |
| `ventilator:reserved` | server→client | Reserva confirmada |
| `ventilator:released` | server→client | Reserva liberada |

> **Nota:** No hay MQTT en el frontend. Todo el tiempo real es Socket.io.
> El hardware físico puede usar MQTT internamente en el backend (ESP32/Arduino),
> pero el frontend solo se comunica vía WebSocket con el servidor Node.

### Hooks de conexión
| Hook | Descripción |
|------|-------------|
| `useVentilatorConnection` | Gestiona ciclo de vida de WebSocket (connect/reserve/release/disconnect) |
| `useRemoteVentilator` | Orquesta flujo completo de ventilador real |
| `useVentilatorData` | Colecta y procesa datos en tiempo real |
| `useSerialConnection` | Conexión serial legacy (USB directo) |

### Panel de control clínico
- `ControlPanel` — UI principal de parámetros
- `ParameterControls` — Controles individuales con validación de rangos seguros (`ventilator-limits.ts`)
- `ValidationAlerts` — Alertas de parámetros fuera de rango
- `ComplianceStatus` — Indicador de compliance pulmonar calculado
- `useErrorDetection` — Detecta errores automáticos en tiempo real

### IA en simulador
- `AIAnalysisPanel` — Análisis de configuración del ventilador con Gemini
- `useAIAnalysis` — Hook que llama a `AIServiceManager.analyzeVentilatorConfiguration()`

---

## Panel Admin (`src/features/admin/`)

### Estructura de páginas
| Ruta | Componente | Roles |
|------|-----------|-------|
| `/panel` | `PanelDashboard` | teacher, admin, superuser |
| `/panel/students` | `PanelStudents` | teacher, admin, superuser |
| `/panel/students/[id]` | `PanelStudentDetail` | teacher, admin, superuser |
| `/panel/admin` | `PanelAdmin` | admin, superuser |
| `/panel/settings` | `PanelSettings` | admin, superuser |

### Sidebar del panel (`PanelSidebar.jsx`)
```
Dashboard              → /panel
Estudiantes            → /panel/students
[Admin+] Profesores    → /panel/admin
[Admin+] Configuración → /panel/settings
──────────────────────
Volver al LMS          → /simulador
```

Badges de rol en sidebar:
- `SUPERUSER` → color error (rojo)
- `ADMIN` → color warning (amarillo)
- `TEACHER` → color info (azul)

### Servicios
- `adminService.js` → `getStudents(opts)`, `getStudentProgress(id)`, `getTeachers(search)`
- `studentsService.js` → `getTeacherStudents(teacherId)`, `getStudentProgress(studentId)`
- `groupsService.js` → gestión de grupos/cohortes
- `scoresService.js` → agregación de calificaciones

---

## Sidebar global (`src/shared/components/Sidebar.jsx`)

Visible en todas las páginas excepto: auth pages + `/panel/*` (que tiene su propio sidebar).

```
Simulador Virtual        → /simulador
Módulo de Enseñanza      → /teaching
Evaluación               → /evaluation
Configuración            → /settings
[Teacher+] Panel Admin   → /panel
```

- Collapsed: 64px (solo íconos)
- Expanded: 240px (íconos + labels)
- Estado gestionado por `SidebarContext`

---

## IA / LLM (`src/features/ai-feedback/`)

### Proveedor principal: Google Gemini
- API Key: `NEXT_PUBLIC_GEMINI_API_KEY`
- Modelo default: `gemini-2.0-flash`
- Temperatura: 0.7 · Max tokens: 2048 · Timeout: 30s · Retries: 3

### AIServiceManager — Arquitectura
- Singleton, lazy-init (solo client-side)
- Cadena de fallback: `Gemini → OpenAI → Claude`
- Rate limiting por proveedor:
  - Gemini: 60 req/min
  - OpenAI: 50 req/min
  - Claude: 40 req/min

### Métodos clave
```javascript
AIServiceManager.generateResponse(prompt, options)
  // → { success, response, provider, fallbackUsed }

AIServiceManager.analyzeVentilatorConfiguration(
  userConfig, optimalConfig, ventilationMode, patientData
)
  // → Análisis de configuración con recomendaciones de seguridad

AIServiceManager.getProviderStats()
  // → { currentProvider, globalStats, providerStats, rateLimits }
```

### API client (`ai.api.ts`)
```typescript
aiApi.askQuestion(question: string, context?: string)
aiApi.getFeedback(answer: string, expectedAnswer?: string)
```

### Usos en la app
| Componente | Uso |
|-----------|-----|
| `AITutorChat` | Chat contextual durante lectura de lección |
| `AITopicExpander` | Expande cualquier fragmento de texto en detalle |
| `ContentGeneratorPanel` | Genera secciones de lección para teachers |
| `AIAnalysisPanel` (simulador) | Analiza configuración del ventilador |
| `TutorAIPopup` | Popup de ayuda flotante |

---

## Contextos globales (`src/shared/contexts/`)

| Contexto | Archivo | Descripción |
|---------|---------|-------------|
| `AuthContext` | `AuthContext.jsx` | Usuario actual, rol, sesión NextAuth |
| `SocketContext` | `SocketContext.tsx` | Instancia Socket.io, estado de conexión |
| `NotificationContext` | `NotificationContext.jsx` | Snackbars/alertas globales |
| `SidebarContext` | `SidebarContext.js` | Estado collapsed/expanded del sidebar |
| `ThemeContext` | `ThemeContext.tsx` | Modo dark/light |
| `PatientDataContext` | (en simuladorPaciente) | Datos del paciente para simulación |
| `EvaluationContext` | (en evaluation) | Estado global de evaluaciones |
| `TeachingModuleContext` | (en ensenanza) | Estado del módulo de enseñanza activo |

---

## Modelos de base de datos (Prisma)

Entidades principales:
- `User` — roles: `STUDENT`, `TEACHER`, `ADMIN`, `SUPERUSER`
- `TeacherStudent` — relación teacher↔student
- `EvaluationAttempt`, `QuizAttempt` — intentos de evaluación
- `Achievement` — logros
- `UserProgress`, `LessonCompletion` — progreso en curriculum
- `Page`, `ContentOverride` — contenido editable del curriculum

---

## Roles (`src/lib/roles.js`)

```javascript
ROLES = {
  STUDENT:    'student',
  TEACHER:    'teacher',
  ADMIN:      'admin',
  SUPERUSER:  'superuser',
}
```

Protección de rutas via `RoleGuard`, `ProtectedRoute`, `withAuth`, `ProtectedPanelRoute`.

---

## Variables de entorno requeridas

```env
NEXT_PUBLIC_GEMINI_API_KEY     # Google Gemini API key
NEXT_PUBLIC_BACKEND_URL        # URL backend Socket.io
NEXT_PUBLIC_API_URL            # URL base para llamadas REST al backend externo
NEXTAUTH_SECRET                # Secret para JWT de NextAuth
NEXTAUTH_URL                   # URL pública del frontend (para callbacks)
DATABASE_URL                   # PostgreSQL connection string
```

---

## Dependencias clave

```json
{
  "next": "^16.1.1",
  "react": "^19.0.0",
  "@mui/material": "^7.1.1",
  "next-auth": "^4.24.13",
  "@prisma/client": "^6.19.2",
  "socket.io-client": "^4.8.3",
  "chart.js": "^4.4.9",
  "@tiptap/react": "^3.22.2",
  "@google/generative-ai": "^0.24.1",
  "zustand": "^5.0.5",
  "swr": "^2.3.8",
  "zod": "^3.25.76"
}
```

---

## Problemas conocidos

- 272 archivos usan `sx={{}}` (violación de regla de estilos) — pendiente migrar a CSS modules
- Prisma generate falla con EPERM en Windows si hay proceso node bloqueando el `.dll` — usar `scripts/prisma-generate-safe.js`
- Build debe ejecutarse desde PowerShell (no Git Bash) en Windows
