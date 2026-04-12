import React from 'react';
import PropTypes from 'prop-types';
import { Chip } from '@mui/material';

const LABELS = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Entregado',
  GRADED: 'Calificado',
  LATE: 'Entregado tarde',
};

const COLORS = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  GRADED: 'success',
  LATE: 'warning',
};

export default function SubmissionStatusBadge({ status }) {
  if (!status) return null;
  return (
    <Chip
      size="small"
      label={LABELS[status] ?? status}
      color={COLORS[status] ?? 'default'}
      variant="outlined"
    />
  );
}

SubmissionStatusBadge.propTypes = {
  status: PropTypes.string,
};

