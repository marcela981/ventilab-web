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
 *
 * Estilos: clases de ../ui/profile.module.css (variables de tema VentyLab).
 * =============================================================================
 */

import React from 'react';
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
} from '@mui/material';
import {
  Edit as EditIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { ROLE_DISPLAY_NAMES } from '@/lib/auth-config';
import styles from '../ui/profile.module.css';

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
    <Card elevation={3} className={styles.card}>
      {/* Background gradient header */}
      <Box className={styles.cardBanner} />

      <CardContent className={styles.cardContent}>
        {/* Avatar Section */}
        <Box className={styles.avatarSection}>
          {/* Avatar */}
          <Avatar
            src={user.image}
            alt={user.name || 'Usuario'}
            className={styles.avatar}
          >
            {getInitials(user.name)}
          </Avatar>

          {/* Edit Button */}
          {!isEditMode && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={onEditToggle}
              className={`${styles.actionBtn} ${styles.editProfileBtn}`}
            >
              Editar Perfil
            </Button>
          )}
        </Box>

        {/* User Information */}
        <Box className={styles.formSection}>
          {/* Name */}
          <Typography
            variant="h4"
            align="center"
            fontWeight={700}
            gutterBottom
            className={styles.nameHeading}
          >
            {user.name || 'Usuario'}
          </Typography>

          {/* Role Badge */}
          <Box className={styles.centerRow}>
            <Chip
              icon={<BadgeIcon />}
              label={ROLE_DISPLAY_NAMES[user.role] || user.role}
              color={getRoleColor(user.role)}
              size="medium"
              className={styles.roleChip}
            />
          </Box>

          <Divider className={styles.sectionDivider} />

          {/* Information Grid */}
          <Grid container spacing={3} className={styles.infoGrid}>
            {/* Email */}
            <Grid item xs={12} md={6}>
              <Box className={styles.infoTile}>
                <Box className={`${styles.infoTileIcon} ${styles.tintPrimary}`}>
                  <EmailIcon color="primary" />
                </Box>
                <Box className={styles.infoTileBody}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    className={styles.infoLabel}
                  >
                    Correo Electrónico
                  </Typography>
                  <Typography variant="body1" className={styles.infoValue} noWrap>
                    {user.email}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Member Since */}
            <Grid item xs={12} md={6}>
              <Box className={styles.infoTile}>
                <Box className={`${styles.infoTileIcon} ${styles.tintSuccess}`}>
                  <CalendarIcon color="success" />
                </Box>
                <Box className={styles.infoTileBody}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    className={styles.infoLabel}
                  >
                    Registro
                  </Typography>
                  <Typography variant="body1" className={styles.infoValue}>
                    {formatMemberSince(user.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Additional User Role Info */}
            <Grid item xs={12} md={6}>
              <Box className={styles.infoTile}>
                <Box className={`${styles.infoTileIcon} ${styles.tintSecondary}`}>
                  <PersonIcon color="secondary" />
                </Box>
                <Box className={styles.infoTileBody}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    className={styles.infoLabel}
                  >
                    Tipo de Cuenta
                  </Typography>
                  <Typography variant="body1" className={styles.infoValue}>
                    {ROLE_DISPLAY_NAMES[user.role] || user.role}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Account Status */}
            <Grid item xs={12} md={6}>
              <Box className={styles.infoTile}>
                <Box
                  className={`${styles.infoTileIcon} ${
                    user.isActive !== false ? styles.tintSuccess : styles.tintError
                  }`}
                >
                  <BadgeIcon
                    color={user.isActive !== false ? 'success' : 'error'}
                  />
                </Box>
                <Box className={styles.infoTileBody}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    className={styles.infoLabel}
                  >
                    Estado
                  </Typography>
                  <Typography variant="body1" className={styles.infoValue}>
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

export default ProfileInfo;
