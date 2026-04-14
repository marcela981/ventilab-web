/*
 * Funcionalidad: RealVentilatorPanel
 * Descripción: Panel del ventilador físico con tabs Conexión y Monitoreo.
 *   Tab Conexión: verifica estado vía REST /backend/api/simulation/status.
 *   Tab Monitoreo: gráficas en tiempo real con useVentilatorData (throttle 100ms).
 *   Depende de: useVentilatorData, SocketContext, Chart.js, MUI Tabs.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { memo, useMemo, useState } from 'react';
import { Button, Tab, Tabs, Typography } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';

import { useVentilatorData } from '@/hooks/useVentilatorData';
import styles from '../ui/RealVentilatorPanel.module.css';

// Chart.js registration — idempotent; safe to call even if ChartRegistry already ran.
ChartJS.register(
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
);

// =============================================================================
// Types
// =============================================================================

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

type Point = { x: number; y: number };

// =============================================================================
// Chart options — module-level constants (stable references, no useMemo needed)
// =============================================================================

const BASE_CHART_OPTIONS = {
  animation: false,
  responsive: true,
  maintainAspectRatio: false,
  elements: { point: { radius: 0 } },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
  scales: {
    x: {
      type: 'linear' as const,
      ticks: { display: false },
      grid: { display: false },
    },
  },
} as const;

const PRESSURE_OPTIONS: ChartOptions<'line'> = {
  ...BASE_CHART_OPTIONS,
  scales: {
    ...BASE_CHART_OPTIONS.scales,
    y: {
      min: 0,
      max: 60,
      title: { display: true, text: 'cmH₂O', color: 'rgba(255,255,255,0.5)' },
      ticks: { color: 'rgba(255,255,255,0.45)' },
      grid: { color: 'rgba(255,255,255,0.06)' },
    },
  },
};

const FLOW_OPTIONS: ChartOptions<'line'> = {
  ...BASE_CHART_OPTIONS,
  scales: {
    ...BASE_CHART_OPTIONS.scales,
    y: {
      min: -150,
      max: 150,
      title: { display: true, text: 'L/min', color: 'rgba(255,255,255,0.5)' },
      ticks: { color: 'rgba(255,255,255,0.45)' },
      grid: { color: 'rgba(255,255,255,0.06)' },
    },
  },
};

const VOLUME_OPTIONS: ChartOptions<'line'> = {
  ...BASE_CHART_OPTIONS,
  scales: {
    ...BASE_CHART_OPTIONS.scales,
    y: {
      min: 0,
      max: 2000,
      title: { display: true, text: 'ml', color: 'rgba(255,255,255,0.5)' },
      ticks: { color: 'rgba(255,255,255,0.45)' },
      grid: { color: 'rgba(255,255,255,0.06)' },
    },
  },
};

// =============================================================================
// Chart sub-components (React.memo — skip re-render if points ref is stable)
// =============================================================================

interface ChartProps {
  points: Point[];
}

const PressureChart = memo(function PressureChart({ points }: ChartProps) {
  const data = useMemo(
    (): ChartData<'line'> => ({
      datasets: [
        {
          label: 'Presión',
          data: points,
          borderColor: '#e53935',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    }),
    [points],
  );

  return (
    <div className={styles['chartWrapper']!}>
      <Line data={data} options={PRESSURE_OPTIONS} />
    </div>
  );
});

const FlowChart = memo(function FlowChart({ points }: ChartProps) {
  const data = useMemo(
    (): ChartData<'line'> => ({
      datasets: [
        {
          label: 'Flujo',
          data: points,
          borderColor: '#1e88e5',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    }),
    [points],
  );

  return (
    <div className={styles['chartWrapper']!}>
      <Line data={data} options={FLOW_OPTIONS} />
    </div>
  );
});

const VolumeChart = memo(function VolumeChart({ points }: ChartProps) {
  const data = useMemo(
    (): ChartData<'line'> => ({
      datasets: [
        {
          label: 'Volumen',
          data: points,
          borderColor: '#43a047',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    }),
    [points],
  );

  return (
    <div className={styles['chartWrapper']!}>
      <Line data={data} options={VOLUME_OPTIONS} />
    </div>
  );
});

// =============================================================================
// Helper: chip class & label
// =============================================================================

function chipClass(status: ConnectionStatus): string {
  switch (status) {
    case 'idle':       return styles['chipIdle']!;
    case 'connecting': return styles['chipConnecting']!;
    case 'connected':  return styles['chipConnected']!;
    case 'error':      return styles['chipError']!;
  }
}

function chipLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'idle':       return 'Sin conexión';
    case 'connecting': return 'Conectando...';
    case 'connected':  return 'Conectado';
    case 'error':      return 'Error de conexión';
  }
}

// =============================================================================
// Main component
// =============================================================================

export function RealVentilatorPanel() {
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Always call the hook (Rules of Hooks); data arrives only after connecting.
  const { latestReading, readingsBuffer, isReceiving } = useVentilatorData();

  // Stable chart data arrays — re-computed only when the buffer reference changes
  // (which the hook throttles to ≤10 times/s).
  const pressurePoints = useMemo<Point[]>(
    () => readingsBuffer.map((r) => ({ x: r.timestamp, y: r.pressure })),
    [readingsBuffer],
  );
  const flowPoints = useMemo<Point[]>(
    () => readingsBuffer.map((r) => ({ x: r.timestamp, y: r.flow })),
    [readingsBuffer],
  );
  const volumePoints = useMemo<Point[]>(
    () => readingsBuffer.map((r) => ({ x: r.timestamp, y: r.volume })),
    [readingsBuffer],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleConnect = async () => {
    setConnectionStatus('connecting');
    setStatusMessage('');
    try {
      const response = await fetch('/backend/api/simulation/status', {
        credentials: 'include',
      });
      if (!response.ok) {
        setConnectionStatus('error');
        setStatusMessage('No se pudo conectar con el servidor.');
        return;
      }
      const data = (await response.json()) as { status: string; isReserved: boolean };
      if (data.status === 'CONNECTED' || data.status === 'IDLE') {
        setConnectionStatus('connected');
        setStatusMessage('Ventilador en línea. Datos disponibles.');
        setTimeout(() => setActiveTab(1), 800);
      } else {
        setConnectionStatus('error');
        setStatusMessage('No se pudo conectar con el servidor.');
      }
    } catch {
      setConnectionStatus('error');
      setStatusMessage('No se pudo conectar con el servidor.');
    }
  };

  const handleDisconnect = () => {
    setConnectionStatus('idle');
    setStatusMessage('');
    setActiveTab(0);
  };

  const handleTabChange = (_: React.SyntheticEvent, value: number) => {
    setActiveTab(value as 0 | 1);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles['panel']!}>
      {/* Tab bar */}
      <div className={styles['tabBar']!}>
        <Tabs value={activeTab} onChange={handleTabChange} textColor="inherit" indicatorColor="primary">
          <Tab label="Conexión" value={0} />
          <Tab label="Monitoreo" value={1} />
        </Tabs>
      </div>

      {/* ── TAB 0: Conexión ────────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <div className={styles['tabContent']!}>
          <div className={styles['connectionWrap']!}>
            <div className={styles['connectionCard']!}>
              <p className={styles['cardTitle']!}>Ventilador Físico</p>
              <p className={styles['cardDescription']!}>
                Conecta con el ventilador real de la universidad vía WebSocket.
              </p>

              {/* Status chip */}
              <div className={styles['statusRow']!}>
                <span className={styles['statusLabel']!}>Estado:</span>
                <span className={`${styles['chip']!} ${chipClass(connectionStatus)}`}>
                  {chipLabel(connectionStatus)}
                </span>
              </div>

              {/* Status message */}
              <p className={styles['statusMessage']!}>{statusMessage}</p>

              {/* Action buttons */}
              <div className={styles['buttonRow']!}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => void handleConnect()}
                  disabled={
                    connectionStatus === 'connecting' || connectionStatus === 'connected'
                  }
                >
                  Conectar
                </Button>

                {connectionStatus === 'connected' && (
                  <Button variant="outlined" color="warning" onClick={handleDisconnect}>
                    Desconectar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 1: Monitoreo ───────────────────────────────────────────────── */}
      {activeTab === 1 && (
        <div className={styles['tabContent']!}>
          {connectionStatus !== 'connected' ? (
            /* Guard: user navigated here before connecting */
            <div className={styles['noConnectionWrap']!}>
              <Typography className={styles['noConnectionText']!}>
                Primero establece la conexión en el tab Conexión.
              </Typography>
              <Button variant="outlined" onClick={() => setActiveTab(0)}>
                Ir a Conexión
              </Button>
            </div>
          ) : (
            <>
              {/* Status bar */}
              <div className={styles['statusBar']!}>
                <div className={styles['signalWrap']!}>
                  <span
                    className={`${styles['statusDot']!} ${
                      isReceiving ? styles['dotActive']! : styles['dotInactive']!
                    }`}
                  />
                  <span className={styles['signalLabel']!}>
                    {isReceiving ? 'Recibiendo datos' : 'Sin señal'}
                  </span>
                </div>

                <div className={styles['badgeRow']!}>
                  <div className={styles['badge']!}>
                    <span className={styles['badgeValue']!}>
                      {latestReading?.pressure ?? '--'}
                    </span>
                    <span className={styles['badgeUnit']!}>cmH₂O</span>
                    <span className={styles['badgeName']!}>Presión</span>
                  </div>
                  <div className={styles['badge']!}>
                    <span className={styles['badgeValue']!}>
                      {latestReading?.flow ?? '--'}
                    </span>
                    <span className={styles['badgeUnit']!}>L/min</span>
                    <span className={styles['badgeName']!}>Flujo</span>
                  </div>
                  <div className={styles['badge']!}>
                    <span className={styles['badgeValue']!}>
                      {latestReading?.volume ?? '--'}
                    </span>
                    <span className={styles['badgeUnit']!}>ml</span>
                    <span className={styles['badgeName']!}>Volumen</span>
                  </div>
                </div>
              </div>

              {/* Charts grid */}
              <div className={styles['chartsGrid']!}>
                <div className={styles['chartCard']!}>
                  <p className={styles['chartTitle']!}>Presión de vía aérea (cmH₂O)</p>
                  <PressureChart points={pressurePoints} />
                </div>
                <div className={styles['chartCard']!}>
                  <p className={styles['chartTitle']!}>Flujo (L/min)</p>
                  <FlowChart points={flowPoints} />
                </div>
                <div className={styles['chartCard']!}>
                  <p className={styles['chartTitle']!}>Volumen (ml)</p>
                  <VolumeChart points={volumePoints} />
                </div>
              </div>

              {/* Alarm placeholder */}
              <div className={styles['alarmCard']!}>
                <span className={styles['alarmText']!}>Sin alarmas activas</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default RealVentilatorPanel;
