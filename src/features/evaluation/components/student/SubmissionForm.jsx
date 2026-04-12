import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { submissionApi } from '../../api/submission.api';

export default function SubmissionForm({ activityId, submission, onSubmissionChange }) {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLocked = useMemo(() => submission?.status !== 'DRAFT', [submission]);

  useEffect(() => {
    const current = submission?.content?.text;
    if (typeof current === 'string') setText(current);
  }, [submission]);

  const handleSave = async () => {
    if (!submission?.id) return;
    setIsSaving(true);
    try {
      const updated = await submissionApi.saveDraft(submission.id, { content: { text } });
      onSubmissionChange?.(updated);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!submission?.id) return;
    setIsSubmitting(true);
    try {
      await handleSave();
      const updated = await submissionApi.submit(submission.id);
      onSubmissionChange?.(updated);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!submission) {
    return (
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Inicializando entrega...
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Stack spacing={1.5}>
        <TextField
          label="Tu respuesta"
          multiline
          minRows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isLocked}
          placeholder="Escribe tu entrega aquí..."
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button variant="outlined" onClick={handleSave} disabled={isLocked || isSaving}>
            Guardar borrador
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isLocked || isSubmitting}>
            Enviar entrega
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

SubmissionForm.propTypes = {
  activityId: PropTypes.string.isRequired,
  submission: PropTypes.object,
  onSubmissionChange: PropTypes.func,
};

