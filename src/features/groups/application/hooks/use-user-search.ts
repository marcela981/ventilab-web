/*
* Funcionalidad: useUserSearch
* Descripción: Debounced user search for adding group members: after 300 ms without typing and with at least 2 characters, reads `GET /api/users` with `search`, the platform role the group admits (STUDENT for student groups), active accounts only and a page of 20, maps the users to UserOption and removes the current members. Depends on React, @shared/api-client and the groups mappers, service and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useMemo, useState } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toUserOption } from "../../api/mappers/groups.mapper";
import { USERS_PATH } from "../../api/services/groups.service";
import { excludeMembers } from "../entities/group.entity";
import type { GroupMember, UserOption } from "../entities/group.entity";

export const USER_SEARCH_DEBOUNCE_MS = 300;
export const USER_SEARCH_MIN_LENGTH = 2;
const USER_SEARCH_PAGE_SIZE = 20;

export type UseUserSearchResult = {
  // The debounced term is long enough and a request was (or is being) made.
  active: boolean
  results: UserOption[] | null
  isLoading: boolean
  error: ApiError | null
};

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useUserSearch(
  term: string,
  role: UserOption["role"],
  members: readonly Pick<GroupMember, "userId">[],
): UseUserSearchResult {
  const search = useDebouncedValue(term.trim(), USER_SEARCH_DEBOUNCE_MS);
  const active = search.length >= USER_SEARCH_MIN_LENGTH;
  const { data, error, isLoading } = useApiQuery(active ? USERS_PATH : null, {
    query: { search, role, isActive: true, limit: USER_SEARCH_PAGE_SIZE },
  });
  const results = useMemo(
    () => (active && data ? excludeMembers(data.data.map(toUserOption), members) : null),
    [active, data, members],
  );

  return { active, results, isLoading: active && isLoading, error: active ? error ?? null : null };
}
