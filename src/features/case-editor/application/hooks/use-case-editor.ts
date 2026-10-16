/*
* Funcionalidad: useCaseEditor
* Descripción: State of the case editor page. Creation starts from an empty draft; edition loads
*   GET /api/clinical-cases/{caseId}/definition and builds the draft once (a later revalidation never overwrites what
*   the author is typing). `dirty` compares the draft with the last saved one. `save()` maps the draft
*   (toUpsertCase): with field errors nothing is sent and they show from then on; otherwise it creates (POST, then the
*   page switches to the editor route of the new case) or replaces (PUT) the case, and the saved draft becomes the
*   baseline. A failed save maps the server error to its field (422 range / 400 definition: the path inside the
*   message, rows by their DTO order) or keeps a page-level message; editing clears the server error. Keys of new
*   event, curve and rubric rows are unique per editor. `updateDraft` is a stable functional update for the memoized
*   heavy sections (configure console, rubric). Depends on React, the api-client query hook, the case editor
*   service, draft entity, error mapping and mutation hook.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo, useRef, useState } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import type { ClinicalCaseDefinitionDTO, UpsertClinicalCaseDTO } from "../../api/dtos/case-editor.dto";
import { CASE_DEFINITION_PATH, createClinicalCase, replaceClinicalCase } from "../../api/services/case-editor.service";
import { mapSaveError } from "../entities/case-editor-errors";
import { caseDraftFromDefinition, emptyCaseDraft, sameDraft, toUpsertCase } from "../entities/case-draft.entity";
import type { CaseDraft, FieldErrors } from "../entities/case-draft.entity";
import { useCaseMutation } from "./use-case-mutation";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const EDITOR_STATE_COPY = {
  fixErrors: "Revisa los campos marcados antes de guardar.",
} as const;

export type CaseEditorDeps = {
  create?: ((body: UpsertClinicalCaseDTO) => Promise<string>) | undefined
  replace?: ((caseId: string, body: UpsertClinicalCaseDTO) => Promise<void>) | undefined
};

export type SaveOutcome =
  | { status: "created", caseId: string }
  | { status: "saved" }
  | { status: "invalid" }
  | { status: "error" }
  | { status: "busy" };

export type UseCaseEditorResult = {
  /** null while the definition loads (edition). */
  draft: CaseDraft | null
  definition: ClinicalCaseDefinitionDTO | null
  loadError: ApiError | null
  reload: () => Promise<void>
  /** Functional update (stable), for sections that only see their own block. */
  updateDraft: (updater: (draft: CaseDraft) => CaseDraft) => void
  dirty: boolean
  errors: FieldErrors
  /** Field errors are shown once the author tried to save. */
  submitted: boolean
  pageError: string | null
  saving: boolean
  save: () => Promise<SaveOutcome>
  newKey: () => string
};

type EditorState = { baseline: CaseDraft, draft: CaseDraft };
type ServerError = { field: string, message: string };

export function useCaseEditor(caseId: string | null, deps: CaseEditorDeps = {}): UseCaseEditorResult {
  const definitionQuery = useApiQuery(caseId ? CASE_DEFINITION_PATH : null, { params: { caseId: caseId ?? "" } });
  const definition = definitionQuery.data?.data ?? null;
  const [state, setState] = useState<EditorState | null>(() => {
    if (caseId) {
      return null;
    }

    const empty = emptyCaseDraft();

    return { baseline: empty, draft: empty };
  });
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const keyRef = useRef(0);
  const { pending, run } = useCaseMutation();

  // The definition builds the draft once; later revalidations keep what the author is editing.
  if (state === null && definition) {
    const loaded = caseDraftFromDefinition(definition);

    setState({ baseline: loaded, draft: loaded });
  }

  const draft = state?.draft ?? null;
  const mapping = useMemo(() => (draft ? toUpsertCase(draft) : null), [draft]);
  const clientErrors = submitted && mapping ? mapping.errors : {};
  const errors: FieldErrors = serverError ? { ...clientErrors, [serverError.field]: serverError.message } : clientErrors;

  const updateDraft = useCallback((updater: (draft: CaseDraft) => CaseDraft) => {
    setState((current) => (current ? { ...current, draft: updater(current.draft) } : current));
    setServerError(null);
  }, []);

  const newKey = useCallback(() => {
    keyRef.current += 1;

    return `new-${keyRef.current}`;
  }, []);

  const save = useCallback(async(): Promise<SaveOutcome> => {
    if (!draft || !mapping) {
      return { status: "busy" };
    }

    setSubmitted(true);
    setPageError(null);
    setServerError(null);

    if (!mapping.body) {
      setPageError(EDITOR_STATE_COPY.fixErrors);

      return { status: "invalid" };
    }

    const body = mapping.body;
    const outcome = await run(() => (caseId
      ? (deps.replace ?? replaceClinicalCase)(caseId, body).then(() => caseId)
      : (deps.create ?? createClinicalCase)(body)));

    if (outcome.status === "busy") {
      return outcome;
    }

    if (outcome.status === "error") {
      const mapped = mapSaveError(outcome.error, mapping);

      if (mapped.field) {
        setServerError({ field: mapped.field, message: mapped.message });
      } else {
        setPageError(mapped.message);
      }

      return { status: "error" };
    }

    setState((current) => (current ? { ...current, baseline: draft } : current));

    return caseId ? { status: "saved" } : { status: "created", caseId: outcome.value };
  }, [caseId, deps.create, deps.replace, draft, mapping, run]);

  const reload = useCallback(async() => {
    await definitionQuery.mutate();
  }, [definitionQuery]);

  return {
    draft,
    definition,
    loadError: definitionQuery.error ?? null,
    reload,
    updateDraft,
    dirty: state !== null && !sameDraft(state.baseline, state.draft),
    errors,
    submitted,
    pageError,
    saving: pending,
    save,
    newKey,
  };
}
