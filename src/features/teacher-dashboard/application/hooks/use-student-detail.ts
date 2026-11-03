/*
* Funcionalidad: useStudentDetail
* Descripción: Reads the header of /teacher/students/[userId] through useApiQuery, each read with its own state: the profile (`GET /api/users/students/{id}`: name, email, avatar, last access, student code and active groups; 403 `groups.student_out_of_scope` outside the caller's groups, 404 when it does not exist) and the learning progress summary (`GET /api/progress/users/{userId}/summary`), requested in parallel; no read waits for another one. v1.1 (W4 Bloque 4): avatar and directory facts. v1.2 (Bloque 4 integration): the code and groups come with the profile, the dependent directory lookup is gone. Depends on React, @shared/api-client and the teacher dashboard mappers and services.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toStudentProfile } from "../../api/mappers/student-detail.mapper";
import { toLearningSummary } from "../../api/mappers/teacher-dashboard.mapper";
import { PROGRESS_SUMMARY_PATH, STUDENT_PATH } from "../../api/services/teacher-dashboard.service";
import type { LearningSummary } from "../entities/curriculum-titles.entity";
import type { StudentProfile } from "../entities/student-detail.entity";

export type UseStudentDetailResult = {
  student: StudentProfile | null
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
  const student = useMemo(() => (studentQuery.data ? toStudentProfile(studentQuery.data.data) : null), [studentQuery.data]);
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
