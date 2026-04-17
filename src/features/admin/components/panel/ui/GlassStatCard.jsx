/**
 * GlassStatCard - Tarjeta de estadística con efecto glassmorphism
 * Muestra un ícono, número y etiqueta con micro-animación en hover.
 */

import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';

// Mapeo de nombre de color → rgba para fondos translúcidos en oscuro
const ACCENT_COLORS = {
  cyan:   { icon: 'rgba(16, 174, 222, 0.25)',  border: 'rgba(16, 174, 222, 0.4)',  text: '#7dd3fc' },
  green:  { icon: 'rgba(76, 175, 80, 0.25)',   border: 'rgba(76, 175, 80, 0.4)',   text: '#86efac' },
  purple: { icon: 'rgba(124, 77, 255, 0.25)',  border: 'rgba(124, 77, 255, 0.4)',  text: '#d1c4e9' },
  orange: { icon: 'rgba(255, 152, 0, 0.25)',   border: 'rgba(255, 152, 0, 0.4)',   text: '#fcd34d' },
};

export default function GlassStatCard({ icon, title, value, accent = 'cyan', loading, onClick }) {
  const colors = ACCENT_COLORS[accent] ?? ACCENT_COLORS.cyan;

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2.5,
        borderRadius: 2.5,
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
        '&:hover': onClick
          ? {
              transform: 'translateY(-3px)',
              background: 'rgba(255, 255, 255, 0.09)',
              boxShadow: `0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px ${colors.border}`,
            }
          : {},
      }}
    >
      {/* Ícono */}
      <Box
        sx={{
          width: 52, height: 52, borderRadius: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: colors.icon,
          border: `1px solid ${colors.border}`,
          color: colors.text,
          '& svg': { fontSize: 26 },
        }}
      >
        {icon}
      </Box>

      {/* Texto */}
      <Box sx={{ minWidth: 0 }}>
        {loading ? (
          <>
            <Skeleton variant="text" width={60} height={38} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
            <Skeleton variant="text" width={90} height={18} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
          </>
        ) : (
          <>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ color: '#fff', lineHeight: 1.1, mb: 0.25 }}
            >
              {value ?? '--'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
              {title}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}

