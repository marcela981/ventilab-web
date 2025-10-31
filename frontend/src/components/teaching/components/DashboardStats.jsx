"use client";

import React from 'react';
import {
  Paper,
  Typography,
  Grid
} from '@mui/material';
import {
  Assessment
} from '@mui/icons-material';
import FlashcardDashboard from './FlashcardDashboard';
import ProgressOverview from './ProgressOverview';
import RecommendationsPanel from './RecommendationsPanel';

/**
 * DashboardStats - Componente de estadísticas del dashboard
 *
 * Agrupa y organiza los cuadrantes del dashboard de aprendizaje.
 *
 * @param {Function} onOpenFlashcards - Callback para abrir el sistema de flashcards
 * @param {Object} dashboardData - Datos del dashboard
 * @param {Array} recommendations - Recomendaciones generadas
 * @returns {JSX.Element} Componente de estadísticas del dashboard
 */
const DashboardStats = ({ onOpenFlashcards, dashboardData, recommendations }) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mb: 4,
        backgroundColor: '#ffffff',
        border: '1px solid #e3f2fd',
        borderRadius: 3
      }}
    >
      <Typography variant="h5" sx={{
        mb: 3,
        color: '#1976d2',
        fontWeight: 700,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1
      }}>
        <Assessment sx={{ fontSize: 28 }} />
        Dashboard de Aprendizaje
      </Typography>

      <Grid container spacing={3}>
        {/* Cuadrante Superior Izquierdo - Sistema de Repetición Espaciada */}
        <Grid item xs={12} md={6}>
          <FlashcardDashboard onOpenFlashcards={onOpenFlashcards} />
        </Grid>

        {/* Cuadrante Superior Derecho - Sistema de Racha */}
        <Grid item xs={12} md={6}>
          <ProgressOverview dashboardData={dashboardData} />
        </Grid>

        {/* Cuadrante Inferior Izquierdo - Gráfica de Progreso Temporal */}
        <Grid item xs={12} md={6}>
          <ProgressOverview dashboardData={dashboardData} />
        </Grid>

        {/* Cuadrante Inferior Derecho - Recomendaciones Inteligentes */}
        <Grid item xs={12} md={6}>
          <RecommendationsPanel recommendations={recommendations} />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default DashboardStats;
