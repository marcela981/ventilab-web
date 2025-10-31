/**
 * =============================================================================
 * Navbar Component for VentyLab
 * =============================================================================
 * Main navigation with role-based menu items
 * Responsive design with mobile drawer
 * =============================================================================
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Container,
  Avatar,
  Button,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Badge,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  School as SchoolIcon,
  MenuBook as MenuBookIcon,
  Create as CreateIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  PersonAdd as RegisterIcon,
  Home as HomeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Navigation Configuration
 * Define all navigation items with their roles and properties
 */
const NAVIGATION_CONFIG = [
  {
    label: 'Inicio',
    path: '/',
    icon: HomeIcon,
    roles: ['STUDENT', 'TEACHER', 'ADMIN'], // Available to all
    showWhenLoggedOut: true,
  },
  {
    label: 'Aprendizaje',
    path: '/dashboard/learning',
    icon: SchoolIcon,
    roles: ['STUDENT', 'TEACHER', 'ADMIN'],
    description: 'Módulos y lecciones',
  },
  {
    label: 'Enseñanza',
    path: '/dashboard/teaching',
    icon: MenuBookIcon,
    roles: ['TEACHER', 'ADMIN'],
    description: 'Panel de profesor',
  },
  {
    label: 'Gestión de Contenido',
    path: '/dashboard/content',
    icon: CreateIcon,
    roles: ['TEACHER', 'ADMIN'],
    description: 'Crear y editar contenido',
  },
  {
    label: 'Administración',
    path: '/dashboard/admin',
    icon: AdminIcon,
    roles: ['ADMIN'],
    description: 'Panel de administración',
  },
  {
    label: 'Mi Perfil',
    path: '/profile',
    icon: PersonIcon,
    roles: ['STUDENT', 'TEACHER', 'ADMIN'],
    description: 'Configuración de perfil',
  },
];

/**
 * Get role display name in Spanish
 */
const getRoleDisplayName = (role) => {
  const roleNames = {
    STUDENT: 'Estudiante',
    TEACHER: 'Profesor',
    ADMIN: 'Administrador',
  };
  return roleNames[role] || role;
};

/**
 * Get role color
 */
const getRoleColor = (role) => {
  const colors = {
    STUDENT: 'primary',
    TEACHER: 'secondary',
    ADMIN: 'error',
  };
  return colors[role] || 'default';
};

/**
 * Navbar Component
 */
