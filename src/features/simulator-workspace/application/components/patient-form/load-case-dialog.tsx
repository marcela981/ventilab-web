/*
* Funcionalidad: Load case dialog
* Descripción: "Cargar caso" of the Simular Paciente form (W8, Bloque 1; FLUJOS_JULIO a.4): a dialog listing the
*   published clinical cases with the catalog pathology and difficulty filters (server-side, reused from the simulator
*   catalog) and a pager. Choosing a case reads its detail (GET /api/clinical-cases/{id}, patient block included) and
*   hands its patient preset to the form, which keeps the case as the base case of the session. The list is queried
*   only while the dialog is open; one case loads at a time and a failure is shown in Spanish inside the dialog.
*   Depends on MUI Dialog and Button, the design-system loading state, the simulator patient entry point and the
*   patient form styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useId, useState } from "react";
import {
  CASE_DIFFICULTIES,
  CatalogFilters,
  DIFFICULTY_LABELS,
  fetchCasePatientPreset,
  PATHOLOGY_LABELS,
  useCaseCatalog,
} from "@features/simulator/patient.entry";
import type { CasePatientPreset } from "@features/simulator/patient.entry";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import styles from "../../../UI/patient-form/patient-form.module.css";

/** Cases per page of the dialog. */
const LOAD_CASE_PAGE_SIZE = 8;

// TODO(i18n): move to a simulator namespace in src/i18n.
export const LOAD_CASE_COPY = {
  title: "Cargar caso clínico",
  intro: "Elige un caso clínico publicado: sus datos llenarán el formulario y la sesión usará ese caso como base.",
  casesLabel: "Casos clínicos publicados",
  loading: "Cargando casos clínicos…",
  error: "No se pudieron cargar los casos clínicos.",
  empty: "No hay casos clínicos publicados con estos filtros.",
  load: "Cargar",
  loadingCase: "Cargando…",
  loadError: "No se pudo cargar el caso clínico. Inténtalo de nuevo.",
  previous: "Anterior",
  next: "Siguiente",
  page: (page: number, pages: number) => `Página ${page} de ${pages}`,
  cancel: "Cancelar",
} as const;

function pathologyLabel(pathology: string): string {
  return Object.prototype.hasOwnProperty.call(PATHOLOGY_LABELS, pathology) ? PATHOLOGY_LABELS[pathology as keyof typeof PATHOLOGY_LABELS] : pathology;
}

function difficultyLabel(difficulty: string): string {
  const known = CASE_DIFFICULTIES.find((value) => value === difficulty);

  return known === undefined ? difficulty : DIFFICULTY_LABELS[known];
}

type CaseListProps = { onLoaded: (preset: CasePatientPreset) => void };

/** Mounted only while the dialog is open, so the catalog is queried only then. */
function CaseList({ onLoaded }: CaseListProps) {
  const { cases, filters, setFilters, page, setPage, pagination, isLoading, error } = useCaseCatalog(LOAD_CASE_PAGE_SIZE);
  const [loadingCaseId, setLoadingCaseId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async(caseId: string) => {
    if (loadingCaseId !== null) {
      return;
    }

    setLoadingCaseId(caseId);
    setLoadError(null);

    try {
      onLoaded(await fetchCasePatientPreset(caseId));
    } catch {
      setLoadError(LOAD_CASE_COPY.loadError);
    } finally {
      setLoadingCaseId(null);
    }
  };

  return (
    <div className={cx(styles.dialogBody)}>
      <p className={cx(styles.muted)}>{LOAD_CASE_COPY.intro}</p>
      <CatalogFilters filters={filters} onChange={setFilters} />
      {loadError ? <p role="alert" className={cx(styles.error)}>{loadError}</p> : null}
      {!cases && isLoading ? <LoadingState label={LOAD_CASE_COPY.loading} /> : null}
      {!cases && !isLoading && error ? <p role="alert" className={cx(styles.error)}>{LOAD_CASE_COPY.error}</p> : null}
      {cases && cases.length === 0 ? <p className={cx(styles.muted)}>{LOAD_CASE_COPY.empty}</p> : null}
      {cases && cases.length > 0 ? (
        <ul className={cx(styles.caseList)} aria-label={LOAD_CASE_COPY.casesLabel}>
          {cases.map((clinicalCase) => (
            <li key={clinicalCase.id} className={cx(styles.caseItem)}>
              <div className={cx(styles.caseText)}>
                <span className={cx(styles.caseTitle)}>{clinicalCase.title}</span>
                <span className={cx(styles.muted)}>
                  {`${pathologyLabel(clinicalCase.pathology)} · ${difficultyLabel(clinicalCase.difficulty)}`}
                </span>
              </div>
              <Button
                variant="outlined"
                size="small"
                aria-label={`${LOAD_CASE_COPY.load}: ${clinicalCase.title}`}
                disabled={loadingCaseId !== null}
                onClick={() => void load(clinicalCase.id)}
              >
                {loadingCaseId === clinicalCase.id ? LOAD_CASE_COPY.loadingCase : LOAD_CASE_COPY.load}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {pagination && pagination.pages > 1 ? (
        <div className={cx(styles.pager)}>
          <Button size="small" disabled={page <= 1} onClick={() => setPage(page - 1)}>{LOAD_CASE_COPY.previous}</Button>
          <span className={cx(styles.muted)}>{LOAD_CASE_COPY.page(page, pagination.pages)}</span>
          <Button size="small" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>{LOAD_CASE_COPY.next}</Button>
        </div>
      ) : null}
    </div>
  );
}

export type LoadCaseDialogProps = {
  open: boolean
  onClose: () => void
  onLoaded: (preset: CasePatientPreset) => void
};

export function LoadCaseDialog({ open, onClose, onLoaded }: LoadCaseDialogProps) {
  const titleId = useId();

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} maxWidth="sm" fullWidth>
      <DialogTitle id={titleId}>{LOAD_CASE_COPY.title}</DialogTitle>
      <DialogContent dividers>
        {open ? <CaseList onLoaded={onLoaded} /> : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{LOAD_CASE_COPY.cancel}</Button>
      </DialogActions>
    </Dialog>
  );
}
