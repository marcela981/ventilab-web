/**
 * =============================================================================
 * ProfileInfo Component for VentyLab
 * =============================================================================
 * Displays user profile information including avatar, name, email, role, and
 * registration date. Can toggle between view and edit modes.
 *
 * Features:
 * - User avatar with initials placeholder
 * - Role badge with color coding
 * - Member since date with locale formatting
 * - Edit mode toggle
 * - Responsive design with Material UI
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  Chip,
  Button,
  Divider,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { ROLE_DISPLAY_NAMES } from '@/lib/auth-config';

/**
 * Get initials from name for avatar
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
    TEACHER: 'secondary',
    INSTRUCTOR: 'secondary',
    EXPERT: 'info',
    ADMIN: 'error',
  };
  return colors[role] || 'default';
};

/**
 * Format date to "Miembro desde Mes Año"
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatMemberSince = (date) => {
  if (!date) return 'Fecha no disponible';

  const dateObj = new Date(date);
  const options = { month: 'long', year: 'numeric' };
  const formatted = dateObj.toLocaleDateString('es-ES', options);

  // Capitalize first letter
  return `Miembro desde ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}`;
};

/**
 * ProfileInfo Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.user - User data object
 * @param {string} props.user.name - User's full name
 * @param {string} props.user.email - User's email
 * @param {string} props.user.role - User's role
 * @param {string} props.user.image - User's avatar image URL
 * @param {string} props.user.bio - User's bio
 * @param {string} props.user.createdAt - User's registration date
 * @param {boolean} props.isEditMode - Whether edit mode is active
 * @param {Function} props.onEditToggle - Callback to toggle edit mode
 *
 * @example
 * <ProfileInfo
 *   user={currentUser}
 *   isEditMode={false}
 *   onEditToggle={() => setIsEditMode(true)}
 * />
 */
export function ProfileInfo({ user, isEditMode, onEditToggle }) {
  if (!user) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            Cargando información del perfil...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={3}
      sx={{
        position: 'relative',
        overflow: 'visible',
        borderRadius: 3,
      }}
    >
      {/* Background gradient header */}
      <Box
        sx={{
          height: 120,
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          position: 'relative',
        }}
      />

      <CardContent sx={{ pt: 0, px: { xs: 2, sm: 4 }, pb: 4 }}>
        {/* Avatar Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            mt: -8,
          }}
        >
          {/* Avatar */}
          <Avatar
            src={user.image}
            alt={user.name || 'Usuario'}
            sx={{
              width: 140,
              height: 140,
              border: '5px solid white',
              boxShadow: 3,
              bgcolor: 'primary.main',
              fontSize: '3rem',
              fontWeight: 600,
            }}
          >
            {getInitials(user.name)}
          </Avatar>

          {/* Edit Button */}
          {!isEditMode && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={onEditToggle}
              sx={{
                mt: 2,
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
              }}
            >
              Editar Perfil
            </Button>
          )}
        </Box>

        {/* User Information */}
        <Box sx={{ mt: 3 }}>
          {/* Name */}
          <Typography
            variant="h4"
            align="center"
            fontWeight={700}
            gutterBottom
            sx={{ mb: 1 }}
          >
            {user.name || 'Usuario'}
          </Typography>

          {/* Bio */}
          {user.bio && (
            <Typography
              variant="body1"
              align="center"
              color="text.secondary"
              sx={{ mb: 2, maxWidth: 600, mx: 'auto' }}
            >
              {user.bio}
            </Typography>
          )}

          {/* Role Badge */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Chip
              icon={<BadgeIcon />}
              label={ROLE_DISPLAY_NAMES[user.role] || user.role}
              color={getRoleColor(user.role)}
              size="medium"
              sx={{
                fontWeight: 600,
                fontSize: '0.95rem',
                px: 1,
              }}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Information Grid */}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Email */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'primary.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <EmailIcon color="primary" />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Correo Electrónico
                  </Typography>
                  <Typography variant="body1" fontWeight={500} noWrap>
                    {user.email}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Member Since */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'success.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CalendarIcon color="success" />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Registro
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {formatMemberSince(user.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Additional User Role Info */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'secondary.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PersonIcon color="secondary" />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Tipo de Cuenta
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {ROLE_DISPLAY_NAMES[user.role] || user.role}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Account Status */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: user.isActive ? 'success.lighter' : 'error.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BadgeIcon
                    color={user.isActive ? 'success' : 'error'}
                  />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Estado
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {user.isActive !== false ? 'Cuenta Activa' : 'Cuenta Inactiva'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}

ProfileInfo.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
    image: PropTypes.string,
    bio: PropTypes.string,
    createdAt: PropTypes.string,
    isActive: PropTypes.bool,
  }),
  isEditMode: PropTypes.bool,
  onEditToggle: PropTypes.func.isRequired,
};

ProfileInfo.defaultProps = {
  user: null,
  isEditMode: false,
};

export default ProfileInfo;

