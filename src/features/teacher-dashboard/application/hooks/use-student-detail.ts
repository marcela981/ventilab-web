/*
* Funcionalidad: useStudentDetail
* Descripción: Reads the header of /teacher/students/[userId] through useApiQuery, each read with its own state: the profile (`GET /api/users/students/{id}`: name, email, avatar, last access; 403 `groups.student_out_of_scope` outside the caller's groups, 404 when it does not exist) and the learning progress summary (`GET /api/progress/users/{userId}/summary`), requested in parallel; then the directory facts (student code and active groups) from the directory row of the student (`GET /api/admin/students?search=<email>`, matched by id), the only read that waits for another one because the student endpoint carries neither the code nor the groups. v1.1 (W4 Bloque 4): avatar and directory facts. Depends on React, @shared/api-client and the teacher dashboard mappers and services.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toStudentDirectoryFacts, toStudentProfile } from "../../api/mappers/student-detail.mapper";
import { toLearningSummary } from "../../api/mappers/teacher-dashboard.mapper";
import { DIRECTORY_STUDENTS_PATH } from "../../api/services/student-detail.service";
import { PROGRESS_SUMMARY_PATH, STUDENT_PATH } from "../../api/services/teacher-dashboard.service";
import type { LearningSummary } from "../entities/curriculum-titles.entity";
import type { StudentDirectoryFacts, StudentProfile } from "../entities/student-detail.entity";

/** The search matches substrings of the email: a page wide enough to hold the exact row. */
export const DIRECTORY_LOOKUP_LIMIT = 100;

export type UseStudentDetailResult = {
  student: StudentProfile | null
  studentLoading: boolean
  studentError: ApiError | null
  summary: LearningSummary | null
  summaryLoading: boolean
  summaryError: ApiError | null
  /** null while loading, on error or when the directory holds no row of the student. */
  directory: StudentDirectoryFacts | null
  reload: () => Promise<void>
};

export function useStudentDetail(userId: string): UseStudentDetailResult {
  const studentQuery = useApiQuery(STUDENT_PATH, { params: { id: userId } });
  const summaryQuery = useApiQuery(PROGRESS_SUMMARY_PATH, { params: { userId } });
  const email = studentQuery.data?.data.email ?? null;
  const directoryQuery = useApiQuery(
    email ? DIRECTORY_STUDENTS_PATH : null,
    { query: { search: email ?? "", limit: DIRECTORY_LOOKUP_LIMIT } },
  );
  const student = useMemo(() => (studentQuery.data ? toStudentProfile(studentQuery.data.data) : null), [studentQuery.data]);
  const summary = useMemo(() => (summaryQuery.data ? toLearningSummary(summaryQuery.data.data) : null), [summaryQuery.data]);
  const directory = useMemo(
    () => (directoryQuery.data ? toStudentDirectoryFacts(directoryQuery.data.data, userId) : null),
    [directoryQuery.data, userId],
  );
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
    directory,
    reload,
  };
}
