/*
* Funcionalidad: AiRatingWidget
* Descripción: "¿Te fue útil?" widget for AI outputs: thumbs up/down toggle buttons (aria-pressed, labelled group), disabled while loading or saving, optional comment with a 0/2000 counter once a thumb is chosen, error alert on failure and a thank-you status after saving. Props `{targetType, targetId, initialRating?}`; remount it (key) to rate another target. Depends on MUI and useAiRating.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { cx } from "@shared/lib/class-names";
import styles from "../UI/ai-rating-widget.module.css";
import { AI_RATING_COMMENT_MAX } from "./ai-rating.entity";
import type { AiRating, AiRatingTargetType } from "./ai-rating.entity";
import { useAiRating } from "./use-ai-rating";

export type AiRatingWidgetProps = {
  targetType: AiRatingTargetType
  targetId: string
  initialRating?: AiRating | null
  className?: string
};

// TODO(i18n): move the copy to an i18next namespace once src/i18n is in scope.
export function AiRatingWidget({ targetType, targetId, initialRating, className }: AiRatingWidgetProps) {
  const questionId = useId();
  const commentId = useId();
  const rating = useAiRating({ targetType, targetId, ...(initialRating === undefined ? {} : { initialRating }) });
  const [draft, setDraft] = useState<string | null>(null);
  const savedComment = rating.savedRating?.comment ?? "";
  const comment = draft ?? savedComment;
  const tooLong = comment.length > AI_RATING_COMMENT_MAX;
  const isBusy = rating.isSaving || rating.isLoading;
  const canSubmit = !isBusy && !tooLong && comment.trim() !== savedComment;

  const submit = async(event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (await rating.saveComment(comment)) {
      setDraft(null);
    }
  };

  return (
    <section className={cx(styles.root, className)} aria-labelledby={questionId}>
      <div className={styles.question}>
        <Typography id={questionId} variant="body2" component="h3" className={cx(styles.title)}>
          ¿Te fue útil?
        </Typography>
        <div role="group" aria-labelledby={questionId} className={styles.thumbs}>
          <IconButton
            aria-label="Sí, fue útil"
            aria-pressed={rating.selected === true}
            color={rating.selected === true ? "primary" : "default"}
            disabled={isBusy}
            onClick={() => rating.rate(true)}
          >
            {rating.selected === true ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
          </IconButton>
          <IconButton
            aria-label="No fue útil"
            aria-pressed={rating.selected === false}
            color={rating.selected === false ? "primary" : "default"}
            disabled={isBusy}
            onClick={() => rating.rate(false)}
          >
            {rating.selected === false ? <ThumbDownIcon /> : <ThumbDownOutlinedIcon />}
          </IconButton>
        </div>
      </div>
      {rating.selected === null ? null : (
        <form className={styles.comment} onSubmit={(event) => void submit(event)}>
          <TextField
            id={commentId}
            label="Comentario (opcional)"
            value={comment}
            onChange={(event) => setDraft(event.target.value)}
            multiline
            minRows={2}
            size="small"
            fullWidth
            disabled={rating.isSaving}
            error={tooLong}
            helperText={`${comment.length}/${AI_RATING_COMMENT_MAX}`}
            slotProps={{ htmlInput: { maxLength: AI_RATING_COMMENT_MAX } }}
          />
          <Button type="submit" variant="outlined" size="small" disabled={!canSubmit} className={cx(styles.submit)}>
            Enviar comentario
          </Button>
        </form>
      )}
      {rating.error ? <Alert severity="error">{rating.error}</Alert> : null}
      {rating.hasSaved && !rating.error && !rating.isSaving ? (
        <Typography role="status" variant="body2" className={cx(styles.thanks)}>
          ¡Gracias por tu valoración!
        </Typography>
      ) : null}
    </section>
  );
}
