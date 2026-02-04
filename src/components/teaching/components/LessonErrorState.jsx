"use client";

import React from 'react';
import PropTypes from 'prop-types';
import { Container, Alert, Button, CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { teachingModuleTheme } from '../../../theme/teachingModuleTheme';

/**
 * LessonErrorState - Error state component for LessonViewer
 * Shows error message with retry option
 *
 * @param {Object} props
 * @param {string} props.error - Error message to display
 * @param {Function} props.onRetry - Callback to retry loading
 */
const LessonErrorState = ({ error, onRetry }) => {
  return (
    <ThemeProvider theme={teachingModuleTheme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={onRetry}>
              Reintentar
            </Button>
          }
        >
          {error || 'No se pudo cargar la lección. Por favor, intenta de nuevo.'}
        </Alert>
      </Container>
    </ThemeProvider>
  );
};

LessonErrorState.propTypes = {
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
};

LessonErrorState.defaultProps = {
  error: null,
};

export default LessonErrorState;
