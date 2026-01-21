"use client";

import React from 'react';
import { Box, Paper, Skeleton, Grid } from '@mui/material';

/**
 * ProgressTabSkeleton - Loading skeleton for the Progress tab
 * Displays a placeholder UI while progress data is being loaded
 */
const ProgressTabSkeleton = () => {
  return (
    <Box sx={{ py: 4 }}>
      {/* Stats section skeleton */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Chart section skeleton */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Paper>

      {/* Modules progress skeleton */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Skeleton variant="text" width="35%" height={40} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3].map((item) => (
            <Grid item xs={12} md={4} key={item}>
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default ProgressTabSkeleton;
