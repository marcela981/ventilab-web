/**
 * =============================================================================
 * Profile Page - VentyLab
 * =============================================================================
 * User profile page displaying personal information and password change form.
 *
 * Features:
 * - Profile information display
 * - Inline profile editing
 * - Password change functionality
 * - Tabbed navigation
 * - Protected route (requires authentication)
 *
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/contexts/AuthContext';
import {
  ProfileInfo,
  EditProfileForm,
  ChangePasswordForm,
} from '@/features/profile/components';

/**
 * Tab Panel Component
 */
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * Profile Page Component
 */
export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  /**
   * Handle tab change
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setIsEditMode(false); // Exit edit mode when changing tabs
  };

  /**
   * Handle successful profile save
   */
  const handleProfileSave = async () => {
    try {
      // Refresh user data from server to get updated info
      await refreshUser();
      setIsEditMode(false);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  /**
   * Handle cancel edit
   */
  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  /**
   * Handle edit toggle
   */
  const handleEditToggle = () => {
    setIsEditMode(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
          }}
        >
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            Cargando perfil...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="warning">
          Debes iniciar sesión para ver tu perfil.
        </Alert>
      </Container>
    );
  }

  // No user data
  if (!user) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          Error al cargar la información del usuario.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 3 }}
      >
        <Link
          component="button"
          onClick={() => router.push('/dashboard')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            textDecoration: 'none',
            color: 'text.primary',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          <HomeIcon fontSize="small" />
          Inicio
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
          Mi Perfil
        </Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          fontWeight={700}
          gutterBottom
          sx={{
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Mi Perfil
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestiona tu información personal y la seguridad de tu cuenta
        </Typography>
      </Box>

      {/* Tabs Navigation */}
      <Paper
        elevation={2}
        sx={{
          borderRadius: 3,
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="profile tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              minHeight: 64,
            },
          }}
        >
          <Tab
            icon={<PersonIcon />}
            iconPosition="start"
            label="Información Personal"
            id="profile-tab-0"
            aria-controls="profile-tabpanel-0"
          />
          <Tab
            icon={<LockIcon />}
            iconPosition="start"
            label="Cambiar Contraseña"
            id="profile-tab-1"
            aria-controls="profile-tabpanel-1"
          />
        </Tabs>

        {/* Tab: Personal Information */}
        <TabPanel value={activeTab} index={0}>
          {isEditMode ? (
            <EditProfileForm
              user={user}
              onSave={handleProfileSave}
              onCancel={handleCancelEdit}
            />
          ) : (
            <ProfileInfo
              user={user}
              isEditMode={isEditMode}
              onEditToggle={handleEditToggle}
            />
          )}
        </TabPanel>

        {/* Tab: Change Password */}
        <TabPanel value={activeTab} index={1}>
          <ChangePasswordForm />
        </TabPanel>

      </Paper>
    </Container>
  );
}

