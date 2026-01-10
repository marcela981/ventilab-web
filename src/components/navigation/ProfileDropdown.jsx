/**
 * =============================================================================
 * ProfileDropdown Component for VentyLab
 * =============================================================================
 * Compact dropdown profile menu for sidebar with smooth animations.
 * 
 * Features:
 * - Minimal footprint (just avatar + optional name)
 * - Smooth dropdown animation
 * - Click outside to close
 * - User info header in dropdown
 * - Quick access to profile and logout
 * - Responsive design
 * =============================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import {
  Box,
  Avatar,
  Typography,
  Paper,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Fade,
  ClickAwayListener,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Logout as LogoutIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
} from '@mui/icons-material';

/**
 * Get initials from user name
 */
const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Get role information
 */
const getRoleInfo = (role) => {
  const roleMap = {
    STUDENT: { 
      label: 'Estudiante', 
      color: '#4caf50',
    },
    TEACHER: { 
      label: 'Profesor', 
      color: '#2196f3',
    },
    ADMIN: { 
      label: 'Administrador', 
      color: '#f44336',
    },
  };
  return roleMap[role] || { label: 'Usuario', color: '#757575' };
};

/**
 * ProfileDropdown Component
 * 
 * Compact profile menu for sidebar with dropdown functionality.
 * 
 * @param {Object} props
 * @param {Object} props.user - User object
 * @param {boolean} props.isExpanded - Whether sidebar is expanded
 * @param {Function} props.onLogout - Logout handler
 * @param {Function} props.onProfileClick - Profile click handler
 * @param {boolean} props.isLoggingOut - Logout in progress
 * @param {string} props.position - Position in sidebar: 'top' or 'bottom' (default: 'bottom')
 */
export function ProfileDropdown({
  user,
  isExpanded = true,
  onLogout,
  onProfileClick,
  isLoggingOut = false,
  position = 'bottom',
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef(null);

  const roleInfo = getRoleInfo(user?.role);

  /**
   * Toggle dropdown
   */
  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  /**
   * Close dropdown
   */
  const handleClose = () => {
    setIsOpen(false);
  };

  /**
   * Handle profile click
   */
  const handleProfileClick = () => {
    handleClose();
    if (onProfileClick) {
      onProfileClick();
    } else {
      router.push('/profile');
    }
  };

  /**
   * Handle logout
   */
  const handleLogoutClick = () => {
    if (isLoggingOut) return;
    handleClose();
    if (onLogout) {
      onLogout();
    }
  };

  /**
   * Close on escape key
   */
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!user) {
    return null;
  }

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
        }}
      >
        {/* Trigger Button */}
        <Box
          ref={anchorRef}
          onClick={handleToggle}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isExpanded ? 'space-between' : 'center',
            gap: 1.5,
            p: isExpanded ? 1.5 : 1,
            cursor: 'pointer',
            borderRadius: 2,
            backgroundColor: isOpen 
              ? 'rgba(255, 255, 255, 0.12)' 
              : 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }}
        >
          {/* Avatar */}
          <Avatar
            src={user.image || user.avatar}
            alt={user.name}
            sx={{
              width: isExpanded ? 40 : 36,
              height: isExpanded ? 40 : 36,
              bgcolor: roleInfo.color,
              color: 'white',
              fontWeight: 700,
              fontSize: isExpanded ? '1rem' : '0.9rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0,
            }}
          >
            {!user.image && !user.avatar && getInitials(user.name)}
          </Avatar>

          {/* Name and Arrow (Expanded Only) */}
          {isExpanded && (
            <>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'white',
                    fontWeight: 600,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.7rem',
                  }}
                >
                  {roleInfo.label}
                </Typography>
              </Box>

              {/* Arrow Icon */}
              <Box
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'transform 0.2s ease',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <ArrowDownIcon fontSize="small" />
              </Box>
            </>
          )}
        </Box>

        {/* Dropdown Menu */}
        <Fade in={isOpen} timeout={200}>
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              [position === 'bottom' ? 'bottom' : 'top']: '100%',
              left: 0,
              right: 0,
              [position === 'bottom' ? 'mb' : 'mt']: 1,
              zIndex: 1300,
              borderRadius: 2,
              overflow: 'hidden',
              minWidth: isExpanded ? '100%' : 200,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: isOpen ? 'block' : 'none',
            }}
          >
            {/* User Info Header */}
            <Box
              sx={{
                p: 2,
                background: `linear-gradient(135deg, ${roleInfo.color}15 0%, ${roleInfo.color}05 100%)`,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Avatar
                  src={user.image || user.avatar}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: roleInfo.color,
                    border: '2px solid',
                    borderColor: roleInfo.color,
                  }}
                >
                  {!user.image && !user.avatar && getInitials(user.name)}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      display: 'block',
                    }}
                  >
                    {user.email || roleInfo.label}
                  </Typography>
                </Box>
              </Box>
              
              {/* Role Badge */}
              <Chip
                label={roleInfo.label}
                size="small"
                sx={{
                  height: 24,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: roleInfo.color,
                  color: 'white',
                }}
              />
            </Box>

            {/* Menu Items */}
            <MenuList sx={{ py: 1 }}>
              {/* View Profile */}
              <MenuItem
                onClick={handleProfileClick}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon>
                  <PersonIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Ver Perfil"
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                />
              </MenuItem>

              <Divider sx={{ my: 1 }} />

              {/* Logout */}
              <MenuItem
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(244, 67, 54, 0.08)',
                    '& .MuiListItemIcon-root': {
                      color: 'error.main',
                    },
                    '& .MuiListItemText-primary': {
                      color: 'error.main',
                    },
                  },
                  '&.Mui-disabled': {
                    opacity: 0.5,
                  },
                }}
              >
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                />
              </MenuItem>
            </MenuList>
          </Paper>
        </Fade>
      </Box>
    </ClickAwayListener>
  );
}

ProfileDropdown.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    role: PropTypes.oneOf(['STUDENT', 'TEACHER', 'ADMIN']).isRequired,
    image: PropTypes.string,
    avatar: PropTypes.string,
    email: PropTypes.string,
  }).isRequired,
  isExpanded: PropTypes.bool,
  onLogout: PropTypes.func.isRequired,
  onProfileClick: PropTypes.func,
  isLoggingOut: PropTypes.bool,
  position: PropTypes.oneOf(['top', 'bottom']),
};

export default ProfileDropdown;

