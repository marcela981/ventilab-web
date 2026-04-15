import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Grid, Skeleton, Typography } from '@mui/material';
import ActivityCard from './ActivityCard';
import styles from '../../UI/evaluation.module.css';

export default function ActivityList({ activities, isLoading, error, onRetry }) {
  if (isLoading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3].map((n) => (
          <Grid item xs={12} md={6} lg={4} key={n}>
            <Skeleton variant="rectangular" className={styles.skeletonCard} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (error) {
    return (
      <Box className={styles.errorContainer}>
        <Typography variant="body2" color="error">{error}</Typography>
        {onRetry && (
          <Button variant="outlined" size="small" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </Box>
    );
  }

  if (!activities?.length) {
    return (
      <Typography variant="body2" sx={{ py: 2, opacity: 0.8 }}>
        No tienes actividades asignadas todavía.
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      {activities.map((a) => (
        <Grid item xs={12} md={6} lg={4} key={a.id}>
          <ActivityCard activity={a} />
        </Grid>
      ))}
    </Grid>
  );
}

ActivityList.propTypes = {
  activities: PropTypes.array,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func,
};

