/*
* Funcionalidad: useRecentStudents
* Descripción: The "Estudiantes recientes" list of the General tab of /teacher: the 5 students with the most recent activity, `GET /api/admin/students?limit=5&sortBy=lastActivity&sortOrder=desc`; a teacher adds `myGroups=true` (only the students of the groups they created or supervise; an empty page when they manage none), an administrator sees every student. A null role (no session yet) sends no request. Depends on React, @shared/api-client, the session entity, the teacher general service, mapper and entities.
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
import type { Role } from "@shared/session/session.entity";
import { toRecentStudents } from "../../api/mappers/teacher-general.mapper";
import { ADMIN_STUDENTS_PATH } from "../../api/services/teacher-general.service";
import { RECENT_STUDENTS_LIMIT } from "../entities/teacher-general.entity";
import type { RecentStudent } from "../entities/teacher-general.entity";

export type UseRecentStudentsResult = {
  students: RecentStudent[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const BASE_QUERY = { page: 1, limit: RECENT_STUDENTS_LIMIT, sortBy: "lastActivity", sortOrder: "desc" } as const;
const ADMIN_OPTIONS = { query: BASE_QUERY } as const;
const TEACHER_OPTIONS = { query: { ...BASE_QUERY, myGroups: "true" } } as const;

export function useRecentStudents(role: Role | null): UseRecentStudentsResult {
  const options = role === "ADMIN" ? ADMIN_OPTIONS : TEACHER_OPTIONS;
  const { data, error, isLoading, mutate } = useApiQuery(role ? ADMIN_STUDENTS_PATH : null, options);
  const students = useMemo(() => (data ? toRecentStudents(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { students, isLoading, error: error ?? null, reload };
}
