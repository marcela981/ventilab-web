/*
* Funcionalidad: useEvaluationBuilder
* Descripción: State and actions of the evaluation builder. Holds a local draft over the evaluation loaded from `GET /api/evaluations/{id}` (null id: a new evaluation): the metadata form, the edited questions (prompt, points, explanation, options) and the edited scenario contents; dirty is true while any of them differs from the backend. save() validates and persists only the changed parts: creating sends `POST /api/evaluations` and replaces the route with the editor of the new evaluation; editing sends the metadata PATCH, one PATCH per edited scenario and, per edited question, its PATCH plus the option POST/PATCH/DELETE calls and `PUT .../options/order` when the order changed. Each part is saved independently: a failed part keeps its draft (created options keep their new ids) and its message is shown on its card; a 409 evaluation.has_submitted_attempts raises the structure-locked banner and a 422 re-reads the readiness issues to show them on the questions. Structural actions apply at once: add or delete questions and scenarios, the drag-and-drop reorders (`PUT .../questions/order` and `PUT .../scenarios/order`, shown optimistically and reverted with a toast on failure) and duplicate (opens the copy). Mutations are single-flight and refresh every authoring key. Depends on React, next/router, @shared/api-client, the design-system toast, the authoring services, mappers, entities and hooks.
* Versión: 1.0
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
  validateQuestionDraft,
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
import type { BuilderEvaluation, BuilderQuestion, MetadataErrors, MetadataForm } from "../entities/evaluation-builder.entity";
import { useAuthoringMutation } from "./use-authoring-mutation";
import type { AuthoringMutationOutcome } from "./use-authoring-mutation";
import { useEvaluationDetail } from "./use-evaluation-detail";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

export const STRUCTURE_LOCKED_CODE = "evaluation.has_submitted_attempts";

type FormState = { key: string | null, form: MetadataForm };

type SaveSummary = {
  metadataSaved: boolean
  savedQuestions: Map<string, QuestionDraft>
  failedQuestions: Map<string, QuestionDraft>
  questionErrors: Record<string, string>
  savedScenarios: Map<string, RichDoc>
  scenarioErrors: Record<string, string>
  messages: string[]
  locked: boolean
  invalid: boolean
};

async function saveQuestionDraft(evaluationId: string, question: BuilderQuestion, draft: QuestionDraft, working: { draft: QuestionDraft }): Promise<void> {
  const plan = planQuestionSave(question, draft);
  const createdIds = new Map<string, string>();

  if (plan.question) {
    await updateQuestion(evaluationId, question.id, plan.question);
  }

  for (const option of plan.creates) {
    const id = await addOption(evaluationId, question.id, {
      content: option.content.trim(),
      isCorrect: option.isCorrect,
      ...(option.mediaId ? { mediaId: option.mediaId } : {}),
    });

    createdIds.set(option.key, id);
    // A later failure must not create this option again.
    working.draft = {
      ...working.draft,
      options: working.draft.options.map((item) => (item.key === option.key ? { ...item, id } : item)),
    };
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
  showIssues: boolean
  locked: boolean
  dirty: boolean
  pending: boolean
  saving: boolean
  save: () => Promise<void>
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
      failedQuestions: new Map(),
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

      const working = { draft };

      try {
        await saveQuestionDraft(current.id, question, draft, working);
        summary.savedQuestions.set(questionId, draft);
      } catch (caught) {
        summary.questionErrors[questionId] = recordFailure(summary, toApiError(caught));
        summary.failedQuestions.set(questionId, working.draft);
      }
    }

    return summary;
  };

  const applySummary = (summary: SaveSummary, savedForm: FormState | null) => {
    if (summary.metadataSaved) {
      // Back to the backend values unless the form changed while saving.
      setFormState((currentState) => (currentState === savedForm ? null : currentState));
    }

    setDrafts((currentDrafts) => {
      const next = { ...currentDrafts };

      for (const [id, saved] of summary.savedQuestions) {
        if (next[id] === saved) {
          delete next[id];
        }
      }

      for (const [id, failed] of summary.failedQuestions) {
        next[id] = failed;
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
    }

    if (summary.invalid) {
      setShowIssues(true);
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
      const outcome = await run(() => saveChanges(evaluation, form));

      if (outcome.status === "success") {
        applySummary(outcome.value, savedForm);
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
    showIssues,
    locked: Boolean(evaluation?.structureLocked) || lockedNotice,
    dirty,
    pending,
    saving,
    save,
    addQuestionOfType,
    deleteQuestion,
    addNewScenario,
    deleteScenario,
    applyQuestionLayout,
    applyScenarioLayout,
    duplicate,
  };
}
