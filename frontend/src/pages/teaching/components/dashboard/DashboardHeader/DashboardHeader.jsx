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
 * DashboardHeader - Componente de cabecera minimalista para el módulo de enseñanza
 *
 * Muestra breadcrumbs de navegación, título principal y descripción del módulo
 * con un diseño limpio y profesional que se mantiene consistente en todos los dispositivos.
 *
 * @param {string} title - Título principal del módulo
 * @param {string} description - Descripción del módulo
 * @param {number} activeTab - Pestaña activa (0: Dashboard, 1: Curriculum, 2: Mi Progreso)
 * @returns {JSX.Element} Componente de cabecera del dashboard
 */
const DashboardHeader = ({
  title = "Módulo de Enseñanza",
  description = null,
  activeTab = 0
}) => {
  // Descripciones según la pestaña activa
  const getDescription = () => {
    if (description) return description;
    
    switch (activeTab) {
      case 0:
        return "Aprende los fundamentos de la mecánica ventilatoria de manera interactiva.";
      case 1:
        return "Explora nuestro currículo completo y en expansión, y planifica tu camino de aprendizaje.";
      case 2:
        return "Analiza tu desempeño, revisa tus logros y métricas detalladas de tu progreso.";
      default:
        return "Aprende los fundamentos de la mecánica ventilatoria de manera interactiva.";
    }
  };

  const displayTitle = activeTab === 2 ? "Mi Progreso" : title;
  const displayDescription = getDescription();
  return (
    <Box sx={{ mb: 4 }}>
      {/* Breadcrumbs de navegación */}
      <Breadcrumbs
        aria-label="breadcrumb"
        sx={{ mb: 2 }}
      >
        <Link
          underline="hover"
          href="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: '#e8f4fd',
            transition: 'color 0.2s ease',
            '&:hover': {
              color: '#ffffff'
            }
          }}
        >
          <Home sx={{ mr: 0.5, fontSize: 18 }} />
          Inicio
        </Link>
        <Typography
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: '#ffffff',
            fontWeight: 500
          }}
        >
          <School sx={{ mr: 0.5, fontSize: 18 }} />
          Módulo de Enseñanza
        </Typography>
      </Breadcrumbs>

      {/* Título principal */}
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 700,
          color: '#ffffff',
          mb: 2
        }}
      >
        {displayTitle}
      </Typography>

      {/* Descripción */}
      <Typography
        variant="body1"
        sx={{
          color: '#e8f4fd',
          maxWidth: '700px',
          mx: 'auto',
          textAlign: 'center'
        }}
      >
        {displayDescription}
      </Typography>
    </Box>
  );
};

DashboardHeader.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  activeTab: PropTypes.number
};

export default DashboardHeader;
