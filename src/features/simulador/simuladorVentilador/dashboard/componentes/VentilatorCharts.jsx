/**
 * @module VentilatorCharts
 * @description Gráficas en tiempo real de Presión / Flujo / Volumen.
 *
 * Funciona en ambos modos:
 *   - Modo simulación sintética : datos provenientes del PatientSimulationService
 *     (WebSocket `ventilator:data` a ~30 Hz) vía useVentilatorData + useChartCalculations.
 *   - Modo ventilador real       : mismos datos pero originados en el hardware MQTT/serial,
 *     pasados como prop `realTimeData` desde VentilatorDashboard.
 *
 * Cuando `realTimeData` está presente, se usa directamente.
 * Cuando no está (o está vacío), el componente cae a la fuente WebSocket interna.
 */

import React, { useMemo } from 'react';
import { Box, Typography, Button, ButtonGroup, Chip, Stack } from '@mui/material';
import { Line } from 'react-chartjs-2';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestoreIcon from '@mui/icons-material/Restore';

// Chart.js registration — must import before any react-chartjs-2 usage
import '@/features/simulador/conexion/websocket/registro/ChartRegistry';

import { useVentilatorData } from '@/features/simulador/conexion/websocket/hooks/useVentilatorData';
import { useChartCalculations } from '@/features/simulador/simuladorVentilador/graficasMonitor/hooks/useChartCalculations';

// =============================================================================
// Chart configuration
// =============================================================================

/**
 * Builds Chart.js options for a single waveform.
 * animation: false is mandatory for 30 Hz real-time updates.
 */
