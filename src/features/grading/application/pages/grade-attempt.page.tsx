/*
* Funcionalidad: GradeAttemptPage
* Descripción: Staff page /grading/attempts/[attemptId] (teachers and admins). Loads the attempt for grading (`GET /api/evaluation-grading/attempts/{attemptId}`) and shows a header with the evaluation, attempt number, student, status badge, the grade in es-CO with pass/fail from `passed` (or the passingGrade of the API, never a fixed threshold), the passing grade and the publication state; a navigator of anchors to every question (pending ones marked) and one AnswerGradingCard per question. Every card keeps a draft (score and comment); "Guardar calificación" validates the changed drafts on the client (score in [0, points] with up to two decimals; a comment when the answer already had an automatic or manual score, mirroring 422 evaluation.grade_override_comment_required) and sends `PUT .../answers/{questionId}` one at a time; each failure stays on its card (manual_score_invalid on the score, override_comment_required on the comment, any other message as an alert) and keeps its draft, while saved drafts are dropped after the grading keys are refreshed (the backend recomputes the status, GRADED once nothing is pending). A dirty counter and an unsaved-changes guard (beforeunload and client navigation) protect the drafts. "Publicar" is enabled only for a GRADED, unpublished attempt without unsaved drafts and asks for confirmation before `POST .../publish` (idempotent, alreadyPublished). The AI feedback panel reads `GET .../feedback`, "Regenerar retroalimentación IA" sends `POST .../feedback/regenerate` (202, PENDING) and the pending feedback is polled with spaced delays and refreshed by the FEEDBACK_READY notification of this attempt. Loading, error with retry and a link back to /grading. Depends on MUI, next/head, next/link, the evaluations barrel, the design-system components, @shared/lib, @shared/realtime, the grading hooks, service, entities and components and the grade-attempt CSS Module.
* Versión: 1.0
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
import { useCallback, useMemo, useRef, useState } from "react";
import { AttemptStatusBadge, ScenarioPanel } from "@features/evaluations";
import { toApiError } from "@shared/api-client/api-error";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { formatDateTime, formatGrade } from "@shared/lib/format";
import { useSocketEvent } from "@shared/realtime";
import type { RealtimeEventMap } from "@shared/realtime";
import { gradeAnswer, publishAttemptGrade, regenerateFeedback } from "../../api/services/grading.service";
import { AnswerGradingCard, gradingAnchorId } from "../components/attempt/answer-grading-card";
import { GradingFeedbackPanel } from "../components/attempt/feedback-panel";
import { formatPoints, GRADE_COPY } from "../entities/grade-attempt-copy";
import {
  canPublish,
  hasErrors,
  initialDraft,
  isDraftDirty,
  passState,
  toGradeAnswerBody,
  validateDraft,
} from "../entities/grading-attempt.entity";
import type { GradeDraft, GradeDraftErrors, GradingAttempt, GradingItem } from "../entities/grading-attempt.entity";
import { getGradingErrorMessage } from "../entities/grading-error-messages";
import { GRADING_URL } from "../entities/grading-urls";
import { useGradingAttempt } from "../hooks/use-grading-attempt";
import { useGradingFeedback } from "../hooks/use-grading-feedback";
import { useGradingMutation } from "../hooks/use-grading-mutation";
import { useUnsavedGradesGuard } from "../hooks/use-unsaved-grades-guard";
import styles from "../../UI/grade-attempt.module.css";

export type GradeAttemptPageProps = {
  attemptId: string
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

function notificationAttemptId(payload: RealtimeEventMap["notification:new"]): string | null {
  const data = payload.data as Record<string, unknown> | null;
  const attemptId = data?.attemptId;

  return typeof attemptId === "string" ? attemptId : null;
}

function AttemptSummary({ attempt }: { attempt: GradingAttempt }) {
  const state = passState(attempt);

  return (
    <section className={cx(styles.summary)} aria-label={GRADE_COPY.gradeLabel}>
      <div className={cx(styles.summaryRow)}>
        <AttemptStatusBadge status={attempt.status} />
        <span className={cx(styles.publication, attempt.publishedAt ? styles.publicationDone : undefined)}>
          {attempt.publishedAt ? GRADE_COPY.published(formatDateTime(attempt.publishedAt)) : GRADE_COPY.unpublished}
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

export function GradeAttemptPage({ attemptId }: GradeAttemptPageProps) {
  const toast = useToast();
  const { attempt, isLoading, error, reload } = useGradingAttempt(attemptId);
  const feedback = useGradingFeedback(attemptId);
  const { pending: mutating, run, refresh } = useGradingMutation();
  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>({});
  const [errors, setErrors] = useState<Record<string, GradeDraftErrors>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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

  const reloadFeedback = feedback.reload;
  const handleNotification = useCallback((payload: RealtimeEventMap["notification:new"]) => {
    if (payload.type === "FEEDBACK_READY" && notificationAttemptId(payload) === attemptId) {
      void reloadFeedback().catch(() => undefined);
    }
  }, [attemptId, reloadFeedback]);

  useSocketEvent("notification:new", handleNotification);

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
      await refresh();
      setDrafts((current) => {
        const next = { ...current };

        for (const questionId of saved) {
          delete next[questionId];
        }

        return next;
      });
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

  const publish = async() => {
    const outcome = await run(() => publishAttemptGrade(attemptId));

    if (outcome.status === "success") {
      setConfirmPublish(false);
      toast.success(outcome.value.alreadyPublished ? GRADE_COPY.alreadyPublishedToast : GRADE_COPY.publishedToast);
    } else if (outcome.status === "error") {
      setConfirmPublish(false);
      toast.error(outcome.message);
    }
  };

  const regenerate = async() => {
    setRegenerating(true);

    const outcome = await run(() => regenerateFeedback(attemptId));

    setRegenerating(false);

    if (outcome.status === "success") {
      toast.info(GRADE_COPY.regenerated);
    } else if (outcome.status === "error") {
      toast.error(outcome.message);
    }
  };

  const publishable = attempt !== null && canPublish(attempt);
  const busy = saving || mutating;

  const actions = (
    <div className={cx(styles.headerActions)}>
      <Button component={Link} href={GRADING_URL} startIcon={<ArrowBackIcon />}>
        {GRADE_COPY.backToQueue}
      </Button>
      {attempt ? (
        <>
          <AsyncButton variant="contained" disabled={dirtyCount === 0 || busy || readOnly} loading={saving} onClick={save}>
            {GRADE_COPY.save}
          </AsyncButton>
          <Button variant="outlined" disabled={!publishable || dirtyCount > 0 || busy} onClick={() => setConfirmPublish(true)}>
            {GRADE_COPY.publish}
          </Button>
        </>
      ) : null}
    </div>
  );

  const publishHint = () => {
    if (!attempt || attempt.publishedAt || attempt.legacy) {
      return null;
    }

    if (attempt.status !== "GRADED") {
      return <p className={cx(styles.muted)}>{GRADE_COPY.publishNeedsGraded}</p>;
    }

    return dirtyCount > 0 ? <p className={cx(styles.muted)}>{GRADE_COPY.publishNeedsSave}</p> : null;
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
        <AttemptSummary attempt={attempt} />
        {publishHint()}
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
          onRegenerate={regenerate}
          onReload={() => void feedback.reload().catch(() => undefined)}
        />
      </div>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{GRADE_COPY.documentTitle(attempt?.evaluationTitle ?? GRADE_COPY.fallbackTitle)}</title>
      </Head>
      <PageHeader
        title={attempt?.evaluationTitle ?? GRADE_COPY.fallbackTitle}
        subtitle={attempt ? GRADE_COPY.subtitle(attempt.attemptNumber, attempt.studentId) : undefined}
        actions={actions}
      />
      {renderBody()}
      <ConfirmDialog
        open={confirmPublish}
        title={GRADE_COPY.publishTitle}
        description={GRADE_COPY.publishDescription}
        confirmLabel={GRADE_COPY.publishConfirm}
        cancelLabel={GRADE_COPY.cancel}
        isPending={mutating}
        onConfirm={() => void publish()}
        onCancel={() => setConfirmPublish(false)}
      />
    </div>
  );
}

