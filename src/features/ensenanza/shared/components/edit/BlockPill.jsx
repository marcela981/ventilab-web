/**
 * BlockPill - Botón "+" estilo Notion para agregar bloques de contenido.
 * Aparece inline cuando el Modo Edición está activo.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

export default function BlockPill({ label, onClick, size = 'medium', indent = 0 }) {
  const isSmall = size === 'small';

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        ml: indent * 3,
        px: isSmall ? 1 : 1.5,
        py: isSmall ? 0.25 : 0.5,
        borderRadius: 1.5,
        border: '1.5px dashed',
        borderColor: 'rgba(16, 174, 222, 0.45)',
        color: 'rgba(16, 174, 222, 0.8)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: '#10aede',
          color: '#10aede',
          bgcolor: 'rgba(16, 174, 222, 0.06)',
        },
      }}
    >
      <AddIcon sx={{ fontSize: isSmall ? 13 : 15 }} />
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, fontSize: isSmall ? '0.7rem' : '0.75rem', lineHeight: 1 }}
      >
        {label}
      </Typography>
    </Box>
  );
}

