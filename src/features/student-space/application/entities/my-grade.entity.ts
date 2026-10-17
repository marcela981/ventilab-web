/*
* Funcionalidad: My grade entity
* Descripción: One published grade of the caller (`GET /api/my-evaluations/grades`): evaluation, module, type, attempt, grade on the 0.0–5.0 scale, points and the `passed` flag exactly as the API returns them. The type and module filters only select rows of the full, unpaginated list the endpoint returns (display filtering; no grade, average or statistic is computed on the client). The module options are the distinct modules of the returned grades (by title), plus "without module" when a grade has none. No dependencies. v1.1 (B2 closure): grades carry moduleId and moduleTitle, with the module options and the module filter.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type EvaluationType = "EXAM" | "QUIZ" | "WORKSHOP";

export type MyGrade = {
  attemptId: string
  attemptNumber: number
  evaluationId: string
  evaluationTitle: string
  evaluationType: EvaluationType
  moduleId: string | null
  moduleTitle: string | null
  grade: number
  passed: boolean
  publishedAt: string
  score: number | null
  maxScore: number | null
};

export type GradeTypeFilter = EvaluationType | "ALL";

export const GRADE_TYPE_FILTERS: readonly GradeTypeFilter[] = ["ALL", "EXAM", "QUIZ", "WORKSHOP"];

/** "ALL", NO_MODULE (grades without module) or a module id. */
export type GradeModuleFilter = string;

export const ALL_MODULES = "ALL";
export const NO_MODULE = "NONE";

export type GradeModuleOption = {
  id: string
  title: string
};

export type GradeFilters = {
  type: GradeTypeFilter
  module: GradeModuleFilter
};

/** Distinct modules of the grades, sorted by title (Spanish collation); grades without module are not listed here. */
export function listGradeModules(grades: readonly MyGrade[]): GradeModuleOption[] {
  const modules = new Map<string, string>();

  for (const grade of grades) {
    if (grade.moduleId !== null && !modules.has(grade.moduleId)) {
      modules.set(grade.moduleId, grade.moduleTitle ?? grade.moduleId);
    }
  }

  return [...modules].map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title, "es"));
}

export function hasGradesWithoutModule(grades: readonly MyGrade[]): boolean {
  return grades.some((grade) => grade.moduleId === null);
}

function matchesModule(grade: MyGrade, moduleFilter: GradeModuleFilter): boolean {
  if (moduleFilter === ALL_MODULES) {
    return true;
  }

  return moduleFilter === NO_MODULE ? grade.moduleId === null : grade.moduleId === moduleFilter;
}

export function filterGrades(grades: readonly MyGrade[], { type, module: moduleFilter }: GradeFilters): MyGrade[] {
  return grades.filter((grade) => (type === "ALL" || grade.evaluationType === type) && matchesModule(grade, moduleFilter));
}

export function filterGradesByType(grades: readonly MyGrade[], type: GradeTypeFilter): MyGrade[] {
  return filterGrades(grades, { type, module: ALL_MODULES });
}
