"use client";

import React from 'react';
import { Container, Grid, Skeleton, CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { teachingModuleTheme } from '../../../theme/teachingModuleTheme';

/**
 * LessonLoadingSkeleton - Loading state skeleton for LessonViewer
 * Shows placeholder content while lesson data is being loaded
 */
const LessonLoadingSkeleton = () => {
  return (
    <ThemeProvider theme={teachingModuleTheme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header skeleton */}
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 1 }} />

        {/* Content skeleton */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
};

export default LessonLoadingSkeleton;
