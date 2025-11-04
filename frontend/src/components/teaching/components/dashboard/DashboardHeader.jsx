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
 * @returns {JSX.Element} Componente de cabecera del dashboard
 */
const DashboardHeader = ({
  title = "Módulo de Enseñanza",
  description = "Aprende los fundamentos de la mecánica ventilatoria de manera interactiva."
}) => {
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
            color: 'text.secondary',
            transition: 'color 0.2s ease',
            '&:hover': {
              color: 'primary.light'
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
            color: 'primary.main',
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
          color: 'text.primary',
          mb: 2
        }}
      >
        {title}
      </Typography>

      {/* Descripción */}
      <Typography
        variant="body1"
        sx={{
          color: 'text.secondary',
          maxWidth: '700px',
          mx: 'auto',
          textAlign: 'center'
        }}
      >
        {description}
      </Typography>
    </Box>
  );
};

DashboardHeader.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string
};

export default DashboardHeader;
