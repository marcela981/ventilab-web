import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Divider, Stack, TextField, Typography } from '@mui/material';
import { submissionApi } from '../../api/submission.api';

export default function SubmissionReviewer({ submission, onGraded }) {
  const maxScore = useMemo(
    () => submission?.maxScore ?? submission?.activity?.maxScore ?? 100,
    [submission]
  );

  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!submission) return;
    setScore(submission.score ?? '');
    setFeedback(submission.feedback ?? '');
  }, [submission]);

  if (!submission) {
    return (
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Selecciona una entrega para revisar.
      </Typography>
    );
  }

  const contentText =
    typeof submission.content?.text === 'string'
      ? submission.content.text
      : JSON.stringify(submission.content ?? {}, null, 2);

  const handleGrade = async () => {
    setIsSaving(true);
    try {
      const updated = await submissionApi.grade(submission.id, {
        score: Number(score),
        feedback: feedback || null,
      });
      onGraded?.(updated);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2, p: 2 }}>
      <Stack spacing={1}>
        <Typography sx={{ fontWeight: 700 }}>
          {submission.student?.name ?? submission.student?.email ?? submission.userId}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Estado: {submission.status} · Enviado: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '—'}
        </Typography>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Entrega
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
        {contentText}
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={1.5}>
        <TextField
          label={`Calificación (0 - ${maxScore})`}
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
        <TextField
          label="Feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          multiline
          minRows={3}
        />
        <Stack direction="row" justifyContent="flex-end">
          <Button variant="contained" onClick={handleGrade} disabled={isSaving || score === ''}>
            Guardar calificación
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

SubmissionReviewer.propTypes = {
  submission: PropTypes.object,
  onGraded: PropTypes.func,
};

