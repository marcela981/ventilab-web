/*
* Funcionalidad: CaseEditorPage
* Descripción: Staff page of one clinical case, /simulator/cases/new (caseId null) and /simulator/cases/[id]/edit:
*   one page with an anchored side index (with the error count of each section) and the sections Datos generales,
*   Paciente (live PBW), Mecánica y fisiología, Ajustes iniciales del ventilador (configure-mode console), Eventos
*   programados, Objetivos de estabilización and Rúbrica por defecto. The header shows the stored status, the expert
*   validation and whether the case is ready to simulate (from GET /definition), a "Cambios sin guardar" indicator and
*   the explicit "Guardar" (POST create, then the editor route of the new case; PUT replace afterwards). Leaving with
*   unsaved changes asks first (Next router events + beforeunload). Field errors (client checks and the server
*   422/400 mapped to their field) show on their fields after a save attempt; other failures show above the form.
*   `renderTools` is the slot for T12 (test-run, local preview, expert validation, delete → archive), rendered under
*   the index. Loading and load-error states. Depends on MUI, next/head, next/link, next/router, the design-system
*   components, @shared/lib, the case editor hooks, entities, config, sections and CSS Module.
*   v1.1 (T12): the tools context also carries the current draft (local preview) and `onDeleted`, which leaves for
*   the case list without the unsaved-changes prompt; `renderCaseEditorTools` renders the T12 tools for the route.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback } from "react";
import type { ReactNode } from "react";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import type { OutcomeRubricDraft } from "@shared/rubric-editor";
import type { VentilatorSettings } from "@shared/sim-engine";
import type { ClinicalCaseDefinitionDTO } from "../../api/dtos/case-editor.dto";
import { CASE_SECTIONS, sectionAnchor, sectionOfField } from "../config/case-editor-sections";
import type { CaseSectionId } from "../config/case-editor-sections";
import { STATUS_LABELS } from "../config/case-editor.config";
import { buildCaseEditUrl, CASES_URL } from "../config/case-editor.routes";
import { CaseEditorTools } from "../components/case-editor-tools";
import { getCaseEditorErrorMessage } from "../entities/case-editor-errors";
import type { CaseDraft, FieldErrors } from "../entities/case-draft.entity";
import { EventsSection } from "../components/events-section";
import { GeneralSection } from "../components/general-section";
import { MechanicsSection } from "../components/mechanics-section";
import { PatientSection } from "../components/patient-section";
import { RubricSection } from "../components/rubric-section";
import { TargetsSection } from "../components/targets-section";
import { VentilatorSection } from "../components/ventilator-section";
import { useCaseEditor } from "../hooks/use-case-editor";
import type { CaseEditorDeps } from "../hooks/use-case-editor";
import { useUnsavedChangesGuard } from "../hooks/use-unsaved-changes-guard";
import styles from "../../UI/case-editor.module.css";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const CASE_EDITOR_COPY = {
  documentTitleNew: "Nuevo caso clínico | VentyLab",
  documentTitleEdit: "Editar caso clínico | VentyLab",
  titleNew: "Nuevo caso clínico",
  titleEdit: "Editar caso clínico",
  back: "Casos clínicos",
  index: "Secciones del caso",
  errorsIn: (count: number) => (count === 1 ? "1 error" : `${count} errores`),
  save: "Guardar",
  saving: "Guardando…",
  unsaved: "Cambios sin guardar",
  saved: "Todos los cambios guardados",
  notSaved: "Sin guardar",
  created: "Se creó el caso clínico.",
  updated: "Se guardaron los cambios.",
  leaveWarning: "Hay cambios sin guardar en el caso. ¿Salir de todos modos?",
  loading: "Cargando el caso clínico…",
  loadErrorTitle: "No se pudo cargar el caso clínico",
  status: "Estado",
  validated: "Validación por experto",
  validatedYes: "Validado",
  validatedNo: "Sin validar",
  ready: "Simulación",
  readyYes: "Listo para simular",
  readyNo: "Faltan bloques para simular",
  replaceNote: "Guardar reemplaza la definición y borra la validación por experto. Si el caso ya tiene sesiones, duplícalo para cambiarlo.",
} as const;

export type CaseEditorToolsContext = {
  caseId: string
  definition: ClinicalCaseDefinitionDTO
  /** The current draft, unsaved changes included. */
  draft: CaseDraft
  dirty: boolean
  /** The stored case no longer exists: leaves for the case list without asking about unsaved changes. */
  onDeleted: () => void
};

/** The T12 tools (expert validation, server test run, local preview, delete → archive) for the `renderTools` slot. */
export function renderCaseEditorTools(context: CaseEditorToolsContext): ReactNode {
  return <CaseEditorTools {...context} />;
}

export type CaseEditorPageProps = {
  /** null: a new case. */
  caseId: string | null
  /** T12 slot: test-run, local preview, expert validation and delete → archive. */
  renderTools?: ((context: CaseEditorToolsContext) => ReactNode) | undefined
  deps?: CaseEditorDeps | undefined
};

function errorCounts(errors: FieldErrors): Partial<Record<CaseSectionId, number>> {
  return Object.keys(errors).reduce<Partial<Record<CaseSectionId, number>>>((counts, field) => {
    const section = sectionOfField(field);

    counts[section] = (counts[section] ?? 0) + 1;

    return counts;
  }, {});
}

