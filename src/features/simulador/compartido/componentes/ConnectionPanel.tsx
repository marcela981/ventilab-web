/*
 * Funcionalidad: ConnectionPanel
 * Descripción: Panel de estado con 3 indicadores (MQTT, WebSocket, Reserva),
 *   age del último frame y botones de reserva/liberación.
 *   Depende de SocketContext, simulatorApi.getHealth() y ReservationDialog.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { useState, useEffect } from 'react';
import { Button, Typography } from '@mui/material';

import { useSocket } from '@/shared/contexts/SocketContext';
import { simulatorApi } from '@/features/simulador/compartido/api/simulator.api';
import type { SimulationHealthResponse } from '@/features/simulador/compartido/tipos/simulator.types';
import { ReservationDialog } from './ReservationDialog';
import type { ConnectionState } from '@/features/simulador/conexion/websocket/hooks/useVentilatorConnection';

import styles from './ui/ConnectionPanel.module.css';

// =============================================================================
// Types — unchanged public interface
// =============================================================================

interface ConnectionPanelProps {
  connectionState: ConnectionState;
  reservation: {
    hasReservation: boolean;
    remainingMinutes: number;
    canRequest: boolean;
  };
  onSwitchToLocal: () => Promise<void>;
  onSwitchToRemote: () => Promise<void>;
  onDisconnect: () => void;
  onRequestReservation: (minutes: number, purpose?: string) => Promise<boolean>;
  onReleaseReservation: () => Promise<void>;
  isLoading?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

type DotVariant = 'connected' | 'connecting' | 'error';

function dotClass(variant: DotVariant): string {
  return `${styles.statusDot} ${styles[variant]}`;
}

// =============================================================================
// Component
// =============================================================================

export function ConnectionPanel({
  reservation,
  onRequestReservation,
  onReleaseReservation,
  isLoading = false,
}: ConnectionPanelProps) {
  const { isConnected, isAuthenticated } = useSocket();

  const [health, setHealth] = useState<SimulationHealthResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Poll /simulation/health every 3 s
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await simulatorApi.getHealth();
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth(null);
      }
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // --- Indicator states ---
  const mqttVariant: DotVariant =
    health === null ? 'connecting'
    : health.mqtt.status === 'connected' ? 'connected'
    : 'error';

  const wsVariant: DotVariant =
    isConnected && isAuthenticated ? 'connected'
    : isConnected ? 'connecting'
    : 'error';

  const reservaVariant: DotVariant =
    reservation.hasReservation ? 'connected'
    : reservation.canRequest ? 'connecting'
    : 'error';

  const isLeader = reservation.hasReservation;

  const lastFrameAgeMs = health?.telemetry.lastFrameAgeMs ?? null;

  return (
    <div className={styles.panel}>
      {/* 3 status indicators */}
      <div className={styles.indicators}>
        <div className={styles.indicator}>
          <span className={dotClass(mqttVariant)} />
          <Typography variant="body2">MQTT backend</Typography>
        </div>
        <div className={styles.indicator}>
          <span className={dotClass(wsVariant)} />
          <Typography variant="body2">WebSocket</Typography>
        </div>
        <div className={styles.indicator}>
          <span className={dotClass(reservaVariant)} />
          <Typography variant="body2">Reserva</Typography>
        </div>
      </div>

      {/* Last frame age */}
      {lastFrameAgeMs !== null && (
        <Typography className={styles.frameAge}>
          Último frame: {lastFrameAgeMs} ms
        </Typography>
      )}

      {/* Action buttons */}
      <div className={styles.actions}>
        <Button
          variant="contained"
          size="small"
          onClick={() => setDialogOpen(true)}
          disabled={isLoading || !reservation.canRequest}
        >
          Reservar
        </Button>
        {isLeader && (
          <Button
            variant="outlined"
            color="warning"
            size="small"
            onClick={onReleaseReservation}
            disabled={isLoading}
          >
            Liberar
          </Button>
        )}
      </div>

      <ReservationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={onRequestReservation}
      />
    </div>
  );
}

export default ConnectionPanel;
