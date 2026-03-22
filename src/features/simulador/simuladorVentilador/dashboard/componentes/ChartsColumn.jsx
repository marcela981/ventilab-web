import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import RealTimeCharts from './RealTimeCharts';

const ChartsColumn = ({
  dataSource,
  displayData,
  serialConnection
}) => {
  return (
    <Box display="flex" flexDirection="column" gap={1.5} sx={{ maxWidth: 600, mx: 'auto' }}>
      {/* Pressure */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          minHeight: 180,
          height: { xs: 190, md: 220 },
          display: 'flex',
          flexDirection: 'column',
          p: 1,
          backgroundColor: 'rgba(141, 138, 138, 0.2)',
        }}
      >
        <Typography variant="h6" sx={{ mb: 1, color: '#fff', fontSize: '1rem' }}>
          Gráfica de Presión
        </Typography>
        {dataSource === 'simulated' ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            flex={1}
            flexDirection="column"
            gap={1}
          >
            <PersonIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>
              Las gráficas no están disponibles en modo Paciente Simulado.
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Use los controles para ajustar los parámetros de simulación.
            </Typography>
          </Box>
        ) : (
          <Box flex={1} minHeight={0}>
            <RealTimeCharts
              type="pressure"
              data={displayData}
              isConnected={serialConnection.isConnected}
            />
          </Box>
        )}
      </Paper>

      {/* Flow */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          minHeight: 180,
          height: { xs: 190, md: 220 },
          display: 'flex',
          flexDirection: 'column',
          p: 1,
          backgroundColor: 'rgba(141, 138, 138, 0.2)',
        }}
      >
        <Typography variant="h6" sx={{ mb: 1, color: '#fff', fontSize: '1rem' }}>
          Gráfica de Flujo
        </Typography>
        {dataSource === 'simulated' ? (
          <Box display="flex" justifyContent="center" alignItems="center" flex={1} flexDirection="column" gap={1}>
            <PersonIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>
              Las gráficas no están disponibles en modo Paciente Simulado.
            </Typography>
          </Box>
        ) : (
          <Box flex={1} minHeight={0}>
            <RealTimeCharts type="flow" data={displayData} isConnected={serialConnection.isConnected} />
          </Box>
        )}
      </Paper>

      {/* Volume */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          minHeight: 180,
          height: { xs: 190, md: 220 },
          display: 'flex',
          flexDirection: 'column',
          p: 1,
          backgroundColor: 'rgba(141, 138, 138, 0.2)',
        }}
      >
        <Typography variant="h6" sx={{ mb: 1, color: '#fff', fontSize: '1rem' }}>
          Gráfica de Volumen
        </Typography>
        {dataSource === 'simulated' ? (
          <Box display="flex" justifyContent="center" alignItems="center" flex={1} flexDirection="column" gap={1}>
            <PersonIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>
              Las gráficas no están disponibles en modo Paciente Simulado.
            </Typography>
          </Box>
        ) : (
          <Box flex={1} minHeight={0}>
            <RealTimeCharts type="volume" data={displayData} isConnected={serialConnection.isConnected} />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ChartsColumn;
