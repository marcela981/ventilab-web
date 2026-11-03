/*
* Funcionalidad: TeachersPanel
* Descripción: Profesores tab of /admin/users (ADMIN; DISENO_BLOQUE4 §2.7, julio TeachersTab): search by name or email kept in the URL (?teacherSearch, shareable, sent to the server) and the teachers table over `GET /api/admin/teachers`. States: loading skeleton, error with retry (a 403 shows the permission message), "No hay profesores registrados" and, with a search, "No se encontraron profesores" with "Limpiar búsqueda". A back/forward navigation replaces the typed text. Container. Depends on MUI, next/router, React, the design-system components, @shared/lib and the admin console components, entities, hooks and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import SearchIcon from "@mui/icons-material/Search";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import Button from "@mui/material/Button";
import { useRouter } from "next/router";
import { useState } from "react";
import type { FormEvent } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { FormField } from "@shared/design-system/components/form-field";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { getAdminConsoleErrorMessage } from "../entities/admin-console-error-messages";
import { readTeacherSearch, withTeacherSearchQuery } from "../entities/admin-teachers.entity";
import { useAdminTeachers } from "../hooks/use-admin-teachers";
import { TeachersTable } from "./teachers-table";
import styles from "../../UI/admin-users.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const TEACHERS_PANEL_COPY = {
  search: "Buscar por nombre o correo",
  searchAction: "Buscar",
  note: "Grupos asignados: grupos de estudiantes activos que creó o supervisa. Estudiantes: estudiantes distintos en esos grupos.",
  loading: "Cargando profesores…",
  loadErrorTitle: "No se pudieron cargar los profesores",
  emptyTitle: "No hay profesores registrados",
  noMatchTitle: "No se encontraron profesores",
  clearSearch: "Limpiar búsqueda",
} as const;

export function TeachersPanel() {
  const router = useRouter();
  const search = readTeacherSearch(router.query);
  const teachers = useAdminTeachers(search, router.isReady);
  const [draft, setDraft] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);

  // The URL is the source of truth: a back/forward navigation replaces the typed text.
  if (lastSearch !== search) {
    setLastSearch(search);
    setDraft(search);
  }

  const applySearch = (next: string) => {
    void router.replace({ pathname: router.pathname, query: withTeacherSearchQuery(router.query, next) }, undefined, { shallow: true });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applySearch(draft);
  };

  const renderList = () => {
    if (teachers.error) {
      return (
        <ErrorState
          title={TEACHERS_PANEL_COPY.loadErrorTitle}
          description={getAdminConsoleErrorMessage(teachers.error)}
          onRetry={() => void teachers.reload()}
        />
      );
    }

    if (!teachers.rows) {
      return <ListSkeleton rows={5} label={TEACHERS_PANEL_COPY.loading} />;
    }

    if (teachers.rows.length === 0) {
      return search ? (
        <EmptyState
          title={TEACHERS_PANEL_COPY.noMatchTitle}
          action={<Button onClick={() => applySearch("")}>{TEACHERS_PANEL_COPY.clearSearch}</Button>}
        />
      ) : (
        <EmptyState icon={<SchoolOutlinedIcon />} title={TEACHERS_PANEL_COPY.emptyTitle} />
      );
    }

    return (
      <div className={cx(styles.results)}>
        <TeachersTable rows={teachers.rows} />
      </div>
    );
  };

  return (
    <div className={cx(styles.content)}>
      <form className={cx(styles.searchForm)} role="search" onSubmit={submit}>
        <FormField label={TEACHERS_PANEL_COPY.search} size="small" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <Button type="submit" variant="outlined" startIcon={<SearchIcon />}>{TEACHERS_PANEL_COPY.searchAction}</Button>
      </form>
      <p className={cx(styles.note)}>{TEACHERS_PANEL_COPY.note}</p>
      {renderList()}
    </div>
  );
}
