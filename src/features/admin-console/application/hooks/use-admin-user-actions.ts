/*
* Funcionalidad: useAdminUserActions
* Descripción: Role change (`PATCH /api/users/{id}/role`) and account status change (`PATCH /api/users/{id}/status`) of /admin/users; after a success every cached users list is revalidated. Errors are rethrown as ApiError so the dialogs show the mapped message (superadmin 403, own account 400). Depends on React, SWR, @shared/api-client and the admin users service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { changeUserRole, changeUserStatus, USERS_PATH } from "../../api/services/admin-users.service";
import type { UserRole } from "../config/admin-console.config";

const AFTER_CHANGE_PATHS = [USERS_PATH] as const;

export type AdminUserActions = {
  changeRole: (userId: string, role: UserRole) => Promise<void>
  changeStatus: (userId: string, isActive: boolean) => Promise<void>
};

export function useAdminUserActions(): AdminUserActions {
  const { mutate } = useSWRConfig();

  const changeRole = useCallback(async(userId: string, role: UserRole) => {
    await changeUserRole(userId, role);
    await invalidateApiQueries(mutate, AFTER_CHANGE_PATHS);
  }, [mutate]);

  const changeStatus = useCallback(async(userId: string, isActive: boolean) => {
    await changeUserStatus(userId, isActive);
    await invalidateApiQueries(mutate, AFTER_CHANGE_PATHS);
  }, [mutate]);

  return { changeRole, changeStatus };
}
