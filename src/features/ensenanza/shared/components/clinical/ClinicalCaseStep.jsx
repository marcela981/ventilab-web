import React, { Suspense } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import DecisionRenderer from './DecisionRenderer';

const ClinicalCaseStep = ({ currentStep, stepAnswers, onSelectionChange }) => {
  if (!currentStep) return null;

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        {currentStep.title}
      </Typography>

      <Typography variant="body1" paragraph sx={{ mt: 2, mb: 3 }}>
        {currentStep.narrative}
      </Typography>

      {currentStep.media && (
        <Box sx={{ mb: 3 }} role="img" aria-label={currentStep.media.alt || 'Media del caso clínico'}>
          {currentStep.media.type === 'image' && (
            <img
              src={currentStep.media.src}
              alt={currentStep.media.alt || ''}
              loading="lazy"
              style={{ maxWidth: '100%', borderRadius: 8 }}
            />
          )}
          {currentStep.media.type === 'svg' && (
            <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={300} />}>
              <img
                src={currentStep.media.src}
                alt={currentStep.media.alt || ''}
                loading="lazy"
                style={{ maxWidth: '100%', borderRadius: 8 }}
              />
            </Suspense>
          )}
        </Box>
      )}

      {currentStep.decisions?.map((decision) => (
        <DecisionRenderer
          key={decision.id}
          decision={decision}
          selectedOptions={stepAnswers[currentStep.id]?.[decision.id] || []}
          onSelectionChange={onSelectionChange}
          showFeedback={true}
        />
      ))}
    </Box>
  );
};

export default ClinicalCaseStep;
