import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import { Card, CardContent, CardActions, Typography, Button, Stack } from '@mui/material';
import SubmissionStatusBadge from './SubmissionStatusBadge';

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

export default function ActivityCard({ activity }) {
  const submission = useMemo(() => activity?.submissions?.[0] ?? null, [activity]);
  const due = useMemo(() => activity?.assignments?.[0]?.dueDate ?? activity?.dueDate, [activity]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {activity.title}
          </Typography>
          <SubmissionStatusBadge status={submission?.status} />
        </Stack>

        <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
          Tipo: {activity.type} · Puntaje máximo: {activity.maxScore}
        </Typography>

        {due && (
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Fecha límite: {formatDate(due)}
          </Typography>
        )}

        {activity.description && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {activity.description}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Link href={`/evaluation/${activity.id}`} style={{ textDecoration: 'none' }}>
          <Button variant="contained">Abrir</Button>
        </Link>
      </CardActions>
    </Card>
  );
}

ActivityCard.propTypes = {
  activity: PropTypes.object.isRequired,
};

