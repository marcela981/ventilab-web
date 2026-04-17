import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import PrerequisiteTooltip from '@/features/ensenanza/shared/components/modulos/ModuleCard/PrerequisiteTooltip';

const strings = {
  locked: {
    title: 'Caso Clínico Bloqueado',
    message: 'Completa todas las lecciones del módulo para desbloquear el Caso Clínico',
  }
};

const ClinicalCaseLockedView = ({ moduleId }) => {
  return (
    <Paper
      sx={{
        p: 4,
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <PrerequisiteTooltip missing={[]} side="top">
          <LockIcon sx={{ fontSize: 40, color: 'text.disabled' }} aria-label="Caso clínico bloqueado" />
        </PrerequisiteTooltip>
      </Box>
      <Box sx={{ mt: 4, mb: 2 }}>
        <LockIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      </Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        {strings.locked.title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mt: 2 }}>
        {strings.locked.message}
      </Typography>
    </Paper>
  );
};

export default ClinicalCaseLockedView;