const buildChartOptions = (title, color) => ({
  responsive: true,
  animation: false,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: title,
      color: '#e0e0e0',
      font: { size: 12, weight: 'bold' },
      padding: { bottom: 4 },
    },
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
        display: true,
        text: 'tiempo (s)',
        color: '#616161',
        font: { size: 10 },
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

/**
 * Wraps {x, y}[] points into the Chart.js dataset structure.
 * Uses parsing mode so x = elapsed seconds, y = signal value.
 */
const buildDataset = (points, color, label) => ({
  datasets: [
    {
      label,
      data: points,
      borderColor: color,
      backgroundColor: color + '18',
      fill: true,
      parsing: { xAxisKey: 'x', yAxisKey: 'y' },
    },
  ],
});

// =============================================================================
// Sub-component: numeric value badge
// =============================================================================

const ValueBadge = ({ label, value, unit, color }) => (
  <Box
    sx={{
      backgroundColor: '#1a1a1a',
      border: `1px solid ${color}44`,
      borderRadius: 1,
      px: 1.5,
      py: 0.75,
      minWidth: 80,
      textAlign: 'center',
    }}
  >
    <Typography sx={{ color: '#616161', fontSize: '10px', lineHeight: 1, mb: 0.25 }}>
      {label}
    </Typography>
    <Typography sx={{ color, fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}>
      {value ?? '--'}
    </Typography>
    <Typography sx={{ color: '#525252', fontSize: '10px', lineHeight: 1 }}>{unit}</Typography>
  </Box>
);

// =============================================================================
// Main component
// =============================================================================

/**
 * @param {Object}   props
 * @param {Object}   [props.realTimeData]   Legacy serial/MQTT data:
 *   { pressure: number[], flow: number[], volume: number[], time: number[] }
 *   When provided the component converts it to {x,y}[] points.
 *   When absent (undefined / empty arrays) uses the WebSocket hook directly.
 * @param {boolean}  [props.isRealVentilator=false]  Badge label hint.
 */
const VentilatorCharts = ({ realTimeData, isRealVentilator = false }) => {
  // ── WebSocket path (simulation + real remote) ─────────────────────────────
  const wsData = useVentilatorData();

  const { pressurePoints, flowPoints, volumePoints, actions } = useChartCalculations({
    data: wsData.data,
    defaultTimeWindow: 10,
  });

  // ── Legacy serial path: convert arrays → {x,y}[] ─────────────────────────
  // realTimeData.time contains millisecond timestamps; normalise to seconds.
  const legacyPoints = useMemo(() => {
    const rt = realTimeData;
    if (!rt || !rt.pressure?.length) return null;

    const t0 = rt.time?.[0] ?? 0;
    const toSec = (ms) => (ms - t0) / 1000;

    return {
      pressure: rt.pressure.map((y, i) => ({ x: toSec(rt.time?.[i] ?? i * 33), y })),
      flow:     rt.flow.map((y, i)     => ({ x: toSec(rt.time?.[i] ?? i * 33), y })),
      volume:   rt.volume.map((y, i)   => ({ x: toSec(rt.time?.[i] ?? i * 33), y })),
    };
  }, [realTimeData]);

  // ── Choose active data source ─────────────────────────────────────────────
  const activePoints = legacyPoints ?? {
    pressure: pressurePoints,
    flow:     flowPoints,
    volume:   volumePoints,
  };

  const latest = wsData.latest;
  const hasData = activePoints.pressure.length > 0;

  // Latest values for badges
  const lastPressure = legacyPoints
    ? realTimeData?.pressure?.at(-1)
    : latest?.pressure;
  const lastFlow = legacyPoints
    ? realTimeData?.flow?.at(-1)
    : latest?.flow;
  const lastVolume = legacyPoints
    ? realTimeData?.volume?.at(-1)
    : latest?.volume;
  const lastSpo2 = latest?.spo2;

  // Zoom controls only available on WebSocket path
  const zoomActions = legacyPoints ? null : actions;

  return (
    <Box
      sx={{
        pb: 8,
        px: { xs: 1, sm: 2 },
        pt: 2,
        backgroundColor: '#121212',
        maxWidth: 900,
        mx: 'auto',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        gap={1}
        mb={1.5}
      >
        <Typography variant="h6" sx={{ color: '#e0e0e0', fontWeight: 700, fontSize: '1rem' }}>
          Gráficas — {isRealVentilator ? 'Ventilador Real' : 'Simulación de Paciente'}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={
              hasData
                ? isRealVentilator
                  ? 'Conectado'
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
      </Stack>

      {/* ── Current-value badges ─────────────────────────────────────────────── */}
      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
        <ValueBadge
          label="Presión"
          value={lastPressure != null ? lastPressure.toFixed(1) : undefined}
          unit="cmH₂O"
          color="#ef5350"
        />
        <ValueBadge
          label="Flujo"
          value={lastFlow != null ? lastFlow.toFixed(1) : undefined}
          unit="L/min"
          color="#42a5f5"
        />
        <ValueBadge
          label="Volumen"
          value={lastVolume != null ? lastVolume.toFixed(0) : undefined}
          unit="mL"
          color="#66bb6a"
        />
        {lastSpo2 != null && (
          <ValueBadge label="SpO₂" value={lastSpo2.toFixed(1)} unit="%" color="#ab47bc" />
        )}
      </Stack>

      {/* ── Charts or empty state ─────────────────────────────────────────────── */}
      {!hasData ? (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          height="45vh"
          gap={2}
        >
          <Typography
            sx={{ color: '#424242', textAlign: 'center', maxWidth: 380, fontSize: '0.9rem' }}
          >
            {isRealVentilator
              ? 'Conecta el ventilador para visualizar las curvas en tiempo real.'
              : (
                <>
                  Configura un paciente en la pestaña{' '}
                  <strong style={{ color: '#616161' }}>Simular Paciente</strong> e inicia la
                  simulación para ver las curvas en tiempo real.
                </>
              )}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {/* Presión */}
          <Box
            sx={{
              position: 'relative',
              height: { xs: 180, sm: 200, md: 220, lg: 240 },
              backgroundColor: '#1a1a1a',
              borderRadius: 1,
              border: '1px solid rgba(239,83,80,0.18)',
              p: 1,
            }}
          >
            <Line
              data={buildDataset(activePoints.pressure, '#ef5350', 'Presión (cmH₂O)')}
              options={buildChartOptions('Presión  ·  cmH₂O', '#ef5350')}
            />
          </Box>

          {/* Flujo */}
          <Box
            sx={{
              position: 'relative',
              height: { xs: 180, sm: 200, md: 220, lg: 240 },
              backgroundColor: '#1a1a1a',
              borderRadius: 1,
              border: '1px solid rgba(66,165,245,0.18)',
              p: 1,
            }}
          >
            <Line
              data={buildDataset(activePoints.flow, '#42a5f5', 'Flujo (L/min)')}
              options={buildChartOptions('Flujo  ·  L/min', '#42a5f5')}
            />
          </Box>

          {/* Volumen */}
          <Box
            sx={{
              position: 'relative',
              height: { xs: 180, sm: 200, md: 220, lg: 240 },
              backgroundColor: '#1a1a1a',
              borderRadius: 1,
              border: '1px solid rgba(102,187,106,0.18)',
              p: 1,
            }}
          >
            <Line
              data={buildDataset(activePoints.volume, '#66bb6a', 'Volumen (mL)')}
              options={buildChartOptions('Volumen  ·  mL', '#66bb6a')}
            />
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default VentilatorCharts;
