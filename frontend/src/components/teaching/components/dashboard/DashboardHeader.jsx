import React from 'react';
import PropTypes from 'prop-types';
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
 * DashboardHeader - Componente de cabecera para el módulo de enseñanza
 * 
 * Muestra breadcrumbs de navegación, título principal y descripción del módulo.
 * Incluye responsive behavior para dispositivos móviles.
 * 
 * @param {boolean} isMobile - Indica si el dispositivo es móvil
 * @param {string} title - Título principal del módulo
 * @param {string} description - Descripción del módulo
 */
const DashboardHeader = ({ 
  isMobile, 
  title = "Módulo de Enseñanza - Mecánica Ventilatoria",
  description = "Aprende los fundamentos de la ventilación mecánica a través de un programa estructurado que combina teoría, práctica y simulaciones interactivas."
}) => {
  return (
    <Box sx={{ mb: 4 }}>
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
        {title}
      </Typography>

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
        {description}
      </Typography>
    </Box>
  );
};

DashboardHeader.propTypes = {
  isMobile: PropTypes.bool.isRequired,
  title: PropTypes.string,
  description: PropTypes.string
};

export default DashboardHeader;
