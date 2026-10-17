/*
* Funcionalidad: useMyGrades
* Descripción: Reads the caller's published grades (`GET /api/my-evaluations/grades`, full list without pagination) through useApiQuery and maps them to MyGrade entities. Depends on React, @shared/api-client and the student space mapper and service.
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
import { toMyGrades } from "../../api/mappers/my-grades.mapper";
import { MY_GRADES_PATH } from "../../api/services/student-space.service";
import type { MyGrade } from "../entities/my-grade.entity";

export type UseMyGradesResult = {
  grades: MyGrade[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useMyGrades(): UseMyGradesResult {
  const { data, error, isLoading, mutate } = useApiQuery(MY_GRADES_PATH);
  const grades = useMemo(() => (data ? toMyGrades(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { grades, isLoading, error: error ?? null, reload };
}
