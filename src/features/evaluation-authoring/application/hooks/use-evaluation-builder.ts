/*
* Funcionalidad: useEvaluationBuilder
* Descripción: State and actions of the evaluation builder. Holds a local draft over the evaluation loaded from `GET /api/evaluations/{id}` (null id: a new evaluation): the metadata form, the edited questions (prompt, points, explanation, options) and the edited scenario contents; dirty is true while any of them differs from the backend. save() validates and persists only the changed parts: creating sends `POST /api/evaluations` and replaces the route with the editor of the new evaluation; editing sends the metadata PATCH, one PATCH per edited scenario and, per edited question, its PATCH plus the option POST/PATCH/DELETE calls and `PUT .../options/order` when the order changed. Each part is saved independently: a failed part keeps its draft (created options keep their new ids) and its message is shown on its card; a 409 evaluation.has_submitted_attempts raises the structure-locked banner and a 422 re-reads the readiness issues to show them on the questions. Structural actions apply at once: add or delete questions and scenarios, the drag-and-drop reorders (`PUT .../questions/order` and `PUT .../scenarios/order`, shown optimistically and reverted with a toast on failure) and duplicate (opens the copy). Mutations are single-flight and refresh every authoring key. Depends on React, next/router, @shared/api-client, the design-system toast, the authoring services, mappers, entities and hooks. v1.1 (A3 + A2 review): the question PATCH is split into its text part (prompt, explanation) and its structural part (points, clinical case, rubric), so texts still save when attempts exist; options created by a save get their backend id merged into the current draft by client key (on success and on failure), so edits typed during the save survive and nothing is created twice; after a 409 has_submitted_attempts the structural edits of every draft are dropped (texts kept) with a toast, instead of repeating the 409 on every save; a 422 on a save shows the client READY validation of the drafts on the affected questions (the backend rolls the change back and sends no issues); markReady runs the client READY validation (issues shown on the cards) and then sends `PATCH .../status` READY, re-reading the readiness issues on a 422; markDraft returns a READY evaluation to DRAFT; deleting the only question of a READY evaluation is refused with the READY hint.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useCallback, useMemo, useRef, useState } from "react";
import { toApiError } from "@shared/api-client/api-error";
import type { ApiError } from "@shared/api-client/api-error";
import { useToast } from "@shared/design-system/components/use-toast";
import { toCreateEvaluationDTO, toUpdateEvaluationDTO } from "../../api/mappers/evaluation-builder.mapper";
import {
  addOption,
  addQuestion,
  addScenario,
  changeEvaluationStatus,
  createEvaluation,
  duplicateEvaluation,
  removeOption,
  removeQuestion,
  removeScenario,
  reorderOptions,
  reorderQuestions,
  reorderScenarios,
  updateEvaluation,
  updateOption,
  updateQuestion,
  updateScenario,
} from "../../api/services/evaluation-authoring.service";
import { buildEvaluationEditUrl } from "../entities/authoring-urls";
import { BUILDER_COPY } from "../entities/builder-copy";
import { layoutFrom, toOrderItems, toQuestionOrderItems } from "../entities/builder-layout";
import type { QuestionLayout } from "../entities/builder-layout";
import {
  hasQuestionErrors,
  isQuestionDraftDirty,
  newQuestionBody,
  planQuestionSave,
  stripStructuralEdits,
  validateQuestionDraft,
  withCreatedOptionIds,
} from "../entities/builder-question.entity";
import type { QuestionDraft, QuestionErrors, QuestionType } from "../entities/builder-question.entity";
import { emptyDoc, sameRichText } from "../entities/builder-rich-text";
import type { RichDoc } from "../entities/builder-rich-text";
import type { EvaluationType } from "../entities/evaluation-authoring.entity";
import { getAuthoringErrorMessage } from "../entities/evaluation-authoring-error-messages";
import {
  changeMetadataType,
  hasErrors,
  isMetadataDirty,
  metadataFormFrom,
  newMetadataForm,
  toCreateEvaluationBody,
  toUpdateEvaluationChanges,
  validateMetadata,
} from "../entities/evaluation-builder.entity";
import type { BuilderEvaluation, BuilderQuestion, MetadataErrors, MetadataForm, ReadinessIssue } from "../entities/evaluation-builder.entity";
import { readinessQuestionsFrom, validateEvaluationReadiness } from "../entities/evaluation-readiness.entity";
import { useAuthoringMutation } from "./use-authoring-mutation";
import type { AuthoringMutationOutcome } from "./use-authoring-mutation";
import { useEvaluationDetail } from "./use-evaluation-detail";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

export const STRUCTURE_LOCKED_CODE = "evaluation.has_submitted_attempts";

type FormState = { key: string | null, form: MetadataForm };

type SaveSummary = {
  metadataSaved: boolean
  savedQuestions: Map<string, QuestionDraft>
  // Options created during the save, per question: client key -> backend id.
  createdOptionIds: Map<string, Map<string, string>>
  invalidQuestionIds: string[]
  questionErrors: Record<string, string>
  savedScenarios: Map<string, RichDoc>
  scenarioErrors: Record<string, string>
  messages: string[]
  locked: boolean
  invalid: boolean
};

// createdIds is filled as options are created, so a later failure still knows them and never creates them again.
async function saveQuestionDraft(evaluationId: string, question: BuilderQuestion, draft: QuestionDraft, createdIds: Map<string, string>): Promise<void> {
  const plan = planQuestionSave(question, draft);

  // Texts first and on their own: they still save when the structural part is refused (submitted attempts).
  if (plan.text) {
    await updateQuestion(evaluationId, question.id, plan.text);
  }

  if (plan.structure) {
    await updateQuestion(evaluationId, question.id, plan.structure);
  }

  for (const option of plan.creates) {
    const id = await addOption(evaluationId, question.id, {
      content: option.content.trim(),
      isCorrect: option.isCorrect,
      ...(option.mediaId ? { mediaId: option.mediaId } : {}),
    });

    createdIds.set(option.key, id);
  }

  for (const update of plan.updates) {
    await updateOption(evaluationId, question.id, update.id, update.changes);
  }

  for (const optionId of plan.deletes) {
    await removeOption(evaluationId, question.id, optionId);
  }

  if (plan.reorder) {
    const ids = draft.options.map((option) => option.id ?? createdIds.get(option.key) ?? "").filter((id) => id !== "");

    await reorderOptions(evaluationId, question.id, toOrderItems(ids));
  }
}

function recordFailure(summary: SaveSummary, error: ApiError): string {
  const message = getAuthoringErrorMessage(error);

  summary.messages.push(message);
  summary.locked ||= error.code === STRUCTURE_LOCKED_CODE;
  summary.invalid ||= error.status === 422;

  return message;
}

export type UseEvaluationBuilderResult = {
  creating: boolean
  evaluation: BuilderEvaluation | null
  isLoading: boolean
  loadError: ApiError | null
  reload: () => Promise<void>
  form: MetadataForm | null
  metadataErrors: MetadataErrors
  updateForm: (next: MetadataForm) => void
  changeType: (type: EvaluationType) => void
  layout: QuestionLayout | null
  questionDraft: (question: BuilderQuestion) => QuestionDraft | null
  questionErrors: (question: BuilderQuestion) => QuestionErrors | null
  isQuestionDirty: (questionId: string) => boolean
  updateQuestionDraft: (questionId: string, draft: QuestionDraft) => void
  scenarioContent: (scenarioId: string) => RichDoc | null
  updateScenarioContent: (scenarioId: string, content: RichDoc) => void
  saveErrors: Record<string, string>
  issuesFor: (questionId: string) => ReadinessIssue[]
  generalIssues: ReadinessIssue[]
  locked: boolean
  dirty: boolean
  pending: boolean
  saving: boolean
  save: () => Promise<void>
  markReady: () => Promise<void>
  markDraft: () => Promise<void>
  addQuestionOfType: (type: QuestionType, scenarioId: string | null) => Promise<void>
  deleteQuestion: (questionId: string) => Promise<boolean>
  addNewScenario: () => Promise<void>
  deleteScenario: (scenarioId: string) => Promise<boolean>
  applyQuestionLayout: (next: QuestionLayout) => Promise<void>
  applyScenarioLayout: (next: QuestionLayout) => Promise<void>
  duplicate: () => Promise<void>
};

export function useEvaluationBuilder(evaluationId: string | null): UseEvaluationBuilderResult {
  const router = useRouter();
  const toast = useToast();
  const creating = evaluationId === null;
  const { evaluation, isLoading, error: loadError, reload } = useEvaluationDetail(evaluationId);
  const { pending, run } = useAuthoringMutation();
  const [formState, setFormState] = useState<FormState | null>(creating ? { key: null, form: newMetadataForm() } : null);
  const [drafts, setDrafts] = useState<Record<string, QuestionDraft>>({});
  const [scenarioDrafts, setScenarioDrafts] = useState<Record<string, RichDoc>>({});
  const [layoutOverride, setLayoutOverride] = useState<QuestionLayout | null>(null);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  // Issues found by the client READY validation (the backend sends none with a 422).
  const [clientIssues, setClientIssues] = useState<ReadinessIssue[]>([]);
  const [lockedNotice, setLockedNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const form = formState && formState.key === evaluationId
    ? formState.form
    : (evaluation ? metadataFormFrom(evaluation) : null);

  const questionsById = useMemo(
    () => new Map((evaluation?.questions ?? []).map((question) => [question.id, question])),
    [evaluation],
  );
  const scenariosById = useMemo(
    () => new Map((evaluation?.scenarios ?? []).map((scenario) => [scenario.id, scenario])),
    [evaluation],
  );

  const metadataDirty = form !== null && isMetadataDirty(evaluation, form);
  const questionsDirty = Object.entries(drafts).some(([id, draft]) => {
    const question = questionsById.get(id);

    return question !== undefined && isQuestionDraftDirty(question, draft);
  });
  const scenariosDirty = Object.entries(scenarioDrafts).some(([id, content]) => {
    const scenario = scenariosById.get(id);

    return scenario !== undefined && !sameRichText(content, scenario.content);
  });
  const dirty = metadataDirty || questionsDirty || scenariosDirty;
  const { allowNextNavigation } = useUnsavedChangesGuard(dirty, BUILDER_COPY.leaveConfirm);

  const metadataErrors = useMemo(
    () => (showValidation && form ? validateMetadata(form) : {}),
    [showValidation, form],
  );

  const updateForm = useCallback((next: MetadataForm) => {
    setFormState({ key: evaluationId, form: next });
  }, [evaluationId]);

  const changeType = useCallback((type: EvaluationType) => {
    if (creating && form) {
      updateForm(changeMetadataType(form, type));
    }
  }, [creating, form, updateForm]);

  const questionDraft = useCallback(
    (question: BuilderQuestion): QuestionDraft | null => drafts[question.id] ?? null,
    [drafts],
  );

  const questionErrors = useCallback((question: BuilderQuestion): QuestionErrors | null => {
    const draft = drafts[question.id];

    if (!showValidation || !draft) {
      return null;
    }

    const errors = validateQuestionDraft(question.type, draft);

    return hasQuestionErrors(errors) ? errors : null;
  }, [drafts, showValidation]);

  const isQuestionDirty = useCallback((questionId: string): boolean => {
    const question = questionsById.get(questionId);
    const draft = drafts[questionId];

    return question !== undefined && draft !== undefined && isQuestionDraftDirty(question, draft);
  }, [drafts, questionsById]);

  const updateQuestionDraft = useCallback((questionId: string, draft: QuestionDraft) => {
    setDrafts((current) => ({ ...current, [questionId]: draft }));
  }, []);

  const scenarioContent = useCallback((scenarioId: string): RichDoc | null => scenarioDrafts[scenarioId] ?? null, [scenarioDrafts]);

  const updateScenarioContent = useCallback((scenarioId: string, content: RichDoc) => {
    setScenarioDrafts((current) => ({ ...current, [scenarioId]: content }));
  }, []);

  const reportError = useCallback((outcome: Extract<AuthoringMutationOutcome<unknown>, { status: "error" }>, prefix?: string) => {
    if (outcome.code === STRUCTURE_LOCKED_CODE) {
      setLockedNotice(true);
    }

    toast.error(prefix ? `${prefix} ${outcome.message}` : outcome.message);
  }, [toast]);

  const isValid = (): boolean => {
    if (!form || hasErrors(validateMetadata(form))) {
      return false;
    }

    return Object.entries(drafts).every(([id, draft]) => {
      const question = questionsById.get(id);

      return !question || !isQuestionDraftDirty(question, draft) || !hasQuestionErrors(validateQuestionDraft(question.type, draft));
    });
  };

  const create = async(current: MetadataForm) => {
    const outcome = await run(() => createEvaluation(toCreateEvaluationDTO(toCreateEvaluationBody(current))));

    if (outcome.status === "success") {
      toast.success(BUILDER_COPY.created);
      allowNextNavigation();
      void router.replace(buildEvaluationEditUrl(outcome.value));
    } else if (outcome.status === "error") {
      reportError(outcome);
    }
  };

  const saveChanges = async(current: BuilderEvaluation, currentForm: MetadataForm): Promise<SaveSummary> => {
    const summary: SaveSummary = {
      metadataSaved: false,
      savedQuestions: new Map(),
      createdOptionIds: new Map(),
      invalidQuestionIds: [],
      questionErrors: {},
      savedScenarios: new Map(),
      scenarioErrors: {},
      messages: [],
      locked: false,
      invalid: false,
    };
    const changes = toUpdateEvaluationChanges(current, currentForm);

    if (Object.keys(changes).length > 0) {
      try {
        await updateEvaluation(current.id, toUpdateEvaluationDTO(changes));
        summary.metadataSaved = true;
      } catch (caught) {
        recordFailure(summary, toApiError(caught));
      }
    }

    for (const [scenarioId, content] of Object.entries(scenarioDrafts)) {
      const scenario = scenariosById.get(scenarioId);

      if (!scenario || sameRichText(content, scenario.content)) {
        continue;
      }

      try {
        await updateScenario(current.id, scenarioId, { content });
        summary.savedScenarios.set(scenarioId, content);
      } catch (caught) {
        summary.scenarioErrors[scenarioId] = recordFailure(summary, toApiError(caught));
      }
    }

    for (const [questionId, draft] of Object.entries(drafts)) {
      const question = questionsById.get(questionId);

      if (!question || !isQuestionDraftDirty(question, draft)) {
        continue;
      }

      const createdIds = new Map<string, string>();

      summary.createdOptionIds.set(questionId, createdIds);

      try {
        await saveQuestionDraft(current.id, question, draft, createdIds);
        summary.savedQuestions.set(questionId, draft);
      } catch (caught) {
        const apiError = toApiError(caught);

        summary.questionErrors[questionId] = recordFailure(summary, apiError);

        if (apiError.status === 422) {
          summary.invalidQuestionIds.push(questionId);
        }
      }
    }

    return summary;
  };

  const applySummary = (summary: SaveSummary, savedForm: FormState | null, savedDrafts: Record<string, QuestionDraft>) => {
    if (summary.metadataSaved) {
      // Back to the backend values unless the form changed while saving.
      setFormState((currentState) => (currentState === savedForm ? null : currentState));
    }

    setDrafts((currentDrafts) => {
      const next = { ...currentDrafts };

      for (const [id, createdIds] of summary.createdOptionIds) {
        const draft = next[id];

        if (summary.savedQuestions.get(id) === draft) {
          // Untouched while saving: the reloaded question is the new baseline.
          delete next[id];
        } else if (draft) {
          // Edited while saving or failed: keep the current draft, with the ids of the options already created.
          next[id] = withCreatedOptionIds(draft, createdIds);
        }
      }

      if (summary.locked) {
        // The backend refuses structural edits now: drop them so the next save does not repeat the 409.
        for (const [id, draft] of Object.entries(next)) {
          const question = questionsById.get(id);

          if (question) {
            next[id] = stripStructuralEdits(question, draft);
          }
        }
      }

      return next;
    });
    setScenarioDrafts((currentDrafts) => {
      const next = { ...currentDrafts };

      for (const [id, saved] of summary.savedScenarios) {
        if (next[id] === saved) {
          delete next[id];
        }
      }

      return next;
    });
    setSaveErrors({ ...summary.scenarioErrors, ...summary.questionErrors });

    if (summary.locked) {
      setLockedNotice(true);
      toast.info(BUILDER_COPY.structuralDiscarded);
    }

    if (summary.invalid && evaluation) {
      // The backend rolled the change back and sends no issues: check the drafts that were sent.
      const failed = new Set(summary.invalidQuestionIds);
      const issues = validateEvaluationReadiness(readinessQuestionsFrom(evaluation, savedDrafts))
        .filter((issue) => issue.questionId === null || failed.has(issue.questionId));

      setClientIssues(issues);
      setShowIssues(true);
    } else {
      setClientIssues([]);
    }

    if (summary.messages.length === 0) {
      setShowValidation(false);
      toast.success(BUILDER_COPY.saved);
    } else {
      toast.error(summary.messages.length === 1 ? summary.messages[0] ?? BUILDER_COPY.partialSaveFailed : BUILDER_COPY.partialSaveFailed);
    }
  };

  const save = async() => {
    if (savingRef.current || !form) {
      return;
    }

    setShowValidation(true);

    if (!isValid()) {
      toast.error(BUILDER_COPY.fixErrors);

      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      if (creating || !evaluation) {
        await create(form);

        return;
      }

      const savedForm = formState;
      const savedDrafts = drafts;
      const outcome = await run(() => saveChanges(evaluation, form));

      if (outcome.status === "success") {
        applySummary(outcome.value, savedForm, savedDrafts);
      } else if (outcome.status === "error") {
        reportError(outcome);
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const addQuestionOfType = async(type: QuestionType, scenarioId: string | null) => {
    if (!evaluation) {
      return;
    }

    const outcome = await run(() => addQuestion(evaluation.id, newQuestionBody(type, scenarioId)));

    if (outcome.status === "success") {
      toast.success(BUILDER_COPY.questionAdded);
    } else if (outcome.status === "error") {
      reportError(outcome);
    }
  };

  const deleteQuestion = async(questionId: string): Promise<boolean> => {
    if (!evaluation) {
      return false;
    }

    if (evaluation.status === "READY" && evaluation.questions.length === 1) {
      // The backend refuses to leave a READY evaluation without questions.
      toast.error(BUILDER_COPY.readyHint);

      return true;
    }

    const outcome = await run(() => removeQuestion(evaluation.id, questionId));

    if (outcome.status === "success") {
      setDrafts((current) => {
        const next = { ...current };

        delete next[questionId];

        return next;
      });
      toast.success(BUILDER_COPY.questionDeleted);
    } else if (outcome.status === "error") {
      reportError(outcome);
    }

    return outcome.status !== "busy";
  };

  const addNewScenario = async() => {
    if (!evaluation) {
      return;
    }

    const outcome = await run(() => addScenario(evaluation.id, { content: emptyDoc() }));

    if (outcome.status === "success") {
      toast.success(BUILDER_COPY.scenarioAdded);
    } else if (outcome.status === "error") {
      reportError(outcome);
    }
  };

  const deleteScenario = async(scenarioId: string): Promise<boolean> => {
    if (!evaluation) {
      return false;
    }

    const outcome = await run(() => removeScenario(evaluation.id, scenarioId));

    if (outcome.status === "success") {
      setScenarioDrafts((current) => {
        const next = { ...current };

        delete next[scenarioId];

        return next;
      });
      toast.success(BUILDER_COPY.scenarioDeleted);
    } else if (outcome.status === "error") {
      reportError(outcome);
    }

    return outcome.status !== "busy";
  };

  const applyLayout = async(next: QuestionLayout, persist: (id: string) => Promise<void>) => {
    if (!evaluation) {
      return;
    }

    // Optimistic: shown at once, reverted when the backend refuses it.
    setLayoutOverride(next);

    const outcome = await run(() => persist(evaluation.id));

    setLayoutOverride(null);

    if (outcome.status === "error") {
      reportError(outcome, BUILDER_COPY.reorderFailed);
    }
  };

  const applyQuestionLayout = (next: QuestionLayout) =>
    applyLayout(next, (id) => reorderQuestions(id, toQuestionOrderItems(next)));

  const applyScenarioLayout = (next: QuestionLayout) =>
    applyLayout(next, (id) => reorderScenarios(id, toOrderItems(next.scenarios.map((scenario) => scenario.id))));

  const duplicate = async() => {
    if (!evaluation) {
      return;
    }

    const outcome = await run(() => duplicateEvaluation(evaluation.id));

    if (outcome.status === "success") {
      toast.success(BUILDER_COPY.duplicated);
      void router.push(buildEvaluationEditUrl(outcome.value));
    } else if (outcome.status === "error") {
      reportError(outcome);
    }
  };

  const markReady = async() => {
    if (!evaluation || savingRef.current) {
      return;
    }

    if (dirty) {
      toast.error(BUILDER_COPY.saveBeforeStatus);

      return;
    }

    const issues = validateEvaluationReadiness(readinessQuestionsFrom(evaluation, {}));

    if (issues.length > 0) {
      setClientIssues(issues);
      toast.error(BUILDER_COPY.notReady);

      return;
    }

    const outcome = await run(() => changeEvaluationStatus(evaluation.id, "READY"));

    if (outcome.status === "success") {
      setClientIssues([]);
      setShowIssues(false);
      toast.success(BUILDER_COPY.markedReady);
    } else if (outcome.status === "error" && outcome.httpStatus === 422) {
      // The evaluation stayed in DRAFT: its readiness issues are the backend's verdict.
      await reload().catch(() => undefined);
      setClientIssues([]);
      setShowIssues(true);
      toast.error(BUILDER_COPY.notReady);
    } else if (outcome.status === "error") {
      reportError(outcome);
    }
  };

  const markDraft = async() => {
    if (!evaluation || savingRef.current) {
      return;
    }

    const outcome = await run(() => changeEvaluationStatus(evaluation.id, "DRAFT"));

    if (outcome.status === "success") {
      toast.success(BUILDER_COPY.backInDraft);
    } else if (outcome.status === "error") {
      reportError(outcome);
    }
  };

  const issuesFor = useCallback((questionId: string): ReadinessIssue[] => {
    const server = showIssues && evaluation ? evaluation.readinessIssues : [];
    const seen = new Set<string>();

    return [...server, ...clientIssues].filter((issue) => {
      const id = `${issue.code}|${issue.questionId ?? ""}`;

      if (issue.questionId !== questionId || seen.has(id)) {
        return false;
      }

      seen.add(id);

      return true;
    });
  }, [clientIssues, evaluation, showIssues]);

  const generalIssues = useMemo(() => {
    const server = showIssues && evaluation ? evaluation.readinessIssues : [];
    const all = [...server, ...clientIssues].filter((issue) => issue.questionId === null);

    return all.filter((issue, index) => all.findIndex((other) => other.code === issue.code) === index);
  }, [clientIssues, evaluation, showIssues]);

  const layout = layoutOverride ?? (evaluation ? layoutFrom(evaluation.scenarios, evaluation.questions) : null);

  return {
    creating,
    evaluation,
    isLoading,
    loadError,
    reload,
    form,
    metadataErrors,
    updateForm,
    changeType,
    layout,
    questionDraft,
    questionErrors,
    isQuestionDirty,
    updateQuestionDraft,
    scenarioContent,
    updateScenarioContent,
    saveErrors,
    issuesFor,
    generalIssues,
    locked: Boolean(evaluation?.structureLocked) || lockedNotice,
    dirty,
    pending,
    saving,
    save,
    markReady,
    markDraft,
    addQuestionOfType,
    deleteQuestion,
    addNewScenario,
    deleteScenario,
    applyQuestionLayout,
    applyScenarioLayout,
    duplicate,
  };
}
