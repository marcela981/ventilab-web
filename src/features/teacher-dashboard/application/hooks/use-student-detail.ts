/*
* Funcionalidad: useStudentDetail
* Descripción: Reads the two student reads of /teacher/students/[userId] through useApiQuery, each with its own state: the header (`GET /api/users/students/{id}`: name, email, last access; a teacher only sees students of their groups) and the learning progress summary (`GET /api/progress/users/{userId}/summary`: sections, levels and modules). Depends on React, @shared/api-client and the teacher dashboard mapper and service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toLearningSummary, toStudentHeader } from "../../api/mappers/teacher-dashboard.mapper";
import type { StudentHeader } from "../../api/mappers/teacher-dashboard.mapper";
import { PROGRESS_SUMMARY_PATH, STUDENT_PATH } from "../../api/services/teacher-dashboard.service";
import type { LearningSummary } from "../entities/curriculum-titles.entity";

export type UseStudentDetailResult = {
  student: StudentHeader | null
  studentLoading: boolean
  studentError: ApiError | null
  summary: LearningSummary | null
  summaryLoading: boolean
  summaryError: ApiError | null
  reload: () => Promise<void>
};

export function useStudentDetail(userId: string): UseStudentDetailResult {
  const studentQuery = useApiQuery(STUDENT_PATH, { params: { id: userId } });
  const summaryQuery = useApiQuery(PROGRESS_SUMMARY_PATH, { params: { userId } });
  const student = useMemo(() => (studentQuery.data ? toStudentHeader(studentQuery.data.data) : null), [studentQuery.data]);
  const summary = useMemo(() => (summaryQuery.data ? toLearningSummary(summaryQuery.data.data) : null), [summaryQuery.data]);
  const mutateStudent = studentQuery.mutate;
  const mutateSummary = summaryQuery.mutate;

  const reload = useCallback(async() => {
    await Promise.all([mutateStudent(), mutateSummary()]);
  }, [mutateStudent, mutateSummary]);

  return {
    student,
    studentLoading: studentQuery.isLoading,
    studentError: studentQuery.error ?? null,
    summary,
    summaryLoading: summaryQuery.isLoading,
    summaryError: summaryQuery.error ?? null,
    reload,
  };
}
