/*
* Funcionalidad: Temporary workspace panels
* Descripción: Minimal panels of the /simulador tabs that are not built yet (W5, Bloque 1), so every tab has content
*   without loading the pages that existed before the workspace: Simular Paciente (W8 brings the own-patient form;
*   meanwhile a short list of published cases with "Iniciar práctica", which opens the session in Monitoreo through the
*   workspace session), Conexión (W7 brings reservation and connection; meanwhile a link to the reservations calendar)
*   and Mis sesiones (W9 brings the unified list and the replay). Each one is lazy loaded by the workspace and replaced
*   by its task. Depends on next/link, the design-system states, the simulator catalog entry point, the workspace
*   session and the workspace styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Link from "next/link";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { useCaseCatalog, useStartPractice } from "@features/simulator/catalog.entry";
import { useWorkspaceSession } from "./workspace-session-provider";
import styles from "../../UI/simulator-workspace.module.css";

/** Reservations calendar of the ventilator lab (its page is kept, see the ventilator-lab routes). */
const LAB_RESERVATIONS_PATH = "/lab/reservations";

/** Cases shown by the temporary Simular panel. */
const TEMPORARY_CASE_COUNT = 6;

// TODO(i18n): move to a simulator namespace in src/i18n.
export const TEMPORARY_PANELS_COPY = {
  simularTitle: "Simular Paciente",
  simularNote: "Muy pronto podrás configurar aquí tu propio paciente. Mientras tanto, inicia una práctica con un caso clínico publicado: se abrirá en Monitoreo.",
  casesLabel: "Casos clínicos disponibles",
  casesLoading: "Cargando casos clínicos…",
  casesError: "No se pudieron cargar los casos clínicos.",
  casesEmpty: "Todavía no hay casos clínicos publicados.",
  start: "Iniciar práctica",
  starting: "Iniciando…",
  conexionTitle: "Conexión",
  conexionNote: "Muy pronto podrás reservar y conectarte al ventilador físico desde esta pestaña. Mientras tanto, puedes reservar desde el calendario.",
  reservations: "Ver calendario de reservas",
  sesionesTitle: "Mis sesiones",
  sesionesNote: "Muy pronto verás aquí tus sesiones y sus repeticiones.",
} as const;

export function TemporarySimularPanel() {
  const { start } = useWorkspaceSession();
  const { cases, isLoading, error } = useCaseCatalog(TEMPORARY_CASE_COUNT);
  const practice = useStartPractice({ onStarted: start });

  return (
    <section className={cx(styles.temporaryPanel)} aria-labelledby="workspace-simular-title">
      <h2 id="workspace-simular-title" className={cx(styles.panelTitle)}>{TEMPORARY_PANELS_COPY.simularTitle}</h2>
      <p className={cx(styles.muted)}>{TEMPORARY_PANELS_COPY.simularNote}</p>
      {!cases && isLoading ? <CardSkeleton label={TEMPORARY_PANELS_COPY.casesLoading} /> : null}
      {!cases && !isLoading && error ? <p role="alert">{TEMPORARY_PANELS_COPY.casesError}</p> : null}
      {cases && cases.length === 0 ? <p className={cx(styles.muted)}>{TEMPORARY_PANELS_COPY.casesEmpty}</p> : null}
      {cases && cases.length > 0 ? (
        <ul className={cx(styles.caseList)} aria-label={TEMPORARY_PANELS_COPY.casesLabel}>
          {cases.map((clinicalCase) => {
            const pending = practice.pendingCaseId === clinicalCase.id;

            return (
              <li key={clinicalCase.id} className={cx(styles.caseItem)}>
                <span className={cx(styles.caseTitle)}>{clinicalCase.title}</span>
                <button
                  type="button"
                  className={cx(styles.actionButton)}
                  aria-label={`${TEMPORARY_PANELS_COPY.start}: ${clinicalCase.title}`}
                  disabled={practice.pendingCaseId !== null}
                  onClick={() => void practice.start(clinicalCase.id)}
                >
                  {pending ? TEMPORARY_PANELS_COPY.starting : TEMPORARY_PANELS_COPY.start}
                </button>
                {practice.error?.caseId === clinicalCase.id ? <p role="alert" className={cx(styles.caseError)}>{practice.error.message}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export function TemporaryConexionPanel() {
  return (
    <section className={cx(styles.temporaryPanel)} aria-labelledby="workspace-conexion-title">
      <h2 id="workspace-conexion-title" className={cx(styles.panelTitle)}>{TEMPORARY_PANELS_COPY.conexionTitle}</h2>
      <p className={cx(styles.muted)}>{TEMPORARY_PANELS_COPY.conexionNote}</p>
      <Link href={LAB_RESERVATIONS_PATH} className={cx(styles.link)}>{TEMPORARY_PANELS_COPY.reservations}</Link>
    </section>
  );
}

export function TemporarySesionesPanel() {
  return (
    <section className={cx(styles.temporaryPanel)} aria-labelledby="workspace-sesiones-title">
      <h2 id="workspace-sesiones-title" className={cx(styles.panelTitle)}>{TEMPORARY_PANELS_COPY.sesionesTitle}</h2>
      <p className={cx(styles.muted)}>{TEMPORARY_PANELS_COPY.sesionesNote}</p>
    </section>
  );
}
