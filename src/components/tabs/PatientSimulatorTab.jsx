import React, { Suspense } from 'react';
import { Box, Typography } from '@mui/material';

const PatientSimulator = React.lazy(() => import('../PatientSimulator'));

const PatientSimulatorTab = () => {
  return (
    <Box pb={6}>
      <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <Typography variant="h6">Cargando Simulador de Paciente...</Typography>
      </Box>}>
        <PatientSimulator />
      </Suspense>
    </Box>
  );
};

export default PatientSimulatorTab;
