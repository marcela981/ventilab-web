/**
 * =============================================================================
 * LevelSettings Component for VentyLab
 * =============================================================================
 * Settings page section that allows users to view and manage their learning level.
 *
 * Features:
 * - Display current learning level with badge and progress
 * - Detailed explanations of each level
 * - Level change with confirmation dialog
 * - API integration to update user level
 * - Loading and error states
 * - Responsive design with Material UI Grid
 * =============================================================================
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  School as TestIcon,
  LocalFlorist as BeginnerIcon,
  School as IntermediateIcon,
  EmojiEvents as AdvancedIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/hooks/useAuth';
import { LevelBadge } from '@/shared/components/LevelBadge';

/**
 * Level information and characteristics
 */
const LEVEL_DETAILS = {
  BEGINNER: {
    name: 'Principiante',
    icon: BeginnerIcon,
    color: 'success',
    profile: 'Ideal para estudiantes sin conocimientos previos en ventilación mecánica',
    description:
      'Contenido diseñado para comenzar desde cero, con explicaciones paso a paso y lenguaje accesible.',
    characteristics: [
      'Lenguaje simple y claro, sin jerga médica compleja',
      'Analogías cotidianas para facilitar la comprensión',
      'Explicaciones detalladas de conceptos básicos',
      'Ejemplos clínicos fundamentales',
      'Evaluaciones de conocimientos básicos',
    ],
    recommended:
      'Perfecto si estás iniciando tu formación en cuidados críticos o ventilación mecánica',
  },
  INTERMEDIATE: {
    name: 'Intermedio',
    icon: IntermediateIcon,
    color: 'info',
    profile:
      'Para estudiantes con conocimientos básicos que desean profundizar en aplicaciones clínicas',
    description:
      'Contenido con terminología médica apropiada, casos clínicos reales y análisis de situaciones complejas.',
    characteristics: [
      'Terminología médica y fisiológica correcta',
      'Casos clínicos reales y detallados',
      'Profundización en mecanismos fisiopatológicos',
      'Interpretación de gasometrías y parámetros ventilatorios',
      'Estrategias de manejo clínico',
    ],
    recommended:
      'Ideal si ya comprendes los fundamentos y buscas aplicar conocimientos en contextos clínicos',
  },
  ADVANCED: {
    name: 'Avanzado',
    icon: AdvancedIcon,
    color: 'warning',
    profile:
      'Para profesionales con experiencia que buscan dominar aspectos complejos y manejo experto',
    description:
      'Contenido de nivel experto con evidencia científica, casos complejos y decisiones de alto nivel.',
    characteristics: [
      'Lenguaje técnico y preciso de nivel experto',
      'Referencias a literatura médica actualizada',
      'Casos complejos (SDRA, ventilación no convencional)',
      'Cálculos avanzados (mechanical power, driving pressure)',
      'Optimización ventilatoria guiada por monitoreo avanzado',
    ],
    recommended:
      'Perfecto para médicos especialistas, intensivistas y profesionales con experiencia clínica',
  },
};

/**
 * LevelSettings Component
 *
 * @param {Object} props - Component props
 * @param {Function} props.onLevelChange - Callback after successful level change (optional)
 *
 * @example
 * <LevelSettings onLevelChange={() => console.log('Level changed')} />
 */
