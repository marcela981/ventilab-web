import React from 'react';
import PropTypes from 'prop-types';
import { Box, CircularProgress, Grid, Typography } from '@mui/material';
import ActivityCard from './ActivityCard';

export default function ActivityList({ activities, isLoading, error }) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ py: 2 }}>
        {error}
      </Typography>
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
};

