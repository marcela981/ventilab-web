/*
* Funcionalidad: useHolderOptions / useUserHolderSearch
* Descripción: Reservation holders the caller may choose, by role, mirroring the backend reservation policy: everyone books for themselves; a STUDENT also for the active student groups they lead (GET /api/groups/mine, memberRole LEADER); a TEACHER for the active student groups of GET /api/groups that the teacher did not create (v1.1, T2 review fix: the list holds the groups the teacher created OR supervises, the backend accepts only supervised ones, and a teacher cannot read whether a created group is also supervised; the backend 403 is still shown); an ADMIN for any active group and any user, searched with useUserHolderSearch (GET /api/users, at least two characters). A failed groups read keeps the caller option and reports the error. Depends on the session, the api-client query hook, the holders service and the create reservation mapper and entities.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { useSession } from "@shared/session/use-session";
import { ledGroupOptions, managedGroupOptions, userHolderOption } from "../../api/mappers/create-reservation.mapper";
import {
  GROUPS_PATH,
  GROUPS_PERMISSION,
  groupsQuery,
  MY_GROUPS_PATH,
  MY_GROUPS_PERMISSION,
  USER_SEARCH_MIN_LENGTH,
  USERS_PATH,
  USERS_PERMISSION,
  usersQuery,
} from "../../api/services/holders.service";
import type { HolderOption } from "../entities/create-reservation.entity";

export type HolderOptions = {
  groups: HolderOption[]
  /** The caller may book for any user (admin). */
  canPickUser: boolean
  isLoading: boolean
  error: ApiError | null
};

export function useHolderOptions(enabled = true): HolderOptions {
  const { role, user, hasPermission } = useSession();
  const isStudent = role === "STUDENT";
  const isStaff = role === "TEACHER" || role === "ADMIN";
  const readLed = enabled && isStudent && hasPermission(MY_GROUPS_PERMISSION);
  const readManaged = enabled && isStaff && hasPermission(GROUPS_PERMISSION);
  const managedQuery = useMemo(() => groupsQuery(role === "TEACHER"), [role]);
  const led = useApiQuery(readLed ? MY_GROUPS_PATH : null);
  const managed = useApiQuery(readManaged ? GROUPS_PATH : null, { query: managedQuery });
  const groups = useMemo(() => {
    if (led.data) {
      return ledGroupOptions(led.data.data);
    }

    return managed.data ? managedGroupOptions(managed.data.data, role === "TEACHER" ? user?.id ?? null : null) : [];
  }, [led.data, managed.data, role, user?.id]);

  return {
    groups,
    canPickUser: role === "ADMIN" && hasPermission(USERS_PERMISSION),
    isLoading: (readLed && !led.data && led.isLoading) || (readManaged && !managed.data && managed.isLoading),
    error: led.error ?? managed.error ?? null,
  };
}

export type UserHolderSearch = {
  options: HolderOption[]
  isLoading: boolean
  error: ApiError | null
};

/** Users matching `term` for an admin; nothing is requested below USER_SEARCH_MIN_LENGTH characters. */
export function useUserHolderSearch(term: string, enabled: boolean): UserHolderSearch {
  const trimmed = term.trim();
  const active = enabled && trimmed.length >= USER_SEARCH_MIN_LENGTH;
  const query = useMemo(() => usersQuery(trimmed), [trimmed]);
  const { data, error, isLoading } = useApiQuery(active ? USERS_PATH : null, { query }, { keepPreviousData: true });
  const options = useMemo(() => (active && data ? data.data.map(userHolderOption) : []), [active, data]);

  return { options, isLoading: active && isLoading, error: active ? error ?? null : null };
}
