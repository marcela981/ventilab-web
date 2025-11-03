/**
 * =============================================================================
 * SidebarUserCard Component for VentyLab
 * =============================================================================
 * Compact and reusable user profile card for sidebar navigation.
 * 
 * Features:
 * - Displays user avatar (image or initials)
 * - Shows user name and role badge
 * - Responsive design for expanded/collapsed sidebar
 * - Context menu with "View Profile" and "Logout" options
 * - Hover effects and transitions
 * - Role-based color coding
 * =============================================================================
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import {
  Box,
  Avatar,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Logout as LogoutIcon,
  MoreVert as MoreVertIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';

/**
 * Get initials from user name
 * @param {string} name - User's full name
 * @returns {string} Initials (e.g., "MG" for "María García")
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
 * Get role display information (label and color)
 * @param {string} role - User role (STUDENT, TEACHER, ADMIN)
 * @returns {Object} Role info with label and color
 */
const getRoleInfo = (role) => {
  const roleMap = {
    STUDENT: { 
      label: 'Estudiante', 
      color: '#4caf50',
      bgColor: 'rgba(76, 175, 80, 0.1)',
    },
    TEACHER: { 
      label: 'Profesor', 
      color: '#2196f3',
      bgColor: 'rgba(33, 150, 243, 0.1)',
    },
    ADMIN: { 
      label: 'Administrador', 
      color: '#f44336',
      bgColor: 'rgba(244, 67, 54, 0.1)',
    },
  };
  return roleMap[role] || { 
    label: 'Usuario', 
    color: '#757575',
    bgColor: 'rgba(117, 117, 117, 0.1)',
  };
};

/**
 * SidebarUserCard Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - User object with name, role, and avatar/image
 * @param {boolean} props.isExpanded - Whether sidebar is expanded
 * @param {Function} props.onLogout - Logout handler function
 * @param {Function} props.onProfileClick - Profile click handler (optional)
 * @param {boolean} props.isLoggingOut - Whether logout is in progress (optional)
 * 
 * @example
 * <SidebarUserCard 
 *   user={{ name: "María García", role: "STUDENT", image: null }}
 *   isExpanded={true}
 *   onLogout={handleLogout}
 *   isLoggingOut={false}
 * />
 */
export function SidebarUserCard({
  user,
  isExpanded = true,
  onLogout,
  onProfileClick,
  isLoggingOut = false,
}) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const roleInfo = getRoleInfo(user?.role);

  /**
   * Handle opening context menu
   */
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  /**
   * Handle closing context menu
   */
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  /**
   * Handle profile navigation
   */
  const handleProfileClick = () => {
    handleMenuClose();
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
    // Prevent logout if already in progress
    if (isLoggingOut) {
      return;
    }
    
    handleMenuClose();
    if (onLogout) {
      onLogout();
    }
  };

  /**
   * Handle card click (navigate to profile)
   */
  const handleCardClick = () => {
    if (!menuOpen) {
      handleProfileClick();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Box
        sx={{
          p: isExpanded ? 2 : 1,
          mb: 1,
        }}
      >
        {/* Main Profile Card */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: isExpanded ? 'row' : 'column',
            alignItems: 'center',
            gap: isExpanded ? 1.5 : 1,
            p: isExpanded ? 1.5 : 1,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            position: 'relative',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            },
          }}
          onClick={handleCardClick}
        >
          {/* Avatar */}
          <Avatar
            src={user.image || user.avatar}
            alt={user.name}
            sx={{
              width: isExpanded ? 48 : 40,
              height: isExpanded ? 48 : 40,
              bgcolor: roleInfo.color,
              color: 'white',
              fontWeight: 700,
              fontSize: isExpanded ? '1.2rem' : '1rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0,
            }}
          >
            {!user.image && !user.avatar && getInitials(user.name)}
          </Avatar>

          {/* User Info (Expanded View) */}
          {isExpanded && (
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              {/* Name */}
              <Typography
                variant="body2"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mb: 0.5,
                }}
              >
                {user.name}
              </Typography>

              {/* Role Badge */}
              <Chip
                label={roleInfo.label}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: roleInfo.color,
                  color: 'white',
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            </Box>
          )}

          {/* Menu Button (Expanded View) */}
          {isExpanded && (
            <Tooltip title="Opciones" placement="left">
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                  },
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Action Buttons (Collapsed View) */}
        {!isExpanded && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              mt: 1,
            }}
          >
            {/* Profile Button */}
            <Tooltip title="Ver Perfil" placement="right">
              <IconButton
                onClick={handleProfileClick}
                size="small"
                sx={{
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
                }}
              >
                <PersonIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Logout Button */}
            <Tooltip title={isLoggingOut ? "Cerrando sesión..." : "Cerrar Sesión"} placement="right">
              <span>
                <IconButton
                  onClick={handleLogoutClick}
                  size="small"
                  disabled={isLoggingOut}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(244, 67, 54, 0.2)',
                    '&:hover': {
                      backgroundColor: 'rgba(244, 67, 54, 0.3)',
                    },
                    '&:disabled': {
                      opacity: 0.5,
                      cursor: 'not-allowed',
                    },
                  }}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Context Menu (Expanded View) */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 200,
            borderRadius: 2,
            mt: -1,
            ml: 1,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1.5,
              borderRadius: 1,
              mx: 1,
              my: 0.5,
              transition: 'all 0.2s ease',
            },
          },
        }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5, pb: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              mb: 0.5,
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

        <Divider sx={{ my: 0.5 }} />

        {/* View Profile Option */}
        <MenuItem onClick={handleProfileClick}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Ver Perfil"
            primaryTypographyProps={{
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          />
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {/* Logout Option */}
        <MenuItem 
          onClick={handleLogoutClick}
          disabled={isLoggingOut}
          sx={{
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
            primary={isLoggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
            primaryTypographyProps={{
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          />
        </MenuItem>
      </Menu>
    </>
  );
}

SidebarUserCard.propTypes = {
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
};

export default SidebarUserCard;

