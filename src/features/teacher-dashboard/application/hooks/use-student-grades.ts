/*
* Funcionalidad: useStudentGrades
* Descripción: Reads the published grades of one student for staff (`GET /api/evaluation-grading/students/{userId}/grades`: attempt, evaluation, module, grade, pass flag and publication date; admins see every grade, a teacher only the grades of their grading scope, 403 when the student is in none of their groups) through useApiQuery and maps them to StudentGrade rows. Depends on React, @shared/api-client and the teacher dashboard mapper, service and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toStudentGrades } from "../../api/mappers/teacher-dashboard.mapper";
import { STUDENT_GRADES_PATH } from "../../api/services/teacher-dashboard.service";
import type { StudentGrade } from "../entities/teacher-dashboard.entity";

export type UseStudentGradesResult = {
  grades: StudentGrade[] | null
  isLoading: boolean
  error: ApiError | null
};

export function useStudentGrades(userId: string): UseStudentGradesResult {
  const { data, error, isLoading } = useApiQuery(STUDENT_GRADES_PATH, { params: { userId } });
  const grades = useMemo(() => (data ? toStudentGrades(data.data) : null), [data]);

  return { grades, isLoading, error: error ?? null };
}
