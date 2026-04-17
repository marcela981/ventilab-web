/**
 * DashboardHero - Banner de bienvenida del Panel Administrativo
 * Muestra saludo personalizado, rol y fecha actual.
 * Estilo glassmorphism coherente con el fondo oscuro del panel.
 */

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import { getRoleDisplayName } from '@/lib/roles';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatDate() {
  return new Date().toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function DashboardHero({ user, role }) {
  const greeting = getGreeting();
  const displayName = user?.name || user?.email || 'Usuario';
  const roleName = getRoleDisplayName(role);
  const date = formatDate();

  return (
    <Box
      sx={{
        mb: 4,
        p: { xs: 2.5, sm: 3.5 },
        borderRadius: 3,
        background: 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 52, height: 52, borderRadius: 2,
            background: 'linear-gradient(135deg, rgba(16,174,222,0.4), rgba(124,77,255,0.4))',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AdminIcon sx={{ color: '#fff', fontSize: 26 }} />
        </Box>
        <Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ color: '#fff', lineHeight: 1.2, mb: 0.3 }}
          >
            {greeting}, {displayName}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            {date}
          </Typography>
        </Box>
      </Box>

      <Chip
        label={roleName}
        size="medium"
        sx={{
          bgcolor: 'rgba(124, 77, 255, 0.25)',
          color: '#d1c4e9',
          border: '1px solid rgba(124, 77, 255, 0.5)',
          fontWeight: 600,
          fontSize: '0.8rem',
          height: 32,
          alignSelf: { xs: 'flex-start', sm: 'center' },
        }}
      />
    </Box>
  );
}