export function LevelSettings({ onLevelChange }) {
  const { user, refreshUser } = useAuth();

  // Component state
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const currentLevel = user?.userLevel || user?.level || 'BEGINNER';

  /**
   * Handle level selection
   */
  const handleSelectLevel = (level) => {
    if (level === currentLevel) {
      setSnackbar({
        open: true,
        message: 'Ya estás en este nivel',
        severity: 'info',
      });
      return;
    }

    setSelectedLevel(level);
    setShowConfirmDialog(true);
  };

  /**
   * Close confirmation dialog
   */
  const handleCloseDialog = () => {
    setShowConfirmDialog(false);
    setSelectedLevel(null);
  };

  /**
   * Confirm level change and call API
   */
  const handleConfirmChange = async () => {
    try {
      setIsUpdating(true);
      setShowConfirmDialog(false);

      console.log(`🔄 [LevelSettings] Changing level from ${currentLevel} to ${selectedLevel}`);

      // Call API to update user level
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${user.id}/level`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ level: selectedLevel }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Error al actualizar el nivel');
      }

      console.log(`✅ [LevelSettings] Level updated successfully to ${selectedLevel}`);

      // Refresh user data
      await refreshUser();

      // Show success message
      setSnackbar({
        open: true,
        message: `Nivel cambiado exitosamente a ${LEVEL_DETAILS[selectedLevel].name}`,
        severity: 'success',
      });

      // Execute callback if provided
      if (typeof onLevelChange === 'function') {
        onLevelChange(selectedLevel);
      }
    } catch (error) {
      console.error('❌ [LevelSettings] Error updating level:', error);

      // Show error message
      setSnackbar({
        open: true,
        message: error.message || 'Error al actualizar el nivel. Por favor, intenta nuevamente.',
        severity: 'error',
      });
    } finally {
      setIsUpdating(false);
      setSelectedLevel(null);
    }
  };

  /**
   * Show level assessment test dialog
   */
  const handleShowTest = () => {
    setShowTestDialog(true);
  };

  /**
   * Close test dialog
   */
  const handleCloseTest = () => {
    setShowTestDialog(false);
  };

  /**
   * Close snackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  /**
   * Get warning message based on level change direction
   */
  const getWarningMessage = () => {
    if (!selectedLevel) return '';

    const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    const currentIndex = levels.indexOf(currentLevel);
    const selectedIndex = levels.indexOf(selectedLevel);

    if (selectedIndex > currentIndex) {
      return (
        'Estás seleccionando un nivel más alto. Asegúrate de tener los conocimientos necesarios ' +
        'para aprovechar el contenido avanzado.'
      );
    } else {
      return (
        'Estás seleccionando un nivel más bajo. Esto puede ser útil para repasar conceptos ' +
        'fundamentales, pero el contenido será más básico.'
      );
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Nivel de Aprendizaje
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tu nivel determina la complejidad del contenido que recibes. Elige el nivel que mejor se
          adapte a tus conocimientos actuales.
        </Typography>
      </Box>

      {/* Current Level Display */}
      <Card sx={{ mb: 4, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Nivel Actual
            </Typography>
            <LevelBadge
              level={currentLevel}
              size="large"
              showProgressBar={true}
              progressToNextLevel={65}  // TODO: Get real progress from API
            />
          </Box>

          <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 2 }}>
            <Typography variant="body2">
              Tu progreso hacia el siguiente nivel se calcula automáticamente basándose en tus
              calificaciones en quizzes, módulos completados y consistencia de desempeño.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Level Options */}
      <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 2 }}>
        Opciones de Nivel
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.entries(LEVEL_DETAILS).map(([levelKey, levelInfo]) => {
          const IconComponent = levelInfo.icon;
          const isCurrentLevel = levelKey === currentLevel;

          return (
            <Grid item xs={12} md={4} key={levelKey}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  border: isCurrentLevel ? 2 : 1,
                  borderColor: isCurrentLevel ? `${levelInfo.color}.main` : 'divider',
                  position: 'relative',
                }}
              >
                {isCurrentLevel && (
                  <Chip
                    label="Nivel Actual"
                    color={levelInfo.color}
                    size="small"
                    icon={<CheckIcon />}
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      fontWeight: 600,
                    }}
                  />
                )}

                <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <IconComponent color={levelInfo.color} sx={{ fontSize: 32 }} />
                    <Typography variant="h6" fontWeight={600}>
                      {levelInfo.name}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {levelInfo.profile}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Características:
                  </Typography>

                  <List dense disablePadding>
                    {levelInfo.characteristics.slice(0, 3).map((char, index) => (
                      <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckIcon color={levelInfo.color} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={char}
                          primaryTypographyProps={{
                            variant: 'body2',
                            color: 'text.secondary',
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant={isCurrentLevel ? 'outlined' : 'contained'}
                    color={levelInfo.color}
                    disabled={isCurrentLevel || isUpdating}
                    onClick={() => handleSelectLevel(levelKey)}
                  >
                    {isCurrentLevel ? 'Nivel Actual' : 'Seleccionar este nivel'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Level Assessment Test (Optional) */}
      <Card sx={{ borderRadius: 2, bgcolor: 'primary.lighter' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TestIcon color="primary" sx={{ fontSize: 40 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                ¿No estás seguro de tu nivel?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Realiza nuestro test de nivelación para recibir una recomendación personalizada
                basada en tus conocimientos actuales.
              </Typography>
            </Box>
            <Button variant="contained" color="primary" onClick={handleShowTest}>
              Realizar Test
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          ¿Confirmar cambio de nivel?
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
            {getWarningMessage()}
          </Alert>

          <DialogContentText>
            Estás a punto de cambiar tu nivel de{' '}
            <strong>{LEVEL_DETAILS[currentLevel]?.name}</strong> a{' '}
            <strong>{LEVEL_DETAILS[selectedLevel]?.name}</strong>.
          </DialogContentText>

          <DialogContentText sx={{ mt: 2 }}>
            El contenido educativo que recibas se adaptará inmediatamente a tu nuevo nivel.
            Puedes cambiar tu nivel en cualquier momento si es necesario.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmChange}
            variant="contained"
            color="primary"
            disabled={isUpdating}
            startIcon={isUpdating && <CircularProgress size={16} />}
          >
            {isUpdating ? 'Actualizando...' : 'Confirmar Cambio'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Dialog (Coming Soon) */}
      <Dialog
        open={showTestDialog}
        onClose={handleCloseTest}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Test de Nivelación
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="body2">
              Esta funcionalidad estará disponible próximamente. El test de nivelación evaluará
              tus conocimientos en fisiología respiratoria, mecánica ventilatoria y aplicaciones
              clínicas para recomendarte el nivel más apropiado.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTest} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

LevelSettings.propTypes = {
  onLevelChange: PropTypes.func,
};

LevelSettings.defaultProps = {
  onLevelChange: null,
};

export default LevelSettings;
