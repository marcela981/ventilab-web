/**
 * =============================================================================
 * Navbar Demo Page
 * =============================================================================
 * Interactive demonstration of the Navbar component with different user roles
 * 
 * NOTE: This page is client-side only to avoid SSR issues with useAuth
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { Layout } from '@/shared/components';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  School as SchoolIcon,
  MenuBook as MenuBookIcon,
  Create as CreateIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/contexts/AuthContext';

/**
 * Role visibility map
 */
const ROLE_VISIBILITY = {
  Inicio: ['All Users', 'Not Authenticated'],
  Aprendizaje: ['STUDENT', 'TEACHER', 'ADMIN'],
  Enseñanza: ['TEACHER', 'ADMIN'],
  'Gestión de Contenido': ['TEACHER', 'ADMIN'],
  Administración: ['ADMIN'],
  'Mi Perfil': ['STUDENT', 'TEACHER', 'ADMIN'],
};

/**
 * Navigation features list
 */
const FEATURES = [
  'Role-based navigation filtering',
  'Responsive mobile drawer',
  'Active route highlighting',
  'User profile dropdown menu',
  'Smooth transitions',
  'Authentication state awareness',
  'Material-UI design system',
  'Mobile-first responsive design',
];

/**
 * Navbar Demo Page
 */
export default function NavbarDemoPage() {
  const { user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Only render on client to avoid SSR issues with useAuth
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
            Navbar Component Demo
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Interactive demonstration of VentyLab's navigation component with role-based
            menu items and responsive design.
          </Typography>
        </Box>

        {/* Current User Status */}
        <Alert
          severity={isAuthenticated ? 'success' : 'info'}
          sx={{ mb: 4 }}
          icon={isAuthenticated ? <CheckIcon /> : undefined}
        >
          {isAuthenticated ? (
            <>
              <strong>Authenticated as:</strong> {user?.name} ({user?.email})
              <br />
              <strong>Role:</strong>{' '}
              <Chip
                label={user?.role}
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            </>
          ) : (
            <>
              <strong>Not authenticated.</strong> Log in to see role-specific navigation items.
            </>
          )}
        </Alert>

        <Grid container spacing={3}>
          {/* Features Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Features
                </Typography>
                <List dense>
                  {FEATURES.map((feature, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckIcon color="success" />
                      </ListItemIcon>
                      <ListItemText primary={feature} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Navigation Items Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Navigation Items & Visibility
                </Typography>
                <List dense>
                  {Object.entries(ROLE_VISIBILITY).map(([item, roles]) => {
                    const icons = {
                      Aprendizaje: SchoolIcon,
                      Enseñanza: MenuBookIcon,
                      'Gestión de Contenido': CreateIcon,
                      Administración: AdminIcon,
                      'Mi Perfil': PersonIcon,
                    };
                    const Icon = icons[item];

                    const isVisible =
                      !isAuthenticated && roles.includes('Not Authenticated')
                        ? true
                        : isAuthenticated && roles.includes(user?.role);

                    return (
                      <ListItem
                        key={item}
                        sx={{
                          opacity: isVisible ? 1 : 0.4,
                          backgroundColor: isVisible
                            ? 'success.light'
                            : 'transparent',
                          borderRadius: 1,
                          mb: 0.5,
                        }}
                      >
                        <ListItemIcon>
                          {Icon ? <Icon /> : <CheckIcon />}
                        </ListItemIcon>
                        <ListItemText
                          primary={item}
                          secondary={roles.join(', ')}
                          primaryTypographyProps={{
                            fontWeight: isVisible ? 600 : 400,
                          }}
                        />
                        {isVisible && (
                          <Chip label="Visible" size="small" color="success" />
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Responsive Design Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Responsive Design
                </Typography>
                <Typography variant="body2" paragraph>
                  The navbar adapts to different screen sizes:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Desktop (≥960px):</strong>
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Horizontal navigation bar with buttons
                    <br />
                    • User avatar with dropdown menu
                    <br />• All items visible in toolbar
                  </Typography>

                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Mobile (&lt;960px):</strong>
                  </Typography>
                  <Typography variant="body2">
                    • Hamburger menu button
                    <br />
                    • Slide-in drawer navigation
                    <br />
                    • User info in drawer header
                    <br />• Logout button in drawer
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Role Comparison Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Visible Items by Role
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    STUDENT
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Inicio
                    <br />
                    • Aprendizaje
                    <br />• Mi Perfil
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    TEACHER
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Inicio
                    <br />
                    • Aprendizaje
                    <br />
                    • Enseñanza
                    <br />
                    • Gestión de Contenido
                    <br />• Mi Perfil
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    ADMIN
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Inicio
                    <br />
                    • Aprendizaje
                    <br />
                    • Enseñanza
                    <br />
                    • Gestión de Contenido
                    <br />
                    • Administración
                    <br />• Mi Perfil
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>

          {/* Integration Card */}
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Integration with Your Pages
                </Typography>
                <Typography variant="body2" paragraph>
                  You can integrate the navigation in two ways:
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Option 1: Using Layout Component
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          backgroundColor: 'grey.100',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          fontSize: '0.875rem',
                        }}
                      >
                        {`import { Layout } from '@/shared/components';

export default function MyPage() {
  return (
    <Layout>
      <h1>My Page Content</h1>
    </Layout>
  );
}`}
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Option 2: Using Navbar Directly
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          backgroundColor: 'grey.100',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          fontSize: '0.875rem',
                        }}
                      >
                        {`import { Navbar } from '@/shared/components';

export default function MyPage() {
  return (
    <>
      <Navbar />
      <main>Your content</main>
    </>
  );
}`}
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Testing Instructions */}
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Testing Instructions:
              </Typography>
              <Typography variant="body2">
                1. <strong>Test as Student:</strong> Log in with a student account to see
                limited navigation
                <br />
                2. <strong>Test as Teacher:</strong> Log in with a teacher account to see
                teaching and content management options
                <br />
                3. <strong>Test as Admin:</strong> Log in with an admin account to see all
                navigation items
                <br />
                4. <strong>Test Mobile:</strong> Resize your browser window below 960px to
                see the mobile drawer
                <br />
                5. <strong>Test Logout:</strong> Click your avatar and select "Cerrar
                Sesión" to see the logged-out state
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}
