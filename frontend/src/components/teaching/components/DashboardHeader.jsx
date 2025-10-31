"use client";

import React from 'react';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Home,
  School
} from '@mui/icons-material';

/**
 * DashboardHeader - Componente de encabezado del módulo de enseñanza
 *
 * Muestra el breadcrumb, título y descripción del módulo de enseñanza.
 *
 * @param {boolean} isMobile - Indica si está en vista móvil
 * @returns {JSX.Element} Componente de encabezado
 */
const DashboardHeader = ({ isMobile = false }) => {
  return (
    <Box sx={{ mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link
          underline="hover"
          color="text.secondary"
          href="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: '#6c757d',
            '&:hover': { color: '#495057' }
          }}
        >
          <Home sx={{ mr: 0.5 }} fontSize="inherit" />
          Inicio
        </Link>
        <Typography
          color="text.primary"
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: '#343a40',
            fontWeight: 500
          }}
        >
          <School sx={{ mr: 0.5 }} fontSize="inherit" />
          Módulo de Enseñanza
        </Typography>
      </Breadcrumbs>

      {/* Título */}
      <Typography
        variant={isMobile ? "h4" : "h3"}
        component="h1"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: '#2c3e50',
          mb: 2,
          fontSize: isMobile ? '1.8rem' : '2.2rem'
        }}
      >
        Módulo de Enseñanza - Mecánica Ventilatoria
      </Typography>

      {/* Descripción */}
      <Typography
        variant="body1"
        sx={{
          mb: 4,
          maxWidth: '800px',
          color: '#495057',
          fontSize: '1.1rem',
          lineHeight: 1.6
        }}
      >
        Aprende los fundamentos de la ventilación mecánica a través de un programa estructurado
        que combina teoría, práctica y simulaciones interactivas.
      </Typography>
    </Box>
  );
};

export default DashboardHeader;
