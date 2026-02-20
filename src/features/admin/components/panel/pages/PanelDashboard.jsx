/**
 * =============================================================================
 * PanelDashboard - Admin Panel Home Page
 * =============================================================================
 * Main dashboard for the administrative panel.
 * Placeholder page to be extended with overview widgets and statistics.
 *
 * Accessible to: teacher, admin, superuser
 * =============================================================================
 */

import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import {
  People as PeopleIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { getRoleDisplayName } from '@/lib/roles';

/**
 * Placeholder stat card component
 */
function StatCard({ icon, title, value, color }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}.50`,
          color: `${color}.main`,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Box>
    </Paper>
  );
}

/**
 * PanelDashboard Component
 *
 * Main entry point for the admin panel.
 */
export default function PanelDashboard() {
  const { user, role } = useAuth();

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Panel de Administración
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bienvenido, {user?.name || 'Usuario'}. Estás conectado como{' '}
          <strong>{getRoleDisplayName(role)}</strong>.
        </Typography>
      </Box>

      {/* Placeholder Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PeopleIcon />}
            title="Estudiantes Activos"
            value="--"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<SchoolIcon />}
            title="Módulos Publicados"
            value="--"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AssignmentIcon />}
            title="Lecciones Totales"
            value="--"
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TrendingUpIcon />}
            title="Completados Hoy"
            value="--"
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Placeholder Content Area */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Dashboard en construcción
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Esta sección mostrará métricas, gráficos y accesos rápidos a las
          funciones más utilizadas.
        </Typography>
      </Paper>
    </Box>
  );
}
