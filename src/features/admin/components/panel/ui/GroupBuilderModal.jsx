/**
 * GroupBuilderModal - Modal para conformar grupos de estudiantes.
 * Recibe la lista de estudiantes seleccionados y muestra un formulario
 * con nombre del grupo + chips de los alumnos elegidos.
 * FRONTEND: la acción de guardar es visual (backend en Fase 3).
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Box, Typography, Chip, Button, Avatar, Divider, Alert,
} from '@mui/material';
import { Group as GroupIcon, Check as CheckIcon } from '@mui/icons-material';

const GLASS = {
  background: 'rgba(15, 28, 53, 0.92)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#e8eaf6',
};

export default function GroupBuilderModal({ open, onClose, selectedStudents = [] }) {
  const [groupName, setGroupName] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!groupName.trim()) return;
    // Frontend mock — aquí irá la llamada al API en Fase 3
    setSaved(true);
    setTimeout(() => { setSaved(false); setGroupName(''); onClose(); }, 1500);
  };

  const handleClose = () => { setGroupName(''); setSaved(false); onClose(); };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { ...GLASS, borderRadius: 3 } }}
    >
      {/* Header */}
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 1.5,
          bgcolor: 'rgba(16,174,222,0.15)', border: '1px solid rgba(16,174,222,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GroupIcon sx={{ color: '#7dd3fc', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#fff', lineHeight: 1.2 }}>
            Conformar Grupo
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            {selectedStudents.length} estudiante{selectedStudents.length !== 1 ? 's' : ''} seleccionado{selectedStudents.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </DialogTitle>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />

      <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {saved && (
          <Alert
            icon={<CheckIcon />}
            severity="success"
            sx={{ bgcolor: 'rgba(76,175,80,0.15)', color: '#86efac', border: '1px solid rgba(76,175,80,0.3)' }}
          >
            ¡Grupo creado correctamente!
          </Alert>
        )}

        {/* Nombre del grupo */}
        <TextField
          label="Nombre del grupo"
          placeholder="Ej: Grupo A — Turno mañana"
          fullWidth
          size="small"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
          InputProps={{ sx: { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(16,174,222,0.5)' }, '&.Mui-focused fieldset': { borderColor: '#10aede' } } }}
        />

        {/* Alumnos seleccionados */}
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', mb: 1, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Integrantes
          </Typography>
          {selectedStudents.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
              No hay estudiantes seleccionados.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {selectedStudents.map((s) => (
                <Chip
                  key={s.id}
                  avatar={
                    <Avatar sx={{ bgcolor: 'rgba(16,174,222,0.25)', color: '#7dd3fc', fontSize: 11, fontWeight: 700, width: 22, height: 22 }}>
                      {(s.name || s.email || '?')[0].toUpperCase()}
                    </Avatar>
                  }
                  label={s.name || s.email}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.07)',
                    color: '#e8eaf6',
                    border: '1px solid rgba(255,255,255,0.12)',
                    '& .MuiChip-label': { fontSize: '0.75rem' },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!groupName.trim() || saved}
          onClick={handleSave}
          sx={{
            bgcolor: '#10aede', color: '#fff',
            '&:hover': { bgcolor: '#0d9bc8' },
            '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' },
          }}
        >
          Crear Grupo
        </Button>
      </DialogActions>
    </Dialog>
  );
}

GroupBuilderModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedStudents: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    email: PropTypes.string,
  })),
};
