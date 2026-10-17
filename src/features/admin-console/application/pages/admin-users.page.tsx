/*
* Funcionalidad: AdminUsersPage
* Descripción: Page /admin/users (ADMIN): paginated users of `GET /api/users` with search (name, email or exact id; the API has no student code), role, group (`GET /api/groups`) and account status filters, all kept in the URL (?page&search&role&groupId&isActive, shareable). "Cambiar rol" opens the role dialog with the warning of its effects (`PATCH /api/users/{id}/role`); "Desactivar"/"Activar" asks for confirmation (`PATCH /api/users/{id}/status`). A backend 403 on a superadmin shows "Esta cuenta está protegida (superadministrador) y no se puede modificar." in the dialog or as a toast; the admin's own row is disabled because the backend refuses changes to one's own account. Depends on MUI, next/head, next/router, React, the design-system components, the session, the admin console hooks, components, entities and CSS Module. v1.1 (O4a review): a new filter or page never shows the previous rows (no keepPreviousData, loading state instead); an error is shown whenever the request fails; a page beyond the last one (old URL) is moved to the last page.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import Button from "@mui/material/Button";
import TablePagination from "@mui/material/TablePagination";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import { RoleChangeDialog } from "../components/role-change-dialog";
import { UsersFilters } from "../components/users-filters";
import { UsersTable } from "../components/users-table";
import { ROLE_LABELS } from "../config/admin-console.config";
import type { UserRole } from "../config/admin-console.config";
import { getAdminConsoleErrorMessage } from "../entities/admin-console-error-messages";
import { hasUserFilters, NO_USER_FILTERS, readUserFilters, toUserFiltersQuery } from "../entities/admin-users.entity";
import type { AdminUserFilters, AdminUserRow } from "../entities/admin-users.entity";
import { useAdminGroups } from "../hooks/use-admin-groups";
import { useAdminUserActions } from "../hooks/use-admin-user-actions";
import { useAdminUsers } from "../hooks/use-admin-users";
import styles from "../../UI/admin-users.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const ADMIN_USERS_COPY = {
  documentTitle: "Usuarios | VentyLab",
  title: "Usuarios",
  subtitle: "Busca cuentas, cambia su rol y activa o desactiva su acceso.",
  searchNote: "La búsqueda cubre nombre, correo e ID: la API no tiene un código de estudiante.",
  loading: "Cargando usuarios…",
  loadErrorTitle: "No se pudieron cargar los usuarios",
  emptyTitle: "No hay usuarios",
  noMatchTitle: "Ningún usuario coincide con los filtros",
  noMatchDescription: "Cambia la búsqueda, el rol, el grupo o el estado.",
  clearFilters: "Limpiar filtros",
  rowsPerPage: "Filas por página:",
  deactivateTitle: (name: string) => `¿Desactivar la cuenta de ${name}?`,
  deactivateDescription: "No podrá iniciar sesión y se cerrarán sus sesiones abiertas. Puedes volver a activarla después.",
  deactivate: "Desactivar",
  activateTitle: (name: string) => `¿Activar la cuenta de ${name}?`,
  activateDescription: "Podrá volver a iniciar sesión con su rol actual.",
  activate: "Activar",
  cancel: "Cancelar",
  roleChanged: (name: string, role: string) => `${name} ahora tiene el rol ${role}.`,
  deactivated: (name: string) => `La cuenta de ${name} se desactivó.`,
  activated: (name: string) => `La cuenta de ${name} se activó.`,
} as const;

const PAGE_BUTTON_LABELS: Record<"first" | "last" | "next" | "previous", string> = {
  first: "Primera página",
  last: "Última página",
  next: "Página siguiente",
  previous: "Página anterior",
};

function nameOf(row: AdminUserRow): string {
  return row.name?.trim() || row.email;
}

export function AdminUsersPage() {
  const router = useRouter();
  const toast = useToast();
  const { user: sessionUser } = useSession();
  const filters = readUserFilters(router.query);
  const users = useAdminUsers(filters, router.isReady);
  const { groups, error: groupsError } = useAdminGroups();
  const actions = useAdminUserActions();
  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminUserRow | null>(null);
  const [statusPending, setStatusPending] = useState(false);
  const filtered = hasUserFilters(filters);
  const { rows, pagination } = users;

  const setFilters = (next: AdminUserFilters) => {
    void router.replace({ pathname: router.pathname, query: toUserFiltersQuery(next) }, undefined, { shallow: true });
  };

  useEffect(() => {
    // A page beyond the last one (shared URL, deleted users): show the last page instead of an empty list.
    if (rows && rows.length === 0 && pagination && pagination.total > 0 && filters.page > pagination.pages) {
      void router.replace(
        { pathname: router.pathname, query: toUserFiltersQuery({ ...filters, page: Math.max(1, pagination.pages) }) },
        undefined,
        { shallow: true },
      );
    }
  }, [rows, pagination, filters, router]);

  const confirmRole = async(row: AdminUserRow, role: UserRole) => {
    await actions.changeRole(row.id, role);
    setRoleTarget(null);
    toast.success(ADMIN_USERS_COPY.roleChanged(nameOf(row), ROLE_LABELS[role]));
  };

  const confirmStatus = async() => {
    if (!statusTarget) {
      return;
    }

    const row = statusTarget;
    const nextActive = !row.isActive;

    setStatusPending(true);

    try {
      await actions.changeStatus(row.id, nextActive);
      toast.success(nextActive ? ADMIN_USERS_COPY.activated(nameOf(row)) : ADMIN_USERS_COPY.deactivated(nameOf(row)));
    } catch (caught) {
      toast.error(getAdminConsoleErrorMessage(caught));
    } finally {
      setStatusPending(false);
      setStatusTarget(null);
    }
  };

  const renderList = () => {
    if (users.error) {
      return (
        <ErrorState
          title={ADMIN_USERS_COPY.loadErrorTitle}
          description={getAdminConsoleErrorMessage(users.error)}
          onRetry={() => void users.reload()}
        />
      );
    }

    if (!rows || !pagination) {
      return users.isLoading || !router.isReady ? <ListSkeleton rows={5} label={ADMIN_USERS_COPY.loading} /> : null;
    }

    if (rows.length === 0) {
      if (pagination.total > 0) {
        // Out-of-range page: the effect above moves to the last page.
        return <ListSkeleton rows={5} label={ADMIN_USERS_COPY.loading} />;
      }

      return filtered ? (
        <EmptyState
          title={ADMIN_USERS_COPY.noMatchTitle}
          description={ADMIN_USERS_COPY.noMatchDescription}
          action={<Button onClick={() => setFilters(NO_USER_FILTERS)}>{ADMIN_USERS_COPY.clearFilters}</Button>}
        />
      ) : (
        <EmptyState icon={<PeopleOutlineIcon />} title={ADMIN_USERS_COPY.emptyTitle} />
      );
    }

    return (
      <div className={cx(styles.results)}>
        <UsersTable
          rows={rows}
          sessionUserId={sessionUser?.id ?? null}
          onChangeRole={setRoleTarget}
          onChangeStatus={setStatusTarget}
        />
        <TablePagination
          component="div"
          count={pagination.total}
          page={Math.max(0, Math.min(filters.page, Math.max(1, pagination.pages)) - 1)}
          rowsPerPage={pagination.limit}
          rowsPerPageOptions={[pagination.limit]}
          onPageChange={(_event, next) => setFilters({ ...filters, page: next + 1 })}
          labelRowsPerPage={ADMIN_USERS_COPY.rowsPerPage}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          getItemAriaLabel={(type) => PAGE_BUTTON_LABELS[type]}
        />
      </div>
    );
  };

  const statusName = statusTarget ? nameOf(statusTarget) : "";
  const deactivating = statusTarget?.isActive ?? false;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{ADMIN_USERS_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={ADMIN_USERS_COPY.title} subtitle={ADMIN_USERS_COPY.subtitle} />
      <div className={cx(styles.content)}>
        <UsersFilters value={filters} groups={groups} groupsFailed={groupsError !== null} onChange={setFilters} />
        <p className={cx(styles.note)}>{ADMIN_USERS_COPY.searchNote}</p>
        {renderList()}
      </div>
      <RoleChangeDialog user={roleTarget} onConfirm={confirmRole} onClose={() => setRoleTarget(null)} />
      <ConfirmDialog
        open={statusTarget !== null}
        title={deactivating ? ADMIN_USERS_COPY.deactivateTitle(statusName) : ADMIN_USERS_COPY.activateTitle(statusName)}
        description={deactivating ? ADMIN_USERS_COPY.deactivateDescription : ADMIN_USERS_COPY.activateDescription}
        confirmLabel={deactivating ? ADMIN_USERS_COPY.deactivate : ADMIN_USERS_COPY.activate}
        cancelLabel={ADMIN_USERS_COPY.cancel}
        destructive={deactivating}
        isPending={statusPending}
        onConfirm={() => void confirmStatus()}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