export default function Navbar() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isAuthenticated, logout } = useAuth();

  // State for mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false);

  // State for user menu
  const [anchorElUser, setAnchorElUser] = useState(null);

  /**
   * Filter navigation items based on user role
   */
  const getFilteredNavItems = () => {
    if (!isAuthenticated) {
      // Show only public items when not logged in
      return NAVIGATION_CONFIG.filter((item) => item.showWhenLoggedOut);
    }

    // Filter items based on user role
    return NAVIGATION_CONFIG.filter(
      (item) => !item.showWhenLoggedOut && item.roles.includes(user?.role)
    );
  };

  const navItems = getFilteredNavItems();

  /**
   * Handle mobile drawer toggle
   */
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  /**
   * Handle user menu open
   */
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  /**
   * Handle user menu close
   */
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  /**
   * Handle navigation
   */
  const handleNavigate = (path) => {
    router.push(path);
    setMobileOpen(false);
    handleCloseUserMenu();
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      handleCloseUserMenu();
      await logout();
      // NextAuth signOut
      await signOut({ redirect: false });
      router.push('/');
    } catch (error) {
      console.error('[Navbar] Logout error:', error);
    }
  };

  /**
   * Check if current path is active
   */
  const isActivePath = (path) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  /**
   * Render desktop navigation
   */
  const renderDesktopNav = () => (
    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = isActivePath(item.path);

        return (
          <Tooltip key={item.path} title={item.description || item.label}>
            <Button
              onClick={() => handleNavigate(item.path)}
              startIcon={<Icon />}
              sx={{
                color: isActive ? 'primary.main' : 'inherit',
                fontWeight: isActive ? 600 : 400,
                borderBottom: isActive ? 2 : 0,
                borderColor: 'primary.main',
                borderRadius: isActive ? 0 : 1,
                px: 2,
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              {item.label}
            </Button>
          </Tooltip>
        );
      })}
    </Box>
  );

  /**
   * Render mobile drawer
   */
  const renderMobileDrawer = () => (
    <Drawer
      variant="temporary"
      anchor="left"
      open={mobileOpen}
      onClose={handleDrawerToggle}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      sx={{
        display: { xs: 'block', md: 'none' },
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: 280,
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700} color="primary">
          VentyLab
        </Typography>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {isAuthenticated && user && (
        <>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                alt={user.name}
                src={user.image}
                sx={{ width: 48, height: 48 }}
              >
                {user.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {user.name}
                </Typography>
                <Chip
                  label={getRoleDisplayName(user.role)}
                  size="small"
                  color={getRoleColor(user.role)}
                />
              </Box>
            </Box>
          </Box>
          <Divider />
        </>
      )}

      <List>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(item.path);

          return (
            <ListItem
              button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              selected={isActive}
              sx={{
                borderLeft: isActive ? 4 : 0,
                borderColor: 'primary.main',
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                },
              }}
            >
              <ListItemIcon>
                <Icon color={isActive ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.description}
                primaryTypographyProps={{
                  fontWeight: isActive ? 600 : 400,
                }}
              />
            </ListItem>
          );
        })}
      </List>

      {isAuthenticated && (
        <>
          <Divider />
          <List>
            <ListItem button onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Cerrar Sesión"
                primaryTypographyProps={{ color: 'error' }}
              />
            </ListItem>
          </List>
        </>
      )}

      {!isAuthenticated && (
        <>
          <Divider />
          <List>
            <ListItem button onClick={() => handleNavigate('/auth/login')}>
              <ListItemIcon>
                <LoginIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Iniciar Sesión" />
            </ListItem>
            <ListItem button onClick={() => handleNavigate('/auth/register')}>
              <ListItemIcon>
                <RegisterIcon color="secondary" />
              </ListItemIcon>
              <ListItemText primary="Registrarse" />
            </ListItem>
          </List>
        </>
      )}
    </Drawer>
  );

  /**
   * Render user menu
   */
  const renderUserMenu = () => (
    <Menu
      sx={{ mt: '45px' }}
      id="menu-appbar"
      anchorEl={anchorElUser}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={Boolean(anchorElUser)}
      onClose={handleCloseUserMenu}
    >
      <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {user?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.email}
        </Typography>
        <Chip
          label={getRoleDisplayName(user?.role)}
          size="small"
          color={getRoleColor(user?.role)}
          sx={{ mt: 1 }}
        />
      </Box>

      <Divider />

      <MenuItem onClick={() => handleNavigate('/profile')}>
        <ListItemIcon>
          <PersonIcon fontSize="small" />
        </ListItemIcon>
        <Typography>Mi Perfil</Typography>
      </MenuItem>

      <Divider />

      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" color="error" />
        </ListItemIcon>
        <Typography color="error">Cerrar Sesión</Typography>
      </MenuItem>
    </Menu>
  );

  /**
   * Render authenticated user section
   */
  const renderAuthSection = () => {
    if (isAuthenticated && user) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Abrir menú">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Avatar alt={user.name} src={user.image}>
                {user.name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
          {renderUserMenu()}
        </Box>
      );
    }

    // Not authenticated - show login/register buttons
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<LoginIcon />}
          onClick={() => handleNavigate('/auth/login')}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          Iniciar Sesión
        </Button>
        <Button
          variant="contained"
          startIcon={<RegisterIcon />}
          onClick={() => handleNavigate('/auth/register')}
        >
          Registrarse
        </Button>
      </Box>
    );
  };

  /**
   * Main render
   */
  return (
    <>
      <AppBar
        position="sticky"
        elevation={1}
        sx={{
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* Mobile menu button */}
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { md: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Logo */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                mr: 4,
              }}
              onClick={() => handleNavigate('/')}
            >
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  textDecoration: 'none',
                }}
              >
                VentyLab
              </Typography>
            </Box>

            {/* Desktop navigation */}
            {!isMobile && renderDesktopNav()}

            {/* Spacer */}
            <Box sx={{ flexGrow: 1 }} />

            {/* User section */}
            {renderAuthSection()}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile drawer */}
      {renderMobileDrawer()}
    </>
  );
}
