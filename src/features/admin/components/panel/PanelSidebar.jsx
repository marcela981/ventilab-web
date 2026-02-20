/**
 * =============================================================================
 * PanelSidebar - Role-Aware Admin Panel Navigation
 * =============================================================================
 * Sidebar navigation component for the administrative panel.
 * Dynamically renders menu items based on user role.
 *
 * Role visibility rules:
 * - teacher: Dashboard, Teaching, Students, Statistics
 * - admin: all teacher sections + Settings
 * - superuser: all sections
 *
 * Students should never see this sidebar (protected at route level).
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as TeachingIcon,
  People as StudentsIcon,
  BarChart as StatisticsIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { ROLES, getRoleDisplayName, isAdminOrAbove, isSuperuser } from '@/lib/roles';

/**
 * Navigation items configuration with role-based visibility.
 * Each item specifies which roles can see it using minRole or allowedRoles.
 */
const getNavigationItems = (userRole) => {
  // Base items visible to all panel users (teacher+)
  const baseItems = [
    {
      id: 'dashboard',
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/panel',
      // All panel users can see dashboard
    },
    {
      id: 'teaching',
      text: 'Contenido',
      icon: <TeachingIcon />,
      path: '/panel/teaching',
      // All panel users can manage teaching content
    },
    {
      id: 'students',
      text: 'Estudiantes',
      icon: <StudentsIcon />,
      path: '/panel/students',
      // All panel users can view students
    },
    {
      id: 'statistics',
      text: 'Estadísticas',
      icon: <StatisticsIcon />,
      path: '/panel/statistics',
      // All panel users can view statistics
    },
  ];

  // Admin-only items (admin and superuser)
  const adminItems = [];

  // Settings is only visible to admin and superuser
  if (isAdminOrAbove(userRole)) {
    adminItems.push({
      id: 'settings',
      text: 'Configuración',
      icon: <SettingsIcon />,
      path: '/panel/settings',
    });
  }

  return [...baseItems, ...adminItems];
};

/**
 * Get role badge color based on user role
 */
const getRoleBadgeColor = (role) => {
  switch (role) {
    case ROLES.SUPERUSER:
      return 'error';
    case ROLES.ADMIN:
      return 'warning';
    case ROLES.TEACHER:
      return 'info';
    default:
      return 'default';
  }
};

/**
 * PanelSidebar Component
 *
 * Renders the administrative panel sidebar with role-aware navigation.
 *
 * @component
 */
export default function PanelSidebar({ open, onToggle, drawerWidth }) {
  const location = useLocation();
  const { user, role } = useAuth();

  // Generate navigation items based on user role
  const navigationItems = getNavigationItems(role);

  /**
   * Check if a path is currently active.
   * Exact match for /panel, prefix match for sub-routes.
   */
  const isActivePath = (path) => {
    if (path === '/panel') {
      return location.pathname === '/panel' || location.pathname === '/panel/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: 'width 0.25s ease',
          overflowX: 'hidden',
          // Distinct dark theme for admin panel
          backgroundColor: '#1a237e',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#e8eaf6',
        },
      }}
    >
      {/* Header with toggle button */}
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          px: [1],
          minHeight: '64px !important',
        }}
      >
        {open && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AdminIcon sx={{ color: '#7c4dff' }} />
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ color: '#e8eaf6', fontWeight: 600 }}
            >
              Panel Admin
            </Typography>
          </Box>
        )}
        <IconButton
          onClick={onToggle}
          sx={{
            color: '#e8eaf6',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
          }}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* User role indicator */}
      {open && user && (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 0.5 }}
          >
            {user.name || user.email}
          </Typography>
          <Chip
            label={getRoleDisplayName(role)}
            color={getRoleBadgeColor(role)}
            size="small"
            sx={{ fontWeight: 500 }}
          />
        </Box>
      )}

      <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* Navigation Items - rendered based on user role */}
      <List sx={{ mt: 1, px: 1 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ display: 'block', mb: 0.5 }}>
            <Link
              to={item.path}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2,
                  backgroundColor: isActivePath(item.path)
                    ? 'rgba(124, 77, 255, 0.3)'
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: isActivePath(item.path)
                      ? 'rgba(124, 77, 255, 0.4)'
                      : 'rgba(255, 255, 255, 0.08)',
                  },
                  borderRadius: 2,
                  transition: 'background-color 0.2s ease',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 2 : 'auto',
                    justifyContent: 'center',
                    color: isActivePath(item.path) ? '#b388ff' : '#e8eaf6',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.text}
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: isActivePath(item.path) ? '#ffffff' : '#e8eaf6',
                        fontWeight: isActivePath(item.path) ? 600 : 400,
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </Link>
          </ListItem>
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      {/* Back to student view link */}
      <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
      <Box sx={{ p: 2 }}>
        <Link
          to="/dashboard"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <ListItemButton
            sx={{
              minHeight: 40,
              justifyContent: open ? 'initial' : 'center',
              px: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              borderRadius: 2,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : 'auto',
                justifyContent: 'center',
                color: '#e8eaf6',
              }}
            >
              <DashboardIcon fontSize="small" />
            </ListItemIcon>
            {open && (
              <ListItemText
                primary="Volver al LMS"
                primaryTypographyProps={{
                  variant: 'body2',
                  sx: { color: '#e8eaf6' },
                }}
              />
            )}
          </ListItemButton>
        </Link>
      </Box>

      {/* Version footer */}
      {open && (
        <Box sx={{ px: 2, pb: 2, textAlign: 'center' }}>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255, 255, 255, 0.4)' }}
          >
            VentyLab Admin v0.1.0
          </Typography>
        </Box>
      )}
    </Drawer>
  );
}

PanelSidebar.propTypes = {
  /**
   * Whether the sidebar is expanded
   */
  open: PropTypes.bool.isRequired,

  /**
   * Callback to toggle sidebar open/closed state
   */
  onToggle: PropTypes.func.isRequired,

  /**
   * Current drawer width in pixels
   */
  drawerWidth: PropTypes.number.isRequired,
};
