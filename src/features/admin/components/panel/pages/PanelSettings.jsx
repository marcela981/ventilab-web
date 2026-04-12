/**
 * =============================================================================
 * PanelSettings - System Settings Page
 * =============================================================================
 * Page for configuring system settings and preferences.
 * Placeholder to be extended with configuration options.
 *
 * Accessible to: admin, superuser ONLY
 * Note: Teachers do not have access to this page.
 * =============================================================================
 */

import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemIcon, ListItemText, Switch, Divider } from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { isAdminOrAbove } from '@/lib/roles';

/**
 * Placeholder setting item component
 */
function SettingItem({ icon, primary, secondary, disabled = true }) {
  return (
    <ListItem>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={primary} secondary={secondary} />
      <Switch disabled={disabled} />
    </ListItem>
  );
}

/**
 * PanelSettings Component
 *
 * System configuration interface for administrators.
 * Only accessible to admin and superuser roles.
 */
export default function PanelSettings() {
  const { role } = useAuth();

  // Double-check role access (route guard should handle this, but extra safety)
  if (!isAdminOrAbove(role)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          Acceso Denegado
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No tienes permisos para acceder a esta sección.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Configuración del Sistema
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ajusta las preferencias y configuraciones de la plataforma.
        </Typography>
      </Box>

      {/* Settings Sections */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Configuración General
          </Typography>
        </Box>
        <Divider />
        <List>
          <SettingItem
            icon={<NotificationsIcon color="primary" />}
            primary="Notificaciones por correo"
            secondary="Enviar notificaciones de progreso a estudiantes"
          />
          <Divider variant="inset" component="li" />
          <SettingItem
            icon={<PaletteIcon color="secondary" />}
            primary="Modo oscuro por defecto"
            secondary="Activar tema oscuro para nuevos usuarios"
          />
        </List>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Seguridad y Acceso
          </Typography>
        </Box>
        <Divider />
        <List>
          <SettingItem
            icon={<SecurityIcon color="warning" />}
            primary="Autenticación de dos factores"
            secondary="Requerir 2FA para administradores"
          />
          <Divider variant="inset" component="li" />
          <SettingItem
            icon={<StorageIcon color="info" />}
            primary="Logs de auditoría"
            secondary="Registrar todas las acciones administrativas"
          />
        </List>
      </Paper>

      {/* Placeholder Info */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <SettingsIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Configuración en construcción
        </Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={400} mx="auto">
          Estas opciones son placeholders. La funcionalidad completa de
          configuración será implementada próximamente.
        </Typography>
      </Paper>
    </Box>
  );
}
