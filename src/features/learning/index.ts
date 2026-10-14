/*
* Funcionalidad: learning public API
* Descripción: Public surface of the learning feature for the thin routes under pages/learn (LearnHomePage, SectionPage, ModulePage) and for the next learning tasks (L3 viewer, L7 print): URL builders/parsers, curriculum tree and lesson hooks with the tree locators, LockedContentScreen, LearningBreadcrumb, PreviewNotice, usePreviewMode, the progress hooks, the page-view tracker and the learning error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { LearningBreadcrumb } from "./application/components/learning-breadcrumb";
export type { LearningBreadcrumbProps } from "./application/components/learning-breadcrumb";
export { LockedContentScreen } from "./application/components/locked-content-screen";
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
  buildModulePrintUrl,
  buildModuleUrl,
  buildSectionUrl,
  LEARN_HOME_URL,
  parsePageNumber,
  parseRouteId,
} from "./application/entities/learning-urls";
export type { LessonPage, LessonSummary } from "./application/entities/lesson.entity";
export type { LessonProgress, ProgressValue } from "./application/entities/progress.entity";
export { useCurriculumTree } from "./application/hooks/use-curriculum-tree";
export { useLessonPages } from "./application/hooks/use-lesson-pages";
export { useModuleLessons } from "./application/hooks/use-module-lessons";
export { PAGE_VIEW_DELAY_MS, usePageViewTracker } from "./application/hooks/use-page-view-tracker";
export type { PageViewTracker } from "./application/hooks/use-page-view-tracker";
export { usePreviewMode } from "./application/hooks/use-preview-mode";
export { useLevelProgress, useModuleProgress, useProgressSummary, useSectionProgress } from "./application/hooks/use-progress";
export { LearnHomePage } from "./application/pages/learn-home.page";
export { ModulePage } from "./application/pages/module.page";
export type { ModulePageProps } from "./application/pages/module.page";
export { SectionPage } from "./application/pages/section.page";
export type { SectionPageProps } from "./application/pages/section.page";
