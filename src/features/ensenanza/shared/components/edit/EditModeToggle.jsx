/**
 * EditModeToggle - FAB flotante que activa/desactiva el Modo Edición.
 * Solo visible para usuarios con rol teacher, admin o superuser.
 * Se posiciona en la esquina inferior derecha del LMS.
 */
import React from 'react';
import { Box, Fab, Tooltip, Zoom, Typography } from '@mui/material';
import { Edit as EditIcon, EditOff as EditOffIcon } from '@mui/icons-material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useEditMode } from './EditModeContext';

export default function EditModeToggle() {
  const { isTeacher, isAdmin, isSuperuser } = useAuth();
  const { isEditMode, toggleEditMode } = useEditMode();

  // Solo visible para roles de edición
  const canEdit = (isTeacher?.() || isAdmin?.() || isSuperuser?.());
  if (!canEdit) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {/* Etiqueta de estado */}
      <Zoom in={isEditMode}>
        <Box
          sx={{
            px: 1.5, py: 0.5,
            borderRadius: 2,
            bgcolor: 'rgba(16, 174, 222, 0.15)',
            border: '1px solid rgba(16, 174, 222, 0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: '#10aede', fontWeight: 700, letterSpacing: '0.03em' }}
          >
            MODO EDICIÓN
          </Typography>
        </Box>
      </Zoom>

      <Tooltip
        title={isEditMode ? 'Desactivar modo edición' : 'Activar modo edición (solo profesores)'}
        placement="left"
      >
        <Fab
          size="medium"
          onClick={toggleEditMode}
          sx={{
            bgcolor: isEditMode ? '#10aede' : 'rgba(255,255,255,0.1)',
            color: isEditMode ? '#fff' : 'rgba(255,255,255,0.7)',
            border: `2px solid ${isEditMode ? '#10aede' : 'rgba(255,255,255,0.2)'}`,
            backdropFilter: 'blur(8px)',
            boxShadow: isEditMode
              ? '0 4px 20px rgba(16, 174, 222, 0.5)'
              : '0 4px 16px rgba(0,0,0,0.3)',
            transition: 'all 0.25s ease',
            '&:hover': {
              bgcolor: isEditMode ? '#0d9bc8' : 'rgba(255,255,255,0.18)',
              boxShadow: '0 6px 24px rgba(16, 174, 222, 0.4)',
            },
          }}
        >
          {isEditMode ? <EditOffIcon /> : <EditIcon />}
        </Fab>
      </Tooltip>
    </Box>
  );
}
