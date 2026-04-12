/**
 * =============================================================================
 * Achievements Page - VentyLab
 * =============================================================================
 * Página completa de la galería de logros del usuario.
 * Muestra todos los logros desbloqueados y bloqueados con filtros y búsqueda.
 *
 * Features:
 * - Protección de autenticación mediante middleware
 * - Layout consistente con el resto de la aplicación
 * - Breadcrumb navigation para facilitar la navegación
 * - Header con título y descripción del sistema de logros
 * - Integración con AchievementsGallery component
 * - SEO optimizado con meta tags
 * - Responsive design
 * =============================================================================
 */

import React from 'react';
import Head from 'next/head';
import { Box, Container, Typography, Breadcrumbs, Link } from '@mui/material';
import { Home as HomeIcon, Dashboard as DashboardIcon } from '@mui/icons-material';
import NextLink from 'next/link';
import dynamic from 'next/dynamic';
import Layout from '@/shared/components/Layout';

// Importar sin SSR para evitar errores de prerendering con contextos de auth
const AchievementsGallery = dynamic(
  () => import('@/features/progress/components').then(mod => ({ default: mod.AchievementsGrid })),
  { ssr: false }
);

/**
 * Achievements Page Component
 *
 * Página principal de logros que muestra la galería completa de logros
 * del usuario con navegación y estructura de página completa.
 *
 * @page
 * @route /achievements
 * @protected Requiere autenticación (protegido por middleware)
 *
 * @example
 * // Navegar a la página de logros
 * router.push('/achievements');
 */
export default function AchievementsPage() {
  return (
    <>
      {/* SEO Meta Tags */}
      <Head>
        <title>Mis Logros - VentyLab</title>
        <meta
          name="description"
          content="Explora y desbloquea logros en VentyLab. Completa lecciones, módulos y mantén tu racha de estudio para conseguir todos los logros disponibles."
        />
        <meta name="keywords" content="logros, achievements, gamificación, aprendizaje, VentyLab, ventilación mecánica" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Mis Logros - VentyLab" />
        <meta
          property="og:description"
          content="Explora y desbloquea logros en VentyLab. Completa lecciones, módulos y mantén tu racha de estudio."
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Mis Logros - VentyLab" />
        <meta
          name="twitter:description"
          content="Explora y desbloquea logros en VentyLab. Completa lecciones, módulos y mantén tu racha de estudio."
        />
      </Head>

      {/* Page Layout - usando maxWidth=false porque cada sección maneja su propio Container */}
      <Layout maxWidth={false} disablePadding>
        {/* Header Section with Breadcrumbs - Container XL para header amplio */}
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Breadcrumb Navigation */}
          <Box sx={{ mb: 3 }}>
            <Breadcrumbs
              aria-label="breadcrumb"
              sx={{
                fontSize: '0.875rem',
                '& .MuiBreadcrumbs-separator': {
                  mx: 1,
                },
              }}
            >
              {/* Home Link */}
              <Link
                component={NextLink}
                href="/"
                underline="hover"
                color="inherit"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              >
                <HomeIcon sx={{ fontSize: 20 }} />
                Home
              </Link>

              {/* Dashboard Link */}
              <Link
                component={NextLink}
                href="/dashboard"
                underline="hover"
                color="inherit"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              >
                <DashboardIcon sx={{ fontSize: 20 }} />
                Dashboard
              </Link>

              {/* Current Page */}
              <Typography
                color="text.primary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 500,
                }}
              >
                Logros
              </Typography>
            </Breadcrumbs>
          </Box>

          {/* Page Header */}
          <Box
            sx={{
              mb: 4,
              pb: 3,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            {/* Main Title */}
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                fontSize: {
                  xs: '2rem',
                  sm: '2.5rem',
                  md: '3rem',
                },
              }}
            >
              Mis Logros
            </Typography>

            {/* Subtitle / Description */}
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                maxWidth: 800,
                lineHeight: 1.7,
                fontSize: {
                  xs: '0.95rem',
                  sm: '1rem',
                },
              }}
            >
              Desbloquea logros completando lecciones, módulos y manteniendo tu racha de estudio.
              Cada logro representa un hito en tu camino de aprendizaje sobre ventilación mecánica.
              ¡Sigue avanzando para conseguirlos todos!
            </Typography>
          </Box>
        </Container>

        {/* Achievements Gallery Component - tiene su propio Container interno */}
        <AchievementsGallery />
      </Layout>
    </>
  );
}

/**
 * =============================================================================
 * USAGE NOTES
 * =============================================================================
 *
 * AUTHENTICATION:
 * - Esta página está protegida por el middleware de Next.js
 * - Solo usuarios autenticados pueden acceder
 * - Redirección automática a /auth/login si no está autenticado
 *
 * NAVIGATION:
 * - Accesible desde el dashboard o navbar
 * - Breadcrumbs permiten navegación rápida
 * - URL: /achievements
 *
 * RESPONSIVE DESIGN:
 * - Totalmente responsive en todos los tamaños de pantalla
 * - Título se ajusta en móviles (2rem) a desktop (3rem)
 * - Breadcrumbs se adaptan automáticamente
 * - El componente AchievementsGallery maneja su propia responsividad
 *
 * SEO:
 * - Meta tags optimizados para búsqueda
 * - Open Graph tags para redes sociales
 * - Twitter Card tags para Twitter
 * - Title descriptivo y único
 *
 * CUSTOMIZATION:
 * - Cambiar maxWidth de "xl" a "lg" para contenedor más estrecho
 * - Ajustar colores del gradiente en el título
 * - Modificar descripción según necesidades
 * - Agregar más breadcrumb items si es necesario
 *
 * INTEGRATION:
 * - Usa el Layout component para consistencia visual
 * - Integra AchievementsGallery que maneja toda la lógica de logros
 * - Compatible con el sistema de tema de MUI
 *
 * =============================================================================
 */
