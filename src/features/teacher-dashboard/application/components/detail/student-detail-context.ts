/*
* Funcionalidad: StudentDetailContext
* Descripción: Context of the tab panels of /teacher/students/[userId]: the panels are lazy components without props (shared KeptMountedTabPanels), so the page provides the student id, the curriculum titles and the progress summary it already read for the header (the Módulos panel renders them without a request of its own). useStudentDetailContext throws outside the provider. Depends on React, the teacher dashboard ApiError type and the curriculum titles entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useContext } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import type { CurriculumTitles, LearningSummary } from "../../entities/curriculum-titles.entity";

export type StudentDetailContextValue = {
  userId: string
  titles: CurriculumTitles
  summary: LearningSummary | null
  summaryLoading: boolean
  summaryError: ApiError | null
};

export const StudentDetailContext = createContext<StudentDetailContextValue | null>(null);

export function useStudentDetailContext(): StudentDetailContextValue {
  const value = useContext(StudentDetailContext);

  if (!value) {
    throw new Error("useStudentDetailContext must be used inside StudentDetailContext.Provider");
  }

  return value;
}