function StoredFacts({ definition }: { definition: ClinicalCaseDefinitionDTO }) {
  const status = definition.status as keyof typeof STATUS_LABELS;

  return (
    <dl className={cx(styles.headerFacts)}>
      <dt>{CASE_EDITOR_COPY.status}</dt>
      <dd><span className={cx(styles.badge)} data-status={definition.status}>{STATUS_LABELS[status] ?? definition.status}</span></dd>
      <dt>{CASE_EDITOR_COPY.validated}</dt>
      <dd>{definition.validatedByExpert ? CASE_EDITOR_COPY.validatedYes : CASE_EDITOR_COPY.validatedNo}</dd>
      <dt>{CASE_EDITOR_COPY.ready}</dt>
      <dd>{definition.simulationReady ? CASE_EDITOR_COPY.readyYes : CASE_EDITOR_COPY.readyNo}</dd>
    </dl>
  );
}

export function CaseEditorPage({ caseId, renderTools, deps }: CaseEditorPageProps) {
  const router = useRouter();
  const toast = useToast();
  const editor = useCaseEditor(caseId, deps);
  const { allowNextNavigation } = useUnsavedChangesGuard(editor.dirty, CASE_EDITOR_COPY.leaveWarning);
  const { draft, errors, definition } = editor;
  const counts = errorCounts(errors);
  const creating = caseId === null;
  const { updateDraft } = editor;
  const setVentilator = useCallback((ventilator: VentilatorSettings | null) => updateDraft((current) => ({ ...current, ventilator })), [updateDraft]);
  const setRubric = useCallback((rubric: OutcomeRubricDraft | null) => updateDraft((current) => ({ ...current, rubric })), [updateDraft]);

  const leaveAfterDelete = useCallback(() => {
    allowNextNavigation();
    void router.replace(CASES_URL);
  }, [allowNextNavigation, router]);

  const save = async() => {
    const outcome = await editor.save();

    if (outcome.status === "created") {
      toast.success(CASE_EDITOR_COPY.created);
      // The new case is saved: its editor route must not ask about unsaved changes.
      allowNextNavigation();
      void router.replace(buildCaseEditUrl(outcome.caseId));
    } else if (outcome.status === "saved") {
      toast.success(CASE_EDITOR_COPY.updated);
    }
  };

  let body: ReactNode;

  if (!draft) {
    body = editor.loadError ? (
      <ErrorState
        title={CASE_EDITOR_COPY.loadErrorTitle}
        description={getCaseEditorErrorMessage(editor.loadError)}
        onRetry={() => void editor.reload()}
      />
    ) : <LoadingState label={CASE_EDITOR_COPY.loading} />;
  } else {
    const sectionProps = { draft, errors, update: updateDraft, disabled: editor.saving };

    body = (
      <div className={cx(styles.layout)}>
        <aside className={cx(styles.sidebar)}>
          <nav aria-label={CASE_EDITOR_COPY.index}>
            <ol className={cx(styles.index)}>
              {CASE_SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${sectionAnchor(section.id)}`} className={cx(styles.indexLink)}>
                    {section.title}
                    {counts[section.id] ? <span className={cx(styles.indexErrors)}>{CASE_EDITOR_COPY.errorsIn(counts[section.id] ?? 0)}</span> : null}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          {caseId && definition && renderTools
            ? renderTools({ caseId, definition, draft, dirty: editor.dirty, onDeleted: leaveAfterDelete })
            : null}
        </aside>
        <div className={cx(styles.sections)}>
          {editor.pageError ? <Alert severity="error">{editor.pageError}</Alert> : null}
          <GeneralSection {...sectionProps} />
          <PatientSection {...sectionProps} />
          <MechanicsSection {...sectionProps} newKey={editor.newKey} />
          <VentilatorSection settings={draft.ventilator} error={errors.initialVentilatorSettings} onChange={setVentilator} disabled={editor.saving} />
          <EventsSection {...sectionProps} newKey={editor.newKey} />
          <TargetsSection {...sectionProps} />
          <RubricSection
            rubric={draft.rubric}
            error={errors.defaultRubric}
            onChange={setRubric}
            newKey={editor.newKey}
            showIssues={editor.submitted}
            disabled={editor.saving}
          />
        </div>
      </div>
    );
  }

  const status = editor.dirty ? CASE_EDITOR_COPY.unsaved : creating ? CASE_EDITOR_COPY.notSaved : CASE_EDITOR_COPY.saved;
  const actions = (
    <div className={cx(styles.headerActions)}>
      <span className={cx(styles.saveState)} data-dirty={editor.dirty} role="status">{status}</span>
      <Button variant="contained" disabled={!draft || editor.saving} onClick={() => void save()}>
        {editor.saving ? CASE_EDITOR_COPY.saving : CASE_EDITOR_COPY.save}
      </Button>
    </div>
  );

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{creating ? CASE_EDITOR_COPY.documentTitleNew : CASE_EDITOR_COPY.documentTitleEdit}</title>
      </Head>
      <div>
        <Button component={Link} href={CASES_URL} startIcon={<ArrowBackIcon />} size="small">{CASE_EDITOR_COPY.back}</Button>
      </div>
      <PageHeader title={creating ? CASE_EDITOR_COPY.titleNew : CASE_EDITOR_COPY.titleEdit} actions={actions} />
      {definition ? <StoredFacts definition={definition} /> : null}
      {creating ? null : <p className={cx(styles.muted)}>{CASE_EDITOR_COPY.replaceNote}</p>}
      {body}
    </div>
  );
}

