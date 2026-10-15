/*
* Funcionalidad: ClinicalCaseSelector
* Descripción: Clinical case picker of a SIMULATION question in the evaluation builder: a native select over one page of published cases (`GET /api/clinical-cases?status=PUBLISHED`, 20 per page, newest first) with "Casos anteriores"/"Más casos" paging and a title filter of the loaded page (the API has no text search). The chosen case stays in the select even when it is not on the page (read by id) or no longer exists. "Sin caso clínico" clears it. Loading and error-with-retry states. Depends on MUI, the design-system FormField, @shared/lib, the clinical case hooks and entities, the builder copy and the simulation CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import { useState } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { BUILDER_COPY } from "../../entities/builder-copy";
import { filterCasesByTitle } from "../../entities/clinical-case-choice.entity";
import type { ClinicalCaseChoice } from "../../entities/clinical-case-choice.entity";
import { useClinicalCaseChoice, usePublishedClinicalCases } from "../../hooks/use-clinical-cases";
import styles from "../../../UI/simulation.module.css";

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type ClinicalCaseSelectorProps = {
  value: string | null
  disabled: boolean
  onChange: (clinicalCaseId: string | null) => void
};

const caseLabel = (item: ClinicalCaseChoice): string => (item.pathology ? `${item.title} · ${item.pathology}` : item.title);

export function ClinicalCaseSelector({ value, disabled, onChange }: ClinicalCaseSelectorProps) {
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  const { casesPage, isLoading, error, reload } = usePublishedClinicalCases(page);
  const chosen = useClinicalCaseChoice(value);
  const visible = casesPage ? filterCasesByTitle(casesPage.items, term) : [];
  const chosenVisible = value !== null && visible.some((item) => item.id === value);

  return (
    <fieldset className={cx(styles.group)}>
      <div className={cx(styles.caseRow)}>
        <FormField
          select
          label={BUILDER_COPY.simulationCase}
          value={value ?? ""}
          disabled={disabled}
          size="small"
          className={cx(styles.caseField)}
          helperText={BUILDER_COPY.simulationCaseHelp}
          onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
          slotProps={NATIVE_SELECT}
        >
          <option value="">{BUILDER_COPY.simulationNoCase}</option>
          {value !== null && !chosenVisible ? (
            <option value={value}>{chosen ? caseLabel(chosen) : BUILDER_COPY.simulationCaseUnavailable(value)}</option>
          ) : null}
          {visible.map((item) => <option key={item.id} value={item.id}>{caseLabel(item)}</option>)}
        </FormField>
        <FormField
          label={BUILDER_COPY.simulationCaseFilter}
          value={term}
          size="small"
          className={cx(styles.caseField)}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>
      {!casesPage && isLoading ? <p className={cx(styles.pager)} role="status">{BUILDER_COPY.simulationCasesLoading}</p> : null}
      {error ? (
        <p className={cx(styles.pager)} role="alert">
          {BUILDER_COPY.simulationCasesError}
          <Button size="small" onClick={() => void reload()}>{BUILDER_COPY.simulationCasesRetry}</Button>
        </p>
      ) : null}
      {casesPage && visible.length === 0 && term.trim() !== "" ? <p className={cx(styles.pager)}>{BUILDER_COPY.simulationCasesEmpty}</p> : null}
      {casesPage && casesPage.pages > 1 ? (
        <div className={cx(styles.pager)}>
          <Button size="small" disabled={page <= 1} onClick={() => setPage(page - 1)}>{BUILDER_COPY.simulationCasesPrevious}</Button>
          <span>{BUILDER_COPY.simulationCasePage(casesPage.page, casesPage.pages)}</span>
          <Button size="small" disabled={page >= casesPage.pages} onClick={() => setPage(page + 1)}>{BUILDER_COPY.simulationCasesNext}</Button>
        </div>
      ) : null}
    </fieldset>
  );
}
