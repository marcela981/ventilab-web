/*
* Funcionalidad: CatalogFilters
* Descripción: Filter bar of the simulator catalog: two native selects (pathology and difficulty, "Todas" = no filter) whose options are the contract enums of GET /api/clinical-cases with their Spanish labels, plus a "Limpiar filtros" button when a filter is set. Emits the whole filter object on every change. Depends on MUI TextField and Button, the simulator config, entities and styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { cx } from "@shared/lib/class-names";
import { CASE_DIFFICULTIES, CASE_PATHOLOGIES, DIFFICULTY_LABELS, PATHOLOGY_LABELS } from "../config/simulator.config";
import type { CaseDifficulty, CasePathology } from "../config/simulator.config";
import { hasCatalogFilters, NO_CATALOG_FILTERS } from "../entities/simulator.entity";
import type { CatalogFilters as CatalogFiltersModel } from "../entities/simulator.entity";
import styles from "../../UI/simulator.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const CATALOG_FILTERS_COPY = {
  label: "Filtrar casos",
  pathology: "Patología",
  difficulty: "Dificultad",
  all: "Todas",
  clear: "Limpiar filtros",
} as const;

const ALL = "";

export type CatalogFiltersProps = {
  filters: CatalogFiltersModel
  onChange: (filters: CatalogFiltersModel) => void
};

function pick<T extends string>(options: readonly T[], value: string): T | null {
  return options.find((option) => option === value) ?? null;
}

export function CatalogFilters({ filters, onChange }: CatalogFiltersProps) {
  return (
    <div className={cx(styles.filters)} role="group" aria-label={CATALOG_FILTERS_COPY.label}>
      <TextField
        select
        size="small"
        className={cx(styles.filter)}
        label={CATALOG_FILTERS_COPY.pathology}
        value={filters.pathology ?? ALL}
        onChange={(event) => onChange({ ...filters, pathology: pick<CasePathology>(CASE_PATHOLOGIES, event.target.value) })}
        slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
      >
        <option value={ALL}>{CATALOG_FILTERS_COPY.all}</option>
        {CASE_PATHOLOGIES.map((pathology) => (
          <option key={pathology} value={pathology}>
            {PATHOLOGY_LABELS[pathology]}
          </option>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        className={cx(styles.filter)}
        label={CATALOG_FILTERS_COPY.difficulty}
        value={filters.difficulty ?? ALL}
        onChange={(event) => onChange({ ...filters, difficulty: pick<CaseDifficulty>(CASE_DIFFICULTIES, event.target.value) })}
        slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
      >
        <option value={ALL}>{CATALOG_FILTERS_COPY.all}</option>
        {CASE_DIFFICULTIES.map((difficulty) => (
          <option key={difficulty} value={difficulty}>
            {DIFFICULTY_LABELS[difficulty]}
          </option>
        ))}
      </TextField>
      {hasCatalogFilters(filters) ? (
        <Button variant="text" onClick={() => onChange(NO_CATALOG_FILTERS)}>
          {CATALOG_FILTERS_COPY.clear}
        </Button>
      ) : null}
    </div>
  );
}
