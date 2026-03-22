import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button,
  ToggleButton, ToggleButtonGroup, Alert, CircularProgress, Chip,
} from '@mui/material';
import {
  Usb as UsbIcon,
  Cloud as CloudIcon,
  CheckCircle as ConnectedIcon,
  Cancel as DisconnectedIcon,
  Schedule as TimerIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

import { ReservationDialog } from './ReservationDialog';
import type { ConnectionMode, ConnectionState } from '@/features/simulador/conexion/websocket/hooks/useVentilatorConnection';

// =============================================================================
// Types
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
// Component
// =============================================================================

export function ConnectionPanel({
  connectionState,
  reservation,
  onSwitchToLocal,
  onSwitchToRemote,
  onDisconnect,
  onRequestReservation,
  onReleaseReservation,
  isLoading = false,
}: ConnectionPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleModeChange = async (
    _: React.MouseEvent<HTMLElement>,
    newMode: ConnectionMode | null
  ) => {
    if (!newMode || newMode === connectionState.mode) return;
    if (newMode === 'local') await onSwitchToLocal();
    else if (newMode === 'remote') await onSwitchToRemote();
    else onDisconnect();
  };

  const statusColor = connectionState.isConnected ? 'success'
    : connectionState.error ? 'error'
    : 'default';

  const StatusIcon = connectionState.isConnected ? ConnectedIcon
    : connectionState.error ? WarningIcon
    : DisconnectedIcon;

  return (
    <Box sx={{ p: 2 }}>
      {/* Connection status + mode toggle */}
      <Card sx={{ mb: 3, backgroundColor: 'rgba(255,255,255,0.05)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <StatusIcon color={connectionState.isConnected ? 'success' : connectionState.error ? 'error' : 'disabled'} />
            <Typography variant="h6">Estado de Conexión</Typography>
            <Chip
              label={connectionState.isConnected ? 'Conectado' : 'Desconectado'}
              color={statusColor}
              size="small"
            />
          </Box>

          {connectionState.error && (
            <Alert severity="error" sx={{ mb: 2 }}>{connectionState.error.message}</Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Selecciona el modo de conexión:
          </Typography>

          <ToggleButtonGroup
            value={connectionState.mode}
            exclusive
            onChange={handleModeChange}
            disabled={isLoading}
            fullWidth
            sx={{ mb: isLoading ? 2 : 0 }}
          >
            <ToggleButton value="local" sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <UsbIcon />
                <Typography variant="body2">Simulador Local</Typography>
                <Typography variant="caption" color="text.secondary">Conexión USB directa</Typography>
              </Box>
            </ToggleButton>

            <ToggleButton value="remote" sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <CloudIcon />
                <Typography variant="body2">Ventilador Real</Typography>
                <Typography variant="caption" color="text.secondary">Universidad del Valle</Typography>
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Remote: reservation panel */}
      {connectionState.mode === 'remote' && (
        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Reserva del Ventilador</Typography>

            {reservation.hasReservation ? (
              <>
                <Alert severity="success" icon={<TimerIcon />} sx={{ mb: 2 }}>
                  Reserva activa — {reservation.remainingMinutes} minutos restantes
                </Alert>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Tienes acceso exclusivo al ventilador. Los datos se transmiten en tiempo real.
                </Typography>
                <Button variant="outlined" color="warning" onClick={onReleaseReservation} disabled={isLoading}>
                  Liberar Reserva
                </Button>
              </>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Necesitas una reserva para acceder al ventilador físico.
                </Alert>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  El ventilador solo puede ser usado por un estudiante a la vez.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setDialogOpen(true)}
                  disabled={!reservation.canRequest || isLoading}
                >
                  Solicitar Reserva
                </Button>
                {!reservation.canRequest && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                    Conectando al servidor…
                  </Typography>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Local: USB info */}
      {connectionState.mode === 'local' && (
        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Conexión Serial USB</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Conecta el simulador físico a tu computadora mediante cable USB.
            </Typography>
            <Alert severity="info">
              El simulador local usa comunicación serial directa. No requiere internet.
            </Alert>
          </CardContent>
        </Card>
      )}

      <ReservationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={onRequestReservation}
      />
    </Box>
  );
}

export default ConnectionPanel;
