import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';

interface ReservationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (minutes: number, purpose?: string) => Promise<boolean>;
}

export function ReservationDialog({ open, onClose, onConfirm }: ReservationDialogProps) {
  const [duration, setDuration] = useState(30);
  const [purpose, setPurpose] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  const handleConfirm = async () => {
    setIsRequesting(true);
    const success = await onConfirm(duration, purpose || undefined);
    setIsRequesting(false);
    if (success) {
      setPurpose('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Solicitar Reserva del Ventilador</DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Duración</InputLabel>
            <Select
              value={duration}
              label="Duración"
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <MenuItem value={15}>15 minutos</MenuItem>
              <MenuItem value={30}>30 minutos</MenuItem>
              <MenuItem value={45}>45 minutos</MenuItem>
              <MenuItem value={60}>1 hora</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Propósito (opcional)"
            multiline
            rows={2}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Ej: Práctica de modos ventilatorios para examen"
            fullWidth
          />

          <Alert severity="warning">
            Recuerda liberar la reserva cuando termines para que otros
            estudiantes puedan usar el equipo.
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isRequesting}>
          Cancelar
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={isRequesting}>
          {isRequesting ? <CircularProgress size={20} /> : 'Solicitar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ReservationDialog;
