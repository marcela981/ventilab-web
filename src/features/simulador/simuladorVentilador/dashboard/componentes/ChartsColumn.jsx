/*
 * Funcionalidad: ChartsColumn
 * Descripción: Columna central del dashboard: gráficas de presión, flujo y
 *   volumen en tiempo real (Chart.js). Selecciona la fuente de datos (WebSocket
 *   o serial legacy) y renderiza las curvas.
 * Versión: 1.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useMemo } from 'react';
import { Box, Paper, Typography, ButtonGroup, Button, Stack, Chip } from '@mui/material';
import { Line } from 'react-chartjs-2';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestoreIcon from '@mui/icons-material/Restore';

// Chart.js registration — must import before any react-chartjs-2 usage
import '@/features/simulador/conexion/websocket/registro/ChartRegistry';

import { useVentilatorData } from '@/features/simulador/conexion/websocket/hooks/useVentilatorData';
import { useChartCalculations } from '@/features/simulador/simuladorVentilador/graficasMonitor/hooks/useChartCalculations';
import { useRenderCount } from '@/shared/dev/perfInstrumentation';

// =============================================================================
// Chart helpers (mirrored from VentilatorCharts)
// =============================================================================

// Opciones estables por color (identidad constante entre renders → Chart.js no
// reconstruye escalas en cada update). animation:false + decimation LTTB +
// parsing:false/normalized:true optimizan el redibujado en tiempo real.
const buildChartOptions = (color) => ({
  responsive: true,
  animation: false,
  maintainAspectRatio: false,
  parsing: false,
  normalized: true,
  plugins: {
    legend: { display: false },
    decimation: { enabled: true, algorithm: 'lttb', samples: 120 },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(20,20,20,0.95)',
      titleColor: '#e0e0e0',
      bodyColor: color,
    },
  },
  scales: {
    x: {
      type: 'linear',
      ticks: { color: '#757575', maxTicksLimit: 8, font: { size: 10 } },
      grid: { color: 'rgba(255,255,255,0.05)' },
      title: {
        display: false,
      },
    },
    y: {
      ticks: { color: '#9e9e9e', font: { size: 10 } },
      grid: { color: 'rgba(255,255,255,0.07)' },
    },
  },
  elements: {
    point: { radius: 0 },
    line: { borderWidth: 1.8, tension: 0.15 },
  },
});

// Instancias únicas de opciones (no recrear por render).
const PRESSURE_OPTIONS = buildChartOptions('#ef5350');
const FLOW_OPTIONS = buildChartOptions('#42a5f5');
const VOLUME_OPTIONS = buildChartOptions('#66bb6a');

// Decimation requiere parsing:false → los puntos ya vienen como {x,y} ordenados.
const buildDataset = (points, color, label) => ({
  datasets: [
    {
      label,
      data: points,
      borderColor: color,
      backgroundColor: color + '18',
      fill: true,
    },
  ],
});

// =============================================================================
// Component
// =============================================================================

const ChartsColumn = ({
  displayData, // Fallback/legacy mode array
  serialConnection,
  chartsEnabled
}) => {
  useRenderCount('ChartsColumn');
  // ── WebSocket path (simulation + real remote) ─────────────────────────────
  const wsData = useVentilatorData();
  const { pressurePoints, flowPoints, volumePoints, actions } = useChartCalculations({
    data: wsData.data,
    defaultTimeWindow: 10,
  });

  // ── Legacy serial path: convert arrays → {x,y}[] ─────────────────────────
  const legacyPoints = useMemo(() => {
    if (!displayData || !displayData.pressure?.length) return null;
    const t0 = displayData.time?.[0] ?? 0;
    const toSec = (ms) => (ms - t0) / 1000;

    return {
      pressure: displayData.pressure.map((y, i) => ({ x: toSec(displayData.time?.[i] ?? i * 33), y })),
      flow:     displayData.flow.map((y, i)     => ({ x: toSec(displayData.time?.[i] ?? i * 33), y })),
      volume:   displayData.volume.map((y, i)   => ({ x: toSec(displayData.time?.[i] ?? i * 33), y })),
    };
  }, [displayData]);

  // ── Choose active data source ─────────────────────────────────────────────
  const activePoints = legacyPoints ?? {
    pressure: pressurePoints,
    flow:     flowPoints,
    volume:   volumePoints,
  };

  const hasData = activePoints.pressure.length > 0;
  const zoomActions = legacyPoints ? null : actions;
  const isRealVentilator = serialConnection?.isConnected;

  // Datasets memoizados: sólo se reconstruyen cuando cambian sus puntos.
  const pressureData = useMemo(
    () => buildDataset(activePoints.pressure, '#ef5350', 'Presión'),
    [activePoints.pressure],
  );
  const flowData = useMemo(
    () => buildDataset(activePoints.flow, '#42a5f5', 'Flujo'),
    [activePoints.flow],
  );
  const volumeData = useMemo(
    () => buildDataset(activePoints.volume, '#66bb6a', 'Volumen'),
    [activePoints.volume],
  );

  // Solo mostrar gráficos activos dependiendo del modo y estado de chartsEnabled
  const showCharts = isRealVentilator 
    ? hasData 
    : (hasData && chartsEnabled);

  return (
    <Box display="flex" flexDirection="column" gap={1.5} sx={{ maxWidth: 600, mx: 'auto', width: '100%' }}>
      
      {/* ── Global Header & Controls for Column ── */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        px={0.5}
      >
        <Chip
          label={
            hasData
              ? isRealVentilator
                ? 'Conectado (Físico)'
                : 'Simulando'
              : 'Sin señal'
          }
          size="small"
          color={hasData ? 'success' : 'default'}
          sx={{ fontSize: '10px', height: 22 }}
        />

        {zoomActions && (
          <ButtonGroup
            size="small"
            variant="outlined"
            sx={{ '& .MuiButton-root': { px: 0.75, py: 0.25 } }}
          >
            <Button onClick={zoomActions.zoomIn} title="Acercar">
              <ZoomInIcon sx={{ fontSize: 16 }} />
            </Button>
            <Button onClick={zoomActions.zoomOut} title="Alejar">
              <ZoomOutIcon sx={{ fontSize: 16 }} />
            </Button>
            <Button onClick={zoomActions.resetZoom} title="Restablecer">
              <RestoreIcon sx={{ fontSize: 16 }} />
            </Button>
          </ButtonGroup>
        )}
      </Stack>

      {!showCharts && (
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            height: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(141, 138, 138, 0.2)',
          }}
        >
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 380, px: 2, fontSize: '0.9rem' }}>
            {isRealVentilator
              ? 'Esperando datos del ventilador físico...'
              : (hasData && !chartsEnabled)
                ? 'Activa "Simular Gráficas" en el panel izquierdo para ver las curvas.'
                : 'Configura o inicia un paciente en la pestaña "Simular Paciente" para ver las curvas en tiempo real.'}
          </Typography>
        </Paper>
      )}

      {showCharts && (
        <>
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
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#e0e0e0', fontWeight: 'bold' }}>
              Presión (cmH₂O)
            </Typography>
            <Box flex={1} minHeight={0} sx={{ position: 'relative' }}>
              <Line data={pressureData} options={PRESSURE_OPTIONS} />
            </Box>
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
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#e0e0e0', fontWeight: 'bold' }}>
              Flujo (L/min)
            </Typography>
            <Box flex={1} minHeight={0} sx={{ position: 'relative' }}>
              <Line data={flowData} options={FLOW_OPTIONS} />
            </Box>
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
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#e0e0e0', fontWeight: 'bold' }}>
              Volumen (mL)
            </Typography>
            <Box flex={1} minHeight={0} sx={{ position: 'relative' }}>
              <Line data={volumeData} options={VOLUME_OPTIONS} />
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default React.memo(ChartsColumn);

