/*
* Funcionalidad: NotesFilters
* Descripción: Filters of /me/notes, all applied on the server by `GET /api/notes`: a text search over the note content (`search`, debounced by the page), the curriculum section (only narrows the module options, built from the learning curriculum tree), the module (`moduleId`), the lesson of that module (`lessonId`, options from the module lessons) and the lesson page (`pageId`, options from the lesson Pages). A dependent select is disabled until its parent is chosen. Depends on MUI and the student space entities and CSS Module. v1.1 (B2 closure): server-side search and the lesson and page filters (the backend gaps are closed).
* Versión: 1.1
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
  search: "Buscar en mis notas",
  searchPlaceholder: "Escribe una palabra de tus notas",
  section: "Sección del currículo",
  allSections: "Todas las secciones",
  module: "Módulo",
  allModules: "Todos los módulos",
  lesson: "Lección",
  allLessons: "Todas las lecciones",
  page: "Página de la lección",
  allPages: "Todas las páginas",
  sectionHint: "La sección acota la lista de módulos; elige un módulo para ver solo sus notas.",
} as const;

const ALL = "";

// "All" is the empty value: show it and keep the label above it.
const EMPTY_VALUE_SLOT_PROPS = { select: { displayEmpty: true }, inputLabel: { shrink: true } } as const;

export type FilterOption = {
  id: string
  title: string
};

export type NotesFiltersProps = {
  search: string
  sections: readonly FilterOption[]
  modules: readonly ModuleOption[]
  lessons: readonly FilterOption[]
  pages: readonly FilterOption[]
  sectionId: string | null
  moduleId: string | null
  lessonId: string | null
  pageId: string | null
  disabled: boolean
  onSearchChange: (search: string) => void
  onSectionChange: (sectionId: string | null) => void
  onModuleChange: (moduleId: string | null) => void
  onLessonChange: (lessonId: string | null) => void
  onPageChange: (pageId: string | null) => void
};

type SelectFilterProps = {
  label: string
  allLabel: string
  value: string | null
  options: readonly FilterOption[]
  disabled: boolean
  onChange: (value: string | null) => void
};

function SelectFilter({ label, allLabel, value, options, disabled, onChange }: SelectFilterProps) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value ?? ALL}
      disabled={disabled}
      slotProps={EMPTY_VALUE_SLOT_PROPS}
      onChange={(event) => onChange(event.target.value === ALL ? null : event.target.value)}
      className={cx(styles.filter)}
    >
      <MenuItem value={ALL}>{allLabel}</MenuItem>
      {options.map((option) => <MenuItem key={option.id} value={option.id}>{option.title}</MenuItem>)}
    </TextField>
  );
}

export function NotesFilters(props: NotesFiltersProps) {
  const { search, sections, modules, lessons, pages, sectionId, moduleId, lessonId, pageId, disabled } = props;

  return (
    <div className={cx(styles.content)}>
      <TextField
        type="search"
        size="small"
        label={NOTES_FILTERS_COPY.search}
        placeholder={NOTES_FILTERS_COPY.searchPlaceholder}
        value={search}
        onChange={(event) => props.onSearchChange(event.target.value)}
        className={cx(styles.searchField)}
      />
      <div className={cx(styles.filters)}>
        <SelectFilter
          label={NOTES_FILTERS_COPY.section}
          allLabel={NOTES_FILTERS_COPY.allSections}
          value={sectionId}
          options={sections}
          disabled={disabled}
          onChange={props.onSectionChange}
        />
        <SelectFilter
          label={NOTES_FILTERS_COPY.module}
          allLabel={NOTES_FILTERS_COPY.allModules}
          value={moduleId}
          options={modules}
          disabled={disabled}
          onChange={props.onModuleChange}
        />
        <SelectFilter
          label={NOTES_FILTERS_COPY.lesson}
          allLabel={NOTES_FILTERS_COPY.allLessons}
          value={lessonId}
          options={lessons}
          disabled={moduleId === null}
          onChange={props.onLessonChange}
        />
        <SelectFilter
          label={NOTES_FILTERS_COPY.page}
          allLabel={NOTES_FILTERS_COPY.allPages}
          value={pageId}
          options={pages}
          disabled={lessonId === null}
          onChange={props.onPageChange}
        />
      </div>
      {sectionId !== null && moduleId === null ? <p className={cx(styles.hint)}>{NOTES_FILTERS_COPY.sectionHint}</p> : null}
    </div>
  );
}
