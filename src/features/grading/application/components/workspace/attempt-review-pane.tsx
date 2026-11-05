/*
* Funcionalidad: AttemptReviewPane
* Descripción: Review pane of one attempt in the "Revisar" tab of the unified grading screen /grading/evaluations/[evaluationId]?attempt=<id> (DISENO_BLOQUE3 §2.8; extracted from the former grade-attempt page /grading/attempts/[attemptId], which now resolves to this screen). Reads the attempt (`GET /api/evaluation-grading/attempts/{attemptId}`) and its AI feedback. Shows the student and attempt, the status, publication, grade with pass/fail from the API, score and passing grade (legacy attempts are read-only), a question navigator, each answer with its grading card (the scenario above the first of its questions; SIMULATION answers with the server rubric breakdown), "Guardar" (only the changed answers, one PUT at a time; overriding a score needs a comment; backend 422 codes land on their field; a failed save keeps its draft and a failed read-back keeps every draft with a reload alert), "Publicar" after confirmation (GRADED attempts only, nothing unsaved) and the AI feedback panel with "Regenerar" (409 when a generation is already running and 429 when regenerating too often are shown in the panel). Unsaved grades are reported to the screen (onDirtyChange), which asks before switching attempts; the browser and other routes are guarded by useUnsavedGradesGuard. Depends on React, MUI, the evaluations entry points (scenario, status badge), the design-system components, @shared/lib, the grading services, hooks, entities and components and the grade-attempt CSS Module. v2.1 (ajustes C1): "Publicar" becomes two releases, "Liberar nota" (scope GRADE) and "Liberar nota y respuestas" (scope GRADE_AND_ANSWERS: also the correct answers, explanations and AI feedback), each with its confirmation; the summary shows the release state ("Sin liberar", "Nota liberada", "Nota y respuestas liberadas"); once the grade is released only the answers release remains, and after both (or for a legacy attempt) none.
* Versión: 2.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useEffect, useMemo, useRef, useState } from "react";
import { AttemptStatusBadge, ScenarioPanel } from "@features/evaluations/review.entry";
import { toApiError } from "@shared/api-client/api-error";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { ErrorState } from "@shared/design-system/components/error-state";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { formatDateTime, formatGrade } from "@shared/lib/format";
import { gradeAnswer, publishAttemptGrade, regenerateFeedback } from "../../../api/services/grading.service";
import { AnswerGradingCard, gradingAnchorId } from "../attempt/answer-grading-card";
import { GradingFeedbackPanel } from "../attempt/feedback-panel";
import { formatPoints, GRADE_COPY } from "../../entities/grade-attempt-copy";
import {
  hasErrors,
  initialDraft,
  isDraftDirty,
  passState,
  toGradeAnswerBody,
  validateDraft,
} from "../../entities/grading-attempt.entity";
import type { GradeDraft, GradeDraftErrors, GradingAttempt, GradingItem } from "../../entities/grading-attempt.entity";
import { getGradingErrorMessage } from "../../entities/grading-error-messages";
import { canRelease, RELEASE_STATE_LABELS, releaseStateOf } from "../../entities/results-release.entity";
import type { ReleaseScope } from "../../entities/results-release.entity";
import { useGradingAttempt } from "../../hooks/use-grading-attempt";
import { useGradingFeedback } from "../../hooks/use-grading-feedback";
import { useGradingMutation } from "../../hooks/use-grading-mutation";
import { useUnsavedGradesGuard } from "../../hooks/use-unsaved-grades-guard";
import styles from "../../../UI/grade-attempt.module.css";

export type AttemptReviewPaneProps = {
  attemptId: string
  // Name or email of the student, from the attempts list (the attempt itself only carries the id).
  studentLabel?: string | null | undefined
  // Reports whether there are unsaved grades, so the screen can ask before switching attempts.
  onDirtyChange?: ((dirty: boolean) => void) | undefined
};

// The backend 422 codes of a grade map to the field they are about.
export function toAnswerErrors(error: unknown): GradeDraftErrors {
  const apiError = toApiError(error);
  const message = getGradingErrorMessage(apiError);

  if (apiError.code === "evaluation.manual_score_invalid") {
    return { score: message };
  }

  if (apiError.code === "evaluation.grade_override_comment_required") {
    return { comment: message };
  }

  return { general: message };
}

const RELEASE_COPY: Record<ReleaseScope, { action: string, title: string, description: string, toast: string }> = {
  GRADE: {
    action: GRADE_COPY.releaseGrade,
    title: GRADE_COPY.releaseGradeTitle,
    description: GRADE_COPY.releaseGradeDescription,
    toast: GRADE_COPY.releasedGradeToast,
  },
  GRADE_AND_ANSWERS: {
    action: GRADE_COPY.releaseAll,
    title: GRADE_COPY.releaseAllTitle,
    description: GRADE_COPY.releaseAllDescription,
    toast: GRADE_COPY.releasedAllToast,
  },
};

function AttemptSummary({ attempt }: { attempt: GradingAttempt }) {
  const state = passState(attempt);
  const release = releaseStateOf(attempt);

  return (
    <section className={cx(styles.summary)} aria-label={GRADE_COPY.gradeLabel}>
      <div className={cx(styles.summaryRow)}>
        <AttemptStatusBadge status={attempt.status} />
        <span className={cx(styles.publication, release !== "none" ? styles.publicationDone : undefined)} data-testid="release-state">
          {RELEASE_STATE_LABELS[release]}
        </span>
        {attempt.submittedAt ? <span className={cx(styles.muted)}>{GRADE_COPY.submittedAt(formatDateTime(attempt.submittedAt))}</span> : null}
      </div>
      <div className={cx(styles.summaryRow)}>
        {attempt.grade === null ? (
          <span className={cx(styles.muted)}>{GRADE_COPY.noGrade}</span>
        ) : (
          <span className={cx(styles.grade, state === "passed" ? styles.gradePassed : styles.gradeFailed)}>
            <span>{GRADE_COPY.gradeLabel}</span>
            <span>{formatGrade(attempt.grade)}</span>
            <span>· {state === "passed" ? GRADE_COPY.passed : GRADE_COPY.failed}</span>
          </span>
        )}
        {attempt.score !== null && attempt.maxScore !== null ? (
          <span>{GRADE_COPY.score(formatPoints(attempt.score), formatPoints(attempt.maxScore))}</span>
        ) : null}
        <span className={cx(styles.muted)}>{GRADE_COPY.passingGrade(formatGrade(attempt.passingGrade))}</span>
      </div>
      {attempt.legacy ? <Alert severity="info">{GRADE_COPY.legacy}</Alert> : null}
    </section>
  );
}

function QuestionNavigator({ items }: { items: readonly GradingItem[] }) {
  return (
    <nav aria-label={GRADE_COPY.navigatorLabel} className={cx(styles.navigator)}>
      <ol className={cx(styles.navigatorList)}>
        {items.map((item) => (
          <li key={item.question.id}>
            <a
              href={`#${gradingAnchorId(item.question.id)}`}
              aria-label={GRADE_COPY.navigatorItem(item.question.position, item.pending)}
              className={cx(styles.navigatorLink, item.pending && styles.navigatorPending)}
            >
              {item.question.position}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AttemptReviewPane({ attemptId, studentLabel, onDirtyChange }: AttemptReviewPaneProps) {
  const toast = useToast();
  const { attempt, isLoading, error, reload, refetch } = useGradingAttempt(attemptId);
  const feedback = useGradingFeedback(attemptId);
  const { pending: mutating, run, refresh } = useGradingMutation();
  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>({});
  const [errors, setErrors] = useState<Record<string, GradeDraftErrors>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  // The release the teacher is confirming (null while no dialog is open).
  const [confirmScope, setConfirmScope] = useState<ReleaseScope | null>(null);
  // Kept after closing so the dialog does not go blank while it fades out.
  const [dialogScope, setDialogScope] = useState<ReleaseScope>("GRADE");
  const [regenerating, setRegenerating] = useState(false);
  // Saved answers whose fresh values could not be read back; their drafts stay until a reload succeeds.
  const [staleSaved, setStaleSaved] = useState<string[]>([]);
  const [reloadingStale, setReloadingStale] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const items = useMemo(() => attempt?.items ?? [], [attempt]);
  const dirtyItems = useMemo(
    () => items.filter((item) => {
      const draft = drafts[item.question.id];

      return draft !== undefined && isDraftDirty(item, draft);
    }),
    [items, drafts],
  );
  const dirtyCount = dirtyItems.length;
  const positions = useMemo(() => new Map(items.map((item) => [item.question.id, item.question.position])), [items]);
  const readOnly = attempt?.legacy ?? false;

  useUnsavedGradesGuard(dirtyCount > 0, GRADE_COPY.unsavedPrompt);

  useEffect(() => {
    onDirtyChange?.(dirtyCount > 0);
  }, [dirtyCount, onDirtyChange]);

  useEffect(() => () => {
    onDirtyChange?.(false);
  }, [onDirtyChange]);

  const dropDrafts = (questionIds: readonly string[]) => {
    setDrafts((current) => {
      const next = { ...current };

      for (const questionId of questionIds) {
        delete next[questionId];
      }

      return next;
    });
  };

  const changeDraft = (questionId: string, draft: GradeDraft) => {
    setDrafts((current) => ({ ...current, [questionId]: draft }));
    setErrors((current) => {
      if (!current[questionId]) {
        return current;
      }

      const next = { ...current };

      delete next[questionId];

      return next;
    });
  };

  const save = async() => {
    if (savingRef.current || dirtyCount === 0) {
      return;
    }

    const validation: Record<string, GradeDraftErrors> = {};

    for (const item of dirtyItems) {
      const itemErrors = validateDraft(item, drafts[item.question.id] ?? initialDraft(item));

      if (hasErrors(itemErrors)) {
        validation[item.question.id] = itemErrors;
      }
    }

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      toast.error(GRADE_COPY.fixErrors);

      return;
    }

    savingRef.current = true;
    setSaving(true);

    const saved: string[] = [];
    const failures: Record<string, GradeDraftErrors> = {};

    // One answer at a time: each PUT recomputes the attempt on the server.
    for (const item of dirtyItems) {
      const body = toGradeAnswerBody(item, drafts[item.question.id] ?? initialDraft(item));

      if (!body) {
        continue;
      }

      try {
        await gradeAnswer(attemptId, item.question.id, body);
        saved.push(item.question.id);
      } catch (caught) {
        failures[item.question.id] = toAnswerErrors(caught);
      }
    }

    if (saved.length > 0) {
      const [attemptRead] = await Promise.all([refetch(), refresh()]);

      if (attemptRead) {
        dropDrafts(saved);
        setStaleSaved([]);
      } else {
        // The drafts stay: dropping them would show the old server values as if the save had not happened.
        setStaleSaved(saved);
      }
    }

    setErrors(failures);

    // One toast at a time: the failures matter more than the saved count.
    if (Object.keys(failures).length > 0) {
      toast.error(GRADE_COPY.saveFailed);
    } else if (saved.length > 0) {
      toast.success(GRADE_COPY.saved(saved.length));
    }

    savingRef.current = false;
    setSaving(false);
  };

  const reloadAfterSave = async() => {
    setReloadingStale(true);

    const attemptRead = await refetch();

    setReloadingStale(false);

    if (attemptRead) {
      dropDrafts(staleSaved);
      setStaleSaved([]);
    }
  };

  const release = async(scope: ReleaseScope) => {
    const outcome = await run(() => publishAttemptGrade(attemptId, scope));

    if (outcome.status === "success") {
      setConfirmScope(null);
      toast.success(outcome.value.alreadyPublished ? GRADE_COPY.alreadyReleasedToast : RELEASE_COPY[scope].toast);
    } else if (outcome.status === "error") {
      setConfirmScope(null);
      toast.error(outcome.message);
    }
  };

  const regenerate = async() => {
    setRegenerating(true);
    setRegenerateError(null);

    const outcome = await run(() => regenerateFeedback(attemptId));

    setRegenerating(false);

    if (outcome.status === "success") {
      toast.info(GRADE_COPY.regenerated);
    } else if (outcome.status === "error") {
      // 409 (a generation is already running) and 429 (too many regenerations) stay visible in the panel.
      if (outcome.httpStatus === 409 || outcome.httpStatus === 429) {
        setRegenerateError(outcome.message);
      } else {
        toast.error(outcome.message);
      }
    }
  };

  const busy = saving || mutating;
  const releaseState = attempt ? releaseStateOf(attempt) : "none";
  // Once the grade is released only the answers remain; a legacy attempt is read-only and a full release is final.
  const releaseScopes: ReleaseScope[] = [];

  if (attempt && !attempt.legacy) {
    if (releaseState === "none") {
      releaseScopes.push("GRADE", "GRADE_AND_ANSWERS");
    } else if (releaseState === "grade") {
      releaseScopes.push("GRADE_AND_ANSWERS");
    }
  }

  const actions = (
    <div className={cx(styles.headerActions)}>
      {attempt ? (
        <>
          <AsyncButton variant="contained" disabled={dirtyCount === 0 || busy || readOnly} loading={saving} onClick={save}>
            {GRADE_COPY.save}
          </AsyncButton>
          {releaseScopes.map((scope) => (
            <Button
              key={scope}
              variant="outlined"
              disabled={!canRelease(attempt, scope) || dirtyCount > 0 || busy}
              onClick={() => {
                setDialogScope(scope);
                setConfirmScope(scope);
              }}
            >
              {RELEASE_COPY[scope].action}
            </Button>
          ))}
        </>
      ) : null}
    </div>
  );

  const releaseHint = () => {
    if (releaseScopes.length === 0) {
      return null;
    }

    if (attempt?.status !== "GRADED") {
      return <p className={cx(styles.muted)}>{GRADE_COPY.releaseNeedsGraded}</p>;
    }

    return dirtyCount > 0 ? <p className={cx(styles.muted)}>{GRADE_COPY.releaseNeedsSave}</p> : null;
  };

  const renderBody = () => {
    if (!attempt) {
      if (error && !isLoading) {
        return (
          <ErrorState title={GRADE_COPY.loadErrorTitle} description={getGradingErrorMessage(error)} onRetry={() => void reload()} />
        );
      }

      return <CardSkeleton label={GRADE_COPY.loading} />;
    }

    return (
      <div className={cx(styles.content)}>
        <div className={cx(styles.paneHeader)}>
          <h2 className={cx(styles.paneTitle)}>{GRADE_COPY.paneTitle(studentLabel ?? attempt.studentId, attempt.attemptNumber)}</h2>
          {actions}
        </div>
        <AttemptSummary attempt={attempt} />
        {staleSaved.length > 0 ? (
          <Alert
            severity="warning"
            action={(
              <AsyncButton color="inherit" size="small" loading={reloadingStale} onClick={() => void reloadAfterSave()}>
                {GRADE_COPY.reloadAttempt}
              </AsyncButton>
            )}
          >
            {GRADE_COPY.refreshFailed}
          </Alert>
        ) : null}
        {releaseHint()}
        {dirtyCount > 0 ? (
          <p className={cx(styles.dirty)} role="status">{GRADE_COPY.dirty(dirtyCount)}</p>
        ) : null}
        <div className={cx(styles.layout)}>
          <QuestionNavigator items={items} />
          <div className={cx(styles.questions)}>
            {items.map((item, index) => {
              const draft = drafts[item.question.id] ?? initialDraft(item);
              const { scenarioId } = item.question;
              // The scenario shows once, above the first of its questions.
              const firstOfScenario = scenarioId !== null && items[index - 1]?.question.scenarioId !== scenarioId;
              const scenario = firstOfScenario
                ? attempt.scenarios.find((candidate) => candidate.id === scenarioId) ?? null
                : null;

              return (
                <div key={item.question.id} className={cx(styles.questionBlock)}>
                  {scenario ? <ScenarioPanel scenario={scenario} /> : null}
                  <AnswerGradingCard
                    item={item}
                    draft={draft}
                    errors={errors[item.question.id] ?? {}}
                    dirty={isDraftDirty(item, draft)}
                    disabled={saving || readOnly}
                    onChange={(next) => changeDraft(item.question.id, next)}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <GradingFeedbackPanel
          feedback={feedback.feedback}
          loadFailed={feedback.error !== null && !feedback.isLoading}
          pollingStopped={feedback.pollingStopped}
          positions={positions}
          canRegenerate={attempt.status === "GRADED" && !attempt.legacy && !busy}
          regenerating={regenerating}
          regenerateError={regenerateError}
          onRegenerate={regenerate}
          onReload={() => void feedback.reload().catch(() => undefined)}
        />
      </div>
    );
  };

  return (
    <div className={cx(styles.pane)}>
      {renderBody()}
      <ConfirmDialog
        open={confirmScope !== null}
        title={RELEASE_COPY[dialogScope].title}
        description={RELEASE_COPY[dialogScope].description}
        confirmLabel={GRADE_COPY.releaseConfirm}
        cancelLabel={GRADE_COPY.cancel}
        isPending={mutating}
        onConfirm={() => {
          if (confirmScope) {
            void release(confirmScope);
          }
        }}
        onCancel={() => setConfirmScope(null)}
      />
    </div>
  );
}

