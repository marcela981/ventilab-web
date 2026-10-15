/*
* Funcionalidad: learning public API
* Descripción: Public surface of the learning feature for the thin routes under pages/learn (LearnHomePage, SectionPage, ModulePage) and for the next learning tasks (L3 viewer, L7 print): URL builders/parsers, curriculum tree and lesson hooks with the tree locators, LockedContentScreen, LearningBreadcrumb, PreviewNotice, usePreviewMode, the progress hooks, the page-view tracker and the learning error messages. v1.1 (L3): LessonViewerPage, LessonSidePanel (slots for the L4-L6 panels), the lesson navigation rules, PageContent/usePageContent and the module completion URL. v1.2 (L7): ModulePrintPage and withPrintLayout (print view without the app shell, TEACHER/ADMIN guard).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { LearningBreadcrumb } from "./application/components/learning-breadcrumb";
export type { LearningBreadcrumbProps } from "./application/components/learning-breadcrumb";
export { LessonSidePanel } from "./application/components/lesson-side-panel";
export type { LessonSidePanelProps, LessonSidePanelSlots, SidePanelTab } from "./application/components/lesson-side-panel";
export { LockedContentScreen } from "./application/components/locked-content-screen";
export { PrintLayout, withPrintLayout } from "./application/components/print-layout";
export type { LockedContentScreenProps } from "./application/components/locked-content-screen";
export { PreviewNotice } from "./application/components/preview-notice";
export { findContinueTarget } from "./application/entities/continue-target";
export type { ContinueTarget } from "./application/entities/continue-target";
export {
  findNextModule,
  findSection,
  levelPrerequisiteLinks,
  locateLevel,
  locateModule,
  modulePrerequisiteLinks,
} from "./application/entities/curriculum.entity";
export type {
  CurriculumLevel,
  CurriculumModule,
  CurriculumSection,
  CurriculumTree,
  ModuleLocation,
  PrerequisiteLink,
} from "./application/entities/curriculum.entity";
export { getLearningErrorMessage } from "./application/entities/learning-error-messages";
export {
  buildLessonPageUrl,
  buildLevelUrl,
  buildModuleCompletedUrl,
  buildModulePrintUrl,
  buildModuleUrl,
  buildSectionUrl,
  LEARN_HOME_URL,
  MODULE_COMPLETED_PARAM,
  parsePageNumber,
  parseRouteId,
} from "./application/entities/learning-urls";
export type { LessonPage, LessonSummary, PageContent } from "./application/entities/lesson.entity";
export { findNextStep, findPreviousStep, resolvePageRedirect } from "./application/entities/lesson-navigation";
export type { NextStep, PagePosition } from "./application/entities/lesson-navigation";
export type { LessonProgress, ProgressValue } from "./application/entities/progress.entity";
export { useCurriculumTree } from "./application/hooks/use-curriculum-tree";
export { useLessonPages } from "./application/hooks/use-lesson-pages";
export { useModuleLessons } from "./application/hooks/use-module-lessons";
export { usePageContent } from "./application/hooks/use-page-content";
export { PAGE_VIEW_DELAY_MS, usePageViewTracker } from "./application/hooks/use-page-view-tracker";
export type { PageViewTracker } from "./application/hooks/use-page-view-tracker";
export { usePreviewMode } from "./application/hooks/use-preview-mode";
export { useLevelProgress, useModuleProgress, useProgressSummary, useSectionProgress } from "./application/hooks/use-progress";
export { LearnHomePage } from "./application/pages/learn-home.page";
export { LessonViewerPage } from "./application/pages/lesson-viewer.page";
export type { LessonViewerPageProps } from "./application/pages/lesson-viewer.page";
export { ModulePage } from "./application/pages/module.page";
export { ModulePrintPage } from "./application/pages/module-print.page";
export type { ModulePrintPageProps } from "./application/pages/module-print.page";
export type { ModulePageProps } from "./application/pages/module.page";
export { SectionPage } from "./application/pages/section.page";
export type { SectionPageProps } from "./application/pages/section.page";
