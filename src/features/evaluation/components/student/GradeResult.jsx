import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Stack, Typography } from '@mui/material';

export default function GradeResult({ submission }) {
  if (!submission || submission.status !== 'GRADED') return null;

  const score = submission.score ?? 0;
  const max = submission.maxScore ?? submission.activity?.maxScore ?? 100;

  return (
    <Stack spacing={1.5} sx={{ mt: 2 }}>
      <Alert severity="success">
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Calificación: {score} / {max}
        </Typography>
      </Alert>
      {submission.feedback && (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {submission.feedback}
        </Typography>
      )}
    </Stack>
  );
}

GradeResult.propTypes = {
  submission: PropTypes.object,
};

