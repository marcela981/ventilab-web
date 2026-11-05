/*
* Funcionalidad: DirectoryToolbar
* Descripción: Toolbar of the students directory (July's PanelStudents header and search): search box by name, email or student code sent to the URL 300 ms after the last keystroke (the URL stays the source of truth on back/forward), the "Todos" / "Mis grupos" filter (toggle buttons with aria-pressed) and "Conformar Grupo (N)", shown only while students are selected. Depends on MUI, React, the design-system form field, the students directory entity and CSS Module. v1.1 (ajustes D2): "Agregar a grupo existente (N)" next to "Conformar Grupo (N)" while students are selected.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useEffect, useState } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import type { DirectoryScope } from "../../entities/students-directory.entity";
import styles from "../../../UI/students-directory.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const DIRECTORY_TOOLBAR_COPY = {
  search: "Buscar por nombre, correo o código",
  scope: "Estudiantes que se muestran",
  all: "Todos",
  mine: "Mis grupos",
  buildGroup: (count: number) => `Conformar Grupo (${count})`,
  addToGroup: (count: number) => `Agregar a grupo existente (${count})`,
} as const;

export const SEARCH_DEBOUNCE_MS = 300;

export type DirectoryToolbarProps = {
  search: string
  scope: DirectoryScope
  selectedCount: number
  onSearch: (search: string) => void
  onScope: (scope: DirectoryScope) => void
  onBuildGroup: () => void
  onAddToGroup: () => void
};

export function DirectoryToolbar({ search, scope, selectedCount, onSearch, onScope, onBuildGroup, onAddToGroup }: DirectoryToolbarProps) {
  const [text, setText] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);

  // The URL is the source of truth: a back/forward navigation replaces the typed text (unless it only differs by spaces).
  if (lastSearch !== search) {
    setLastSearch(search);

    if (text.trim() !== search) {
      setText(search);
    }
  }

  useEffect(() => {
    const next = text.trim();

    if (next === search) {
      return undefined;
    }

    const timer = setTimeout(() => onSearch(next), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [text, search, onSearch]);

  return (
    <div className={cx(styles.toolbar)}>
      <div role="search" className={cx(styles.search)}>
        <FormField
          type="search"
          size="small"
          fullWidth
          label={DIRECTORY_TOOLBAR_COPY.search}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={scope}
        aria-label={DIRECTORY_TOOLBAR_COPY.scope}
        onChange={(_event, next: DirectoryScope | null) => {
          if (next) {
            onScope(next);
          }
        }}
      >
        <ToggleButton value="all">{DIRECTORY_TOOLBAR_COPY.all}</ToggleButton>
        <ToggleButton value="mine">{DIRECTORY_TOOLBAR_COPY.mine}</ToggleButton>
      </ToggleButtonGroup>
      {selectedCount > 0 ? (
        <>
          <Button variant="contained" startIcon={<GroupAddIcon />} onClick={onBuildGroup}>
            {DIRECTORY_TOOLBAR_COPY.buildGroup(selectedCount)}
          </Button>
          <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={onAddToGroup}>
            {DIRECTORY_TOOLBAR_COPY.addToGroup(selectedCount)}
          </Button>
        </>
      ) : null}
    </div>
  );
}
