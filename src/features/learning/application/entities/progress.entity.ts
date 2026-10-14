/*
* Funcionalidad: Progress entity
* Descripción: Frontend model of the learning progress as the backend computes it (percentage, completed / total lessons, completed); the frontend never recalculates it. Summary and section progress are indexed by id; module progress carries per-lesson page progress (viewedPages / totalPages / completed). Types only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type ProgressValue = {
  percentage: number
  completedLessons: number
  totalLessons: number
  completed: boolean
};

export type LessonProgress = {
  lessonId: string
  viewedPages: number
  totalPages: number
  completed: boolean
};

export type ProgressSummary = {
  overall: ProgressValue
  sections: Map<string, ProgressValue>
  levels: Map<string, ProgressValue>
  modules: Map<string, ProgressValue>
};

export type SectionProgress = {
  overall: ProgressValue
  levels: Map<string, ProgressValue>
};

export type LevelProgress = {
  overall: ProgressValue
  modules: Map<string, ProgressValue>
};

export type ModuleProgress = {
  overall: ProgressValue
  lessons: LessonProgress[]
};
