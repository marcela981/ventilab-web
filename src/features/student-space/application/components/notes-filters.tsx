/*
* Funcionalidad: NotesFilters
* Descripción: Filters of /me/notes built from the learning curriculum tree: section (only narrows the module options, BACKEND GAP: notes cannot be filtered by section) and module (selects `GET /api/notes/modules/{moduleId}`). There is no text search: the notes endpoints accept no search parameter (BACKEND GAP) and filtering one loaded page on the client would hide notes of other pages. Depends on MUI and the student space entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { cx } from "@shared/lib/class-names";
import type { ModuleOption } from "../entities/my-notes.entity";
import styles from "../../UI/student-space.module.css";

// TODO(i18n): move to a student-space namespace in src/i18n.
export const NOTES_FILTERS_COPY = {
  section: "Sección",
  allSections: "Todas las secciones",
  module: "Módulo",
  allModules: "Todos los módulos",
  sectionHint: "La sección acota la lista de módulos; elige un módulo para ver solo sus notas.",
} as const;

const ALL = "";

// "All" is the empty value: show it and keep the label above it.
const EMPTY_VALUE_SLOT_PROPS = { select: { displayEmpty: true }, inputLabel: { shrink: true } } as const;

export type SectionOption = {
  id: string
  title: string
};

export type NotesFiltersProps = {
  sections: readonly SectionOption[]
  modules: readonly ModuleOption[]
  sectionId: string | null
  moduleId: string | null
  disabled: boolean
  onSectionChange: (sectionId: string | null) => void
  onModuleChange: (moduleId: string | null) => void
};

export function NotesFilters({ sections, modules, sectionId, moduleId, disabled, onSectionChange, onModuleChange }: NotesFiltersProps) {
  return (
    <div className={cx(styles.content)}>
      <div className={cx(styles.filters)}>
        <TextField
          select
          size="small"
          label={NOTES_FILTERS_COPY.section}
          value={sectionId ?? ALL}
          disabled={disabled}
          slotProps={EMPTY_VALUE_SLOT_PROPS}
          onChange={(event) => onSectionChange(event.target.value === ALL ? null : event.target.value)}
          className={cx(styles.filter)}
        >
          <MenuItem value={ALL}>{NOTES_FILTERS_COPY.allSections}</MenuItem>
          {sections.map((section) => <MenuItem key={section.id} value={section.id}>{section.title}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label={NOTES_FILTERS_COPY.module}
          value={moduleId ?? ALL}
          disabled={disabled}
          slotProps={EMPTY_VALUE_SLOT_PROPS}
          onChange={(event) => onModuleChange(event.target.value === ALL ? null : event.target.value)}
          className={cx(styles.filter)}
        >
          <MenuItem value={ALL}>{NOTES_FILTERS_COPY.allModules}</MenuItem>
          {modules.map((module) => <MenuItem key={module.id} value={module.id}>{module.title}</MenuItem>)}
        </TextField>
      </div>
      {sectionId !== null && moduleId === null ? <p className={cx(styles.hint)}>{NOTES_FILTERS_COPY.sectionHint}</p> : null}
    </div>
  );
}
