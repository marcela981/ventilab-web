/**
 * GroupBuilderModal - Modal para conformar grupos de estudiantes.
 * Recibe la lista de estudiantes seleccionados y muestra un formulario
 * con nombre del grupo + chips de los alumnos elegidos.
 * Crea el grupo en BD y agrega a cada estudiante como miembro.
 */
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Box, Typography, Chip, Button, Avatar, Divider, Alert,
  CircularProgress,
} from '@mui/material';
import { Group as GroupIcon, Check as CheckIcon } from '@mui/icons-material';
import groupsService from '@/features/admin/services/groupsService';

const GLASS = {
  background: 'rgba(15, 28, 53, 0.92)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#e8eaf6',
};

export default function GroupBuilderModal({ open, onClose, onCreated, selectedStudents = [] }) {
  const [groupName, setGroupName] = useState('');
  const [semester, setSemester] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!groupName.trim()) return;
    setSaving(true);
    setError('');

    // 1. Crear el grupo
    const createRes = await groupsService.createGroup({
      name: groupName.trim(),
      ...(semester.trim() && { semester: semester.trim() }),
    });

    if (!createRes.success) {
      setError(createRes.error?.message || 'Error al crear el grupo');
      setSaving(false);
      return;
    }

    const groupId = createRes.data.group.id;

    // 2. Agregar cada estudiante seleccionado como miembro
    const addResults = await Promise.allSettled(
      selectedStudents.map(s => groupsService.addMember(groupId, s.id, 'STUDENT'))
    );

    const failed = addResults.filter(r => r.status === 'rejected' || !r.value?.success);
    if (failed.length) {
      setError(`Grupo creado, pero ${failed.length} estudiante(s) no pudieron agregarse.`);
    }

    setSaving(false);
    setSaved(true);
    onCreated?.();
    setTimeout(() => { setSaved(false); setGroupName(''); setSemester(''); onClose(); }, 1800);
  };

  const handleClose = () => {
    if (saving) return;
    setGroupName(''); setSemester(''); setSaved(false); setError(''); onClose();
  };

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

        {error && (
          <Alert
            severity="warning"
            sx={{ bgcolor: 'rgba(255,152,0,0.12)', color: '#fcd34d', border: '1px solid rgba(255,152,0,0.3)' }}
          >
            {error}
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
          disabled={saving || saved}
          InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
          InputProps={{ sx: { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(16,174,222,0.5)' }, '&.Mui-focused fieldset': { borderColor: '#10aede' } } }}
        />

        {/* Semestre (opcional) */}
        <TextField
          label="Semestre (opcional)"
          placeholder="Ej: 2026-1"
          fullWidth
          size="small"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          disabled={saving || saved}
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
          disabled={!groupName.trim() || saving || saved}
          onClick={handleSave}
          sx={{
            bgcolor: '#10aede', color: '#fff',
            '&:hover': { bgcolor: '#0d9bc8' },
            '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' },
            minWidth: 120,
          }}
        >
          {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Crear Grupo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

