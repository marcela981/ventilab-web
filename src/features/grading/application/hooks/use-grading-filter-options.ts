/*
* Funcionalidad: useGradingFilterOptions
* Descripción: Reads the options of the grading queue filters: the READY evaluations the caller can see (`GET /api/evaluations?status=READY`, sorted by title, up to 100, the API maximum), the active student groups they manage (`GET /api/groups?type=STUDENT&isActive=true`; the backend limits a teacher to the groups they created or supervise and gives an admin every group) and, once a group is chosen, its students (`GET /api/groups/{id}` members with the STUDENT role). A failed options request leaves that filter with "Todas"/"Todos" only; the queue itself keeps working. Depends on React, @shared/api-client and the grading mappers, service and entities. v1.1 (closure B2): the student options of the chosen group.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toEvaluationOptions, toGroupOptions, toStudentOptions } from "../../api/mappers/grading.mapper";
import { GRADING_EVALUATIONS_PATH, GRADING_GROUP_DETAIL_PATH, GRADING_GROUPS_PATH } from "../../api/services/grading.service";
import type { FilterOption } from "../entities/grading.entity";

export type UseGradingFilterOptionsResult = {
  evaluations: FilterOption[]
  groups: FilterOption[]
  students: FilterOption[]
};

const EVALUATIONS_QUERY = { status: "READY", sortBy: "title", sortOrder: "asc", page: 1, limit: 100 } as const;
const GROUPS_QUERY = { type: "STUDENT", isActive: "true" } as const;
const NO_PREVIOUS_DATA = { keepPreviousData: false } as const;

export function useGradingFilterOptions(groupId: string | null = null): UseGradingFilterOptionsResult {
  const evaluationsQuery = useApiQuery(GRADING_EVALUATIONS_PATH, { query: EVALUATIONS_QUERY });
  const groupsQuery = useApiQuery(GRADING_GROUPS_PATH, { query: GROUPS_QUERY });
  const groupQuery = useApiQuery(groupId ? GRADING_GROUP_DETAIL_PATH : null, { params: { id: groupId ?? "" } }, NO_PREVIOUS_DATA);
  const evaluationsData = evaluationsQuery.data;
  const groupsData = groupsQuery.data;
  const groupData = groupQuery.data;
  const evaluations = useMemo(() => (evaluationsData ? toEvaluationOptions(evaluationsData.data) : []), [evaluationsData]);
  const groups = useMemo(() => (groupsData ? toGroupOptions(groupsData.data) : []), [groupsData]);
  const students = useMemo(() => (groupData ? toStudentOptions(groupData.data) : []), [groupData]);

  return { evaluations, groups, students };
}
