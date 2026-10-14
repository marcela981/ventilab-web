/*
* Funcionalidad: MemberSearch
* Descripción: Adds members to a student group: a labelled search field (name or email, at least 2 characters, debounced) over `GET /api/users` filtered by the STUDENT role and active accounts, a polite live region with the search state (typing hint, searching, no results, load error) and the matching users that are not members yet, each with an "Agregar" button. The parent runs the request (adding is reversible, so there is no confirmation). Depends on MUI, useUserSearch, the group entity, the groups error messages and the group detail CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { cx } from "@shared/lib/class-names";
import { personName } from "../entities/group.entity";
import type { GroupMember, UserOption } from "../entities/group.entity";
import { getGroupErrorMessage } from "../entities/groups-error-messages";
import { USER_SEARCH_MIN_LENGTH, useUserSearch } from "../hooks/use-user-search";
import styles from "../../UI/group-detail.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const SEARCH_COPY = {
  label: "Buscar estudiante",
  helper: "Nombre o correo electrónico",
  hint: `Escribe al menos ${USER_SEARCH_MIN_LENGTH} caracteres para buscar.`,
  searching: "Buscando estudiantes…",
  empty: "No hay estudiantes disponibles con ese nombre o correo.",
  results: "Resultados de la búsqueda",
  add: "Agregar",
} as const;

export type MemberSearchProps = {
  members: readonly GroupMember[]
  disabled: boolean
  onAdd: (user: UserOption) => void
};

export function MemberSearch({ members, disabled, onAdd }: MemberSearchProps) {
  const [term, setTerm] = useState("");
  const { active, results, isLoading, error } = useUserSearch(term, "STUDENT", members);

  let status: string = SEARCH_COPY.hint;

  if (active && error) {
    status = getGroupErrorMessage(error);
  } else if (active && isLoading && !results) {
    status = SEARCH_COPY.searching;
  } else if (results && results.length === 0) {
    status = SEARCH_COPY.empty;
  } else if (results) {
    status = "";
  }

  return (
    <div className={cx(styles.search)}>
      <TextField
        label={SEARCH_COPY.label}
        helperText={SEARCH_COPY.helper}
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        fullWidth
        size="small"
      />
      <p className={cx(styles.muted)} role="status" aria-live="polite">{status}</p>
      {results && results.length > 0 ? (
        <ul className={cx(styles.list)} aria-label={SEARCH_COPY.results}>
          {results.map((user) => (
            <li key={user.id} className={cx(styles.item)}>
              <span className={cx(styles.person)}>
                <span className={cx(styles.personName)}>{personName(user)}</span>
                <span className={cx(styles.muted)}>{user.email}</span>
              </span>
              <Button
                size="small"
                startIcon={<PersonAddIcon />}
                onClick={() => onAdd(user)}
                disabled={disabled}
                aria-label={`${SEARCH_COPY.add} a ${personName(user)}`}
              >
                {SEARCH_COPY.add}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
