/**
 * =============================================================================
 * UserProfileButton Component for VentyLab
 * =============================================================================
 * Navigation bar component that displays user profile information and provides
 * quick access to profile settings and logout functionality.
 *
 * Features:
 * - User avatar with online status indicator
 * - Dropdown menu with profile options
 * - Role display badge
 * - Logout functionality with loading state
 * - Responsive design
 * =============================================================================
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';
import {
  Avatar,
  Badge,
  Button,
  Box,
  Menu,
  MenuItem,
  Divider,
  Typography,
  Chip,
  IconButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/hooks/useAuth';
import { ROLE_DISPLAY_NAMES } from '@/lib/auth-config';

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Get color for role chip
 * @param {string} role - User role
 * @returns {string} MUI color
 */
const getRoleColor = (role) => {
  const colors = {
    STUDENT: 'primary',
    INSTRUCTOR: 'secondary',
    EXPERT: 'info',
    ADMIN: 'error',
  };
  return colors[role] || 'default';
};

/**
 * UserProfileButton Component
 *
 * @param {Object} props - Component props
 * @param {boolean} props.showName - Whether to show user name next to avatar (default: true)
 * @param {string} props.size - Avatar size: 'small', 'medium', 'large' (default: 'medium')
 * @param {Function} props.onLogout - Callback after successful logout (optional)
 *
 * @example
 * <UserProfileButton />
 *
 * @example
 * <UserProfileButton
 *   showName={false}
 *   size="small"
 *   onLogout={() => console.log('User logged out')}
 * />
 */
export function UserProfileButton({ showName = true, size = 'medium', onLogout }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, role, logout } = useAuth();

  const [anchorEl, setAnchorEl] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const isMenuOpen = Boolean(anchorEl);

  // Avatar sizes
  const avatarSizes = {
    small: 32,
    medium: 40,
    large: 48,
  };

  const menuAvatarSize = 80;

  /**
   * Handle menu open
   */
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  /**
   * Handle menu close
   */
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  /**
   * Navigate to profile page
   */
  const handleProfileClick = () => {
    handleMenuClose();
    router.push('/profile');
  };

  /**
   * Navigate to settings page
   */
  const handleSettingsClick = () => {
    handleMenuClose();
    router.push('/settings');
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      handleMenuClose();

      // Execute logout
      await logout({
        callbackUrl: '/auth/login',
      });

      // Execute callback
      if (typeof onLogout === 'function') {
        onLogout();
      }
    } catch (error) {
      console.error('[UserProfileButton] Logout error:', error);
      setLoggingOut(false);
    }
  };

  /**
   * Navigate to login page
   */
  const handleLoginClick = () => {
    router.push('/auth/login');
  };

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Not authenticated - show login button
  if (!isAuthenticated) {
    return (
      <Button
        variant="contained"
        startIcon={<LoginIcon />}
        onClick={handleLoginClick}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
        }}
      >
        Iniciar Sesión
      </Button>
    );
  }

  // Authenticated - show profile button
  return (
    <>
      {/* Profile Button */}
      <Tooltip title="Mi cuenta">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            borderRadius: 2,
            p: 0.5,
            transition: 'background-color 0.2s',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
          onClick={handleMenuOpen}
          aria-controls={isMenuOpen ? 'user-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
        >
          {/* Avatar with online badge */}
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: '#44b700',
                color: '#44b700',
                boxShadow: (theme) => `0 0 0 2px ${theme.palette.background.paper}`,
                '&::after': {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  animation: 'ripple 1.2s infinite ease-in-out',
                  border: '1px solid currentColor',
                  content: '""',
                },
              },
              '@keyframes ripple': {
                '0%': {
                  transform: 'scale(.8)',
                  opacity: 1,
                },
                '100%': {
                  transform: 'scale(2.4)',
                  opacity: 0,
                },
              },
            }}
          >
            <Avatar
              src={user?.image}
              alt={user?.name || 'Usuario'}
              sx={{
                width: avatarSizes[size],
                height: avatarSizes[size],
                bgcolor: 'primary.main',
                fontSize: size === 'small' ? '0.875rem' : '1rem',
              }}
            >
              {getInitials(user?.name)}
            </Avatar>
          </Badge>

          {/* User name (optional) */}
          {showName && (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                display: { xs: 'none', sm: 'block' },
              }}
            >
              {user?.name?.split(' ')[0] || 'Usuario'}
            </Typography>
          )}

          {/* Dropdown arrow */}
          <ArrowDownIcon
            sx={{
              fontSize: 20,
              transition: 'transform 0.2s',
              transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </Box>
      </Tooltip>

      {/* Dropdown Menu */}
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 280,
            borderRadius: 2,
            mt: 1.5,
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Avatar
              src={user?.image}
              alt={user?.name}
              sx={{
                width: menuAvatarSize,
                height: menuAvatarSize,
                bgcolor: 'primary.main',
                fontSize: '2rem',
              }}
            >
              {getInitials(user?.name)}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {user?.name || 'Usuario'}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user?.email}
              </Typography>
              <Chip
                label={ROLE_DISPLAY_NAMES[role] || role}
                size="small"
                color={getRoleColor(role)}
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Menu Items */}
        <MenuItem onClick={handleProfileClick} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Mi Perfil"
            secondary="Ver y editar información"
          />
        </MenuItem>

        <MenuItem onClick={handleSettingsClick} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Configuración"
            secondary="Preferencias y ajustes"
          />
        </MenuItem>

        <Divider />

        {/* Logout */}
        <MenuItem
          onClick={handleLogout}
          disabled={loggingOut}
          sx={{
            py: 1.5,
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.lighter',
            },
          }}
        >
          <ListItemIcon>
            {loggingOut ? (
              <CircularProgress size={20} color="error" />
            ) : (
              <LogoutIcon fontSize="small" color="error" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
          />
        </MenuItem>
      </Menu>
    </>
  );
}

UserProfileButton.propTypes = {
  showName: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  onLogout: PropTypes.func,
};

UserProfileButton.defaultProps = {
  showName: true,
  size: 'medium',
  onLogout: null,
};

export default UserProfileButton;
