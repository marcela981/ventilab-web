import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Link as MuiLink,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  EmojiEvents as TrophyIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Info as InfoIcon,
  NavigateNext as NextIcon
} from '@mui/icons-material';
import useUserProgress from '../../../../hooks/useUserProgress';

/**
 * ReadinessIndicator - Indicador de preparación para evaluaciones
 *
 * Evalúa si el usuario ha completado los requisitos necesarios del Módulo 3
 * para comenzar con evaluaciones prácticas. Muestra:
 * - Estado de cada criterio de preparación
 * - Progreso general hacia la preparación
 * - Links a contenido faltante
 * - Botón para comenzar evaluaciones (o mensaje de "coming soon")
 *
 * @component
 */
const ReadinessIndicator = () => {
  const { getReadinessStatus, getCategoryProgress } = useUserProgress();
  const [dialogOpen, setDialogOpen] = useState(false);

  const readinessStatus = getReadinessStatus();
  const { isReady, criteria, metCount, totalCriteria, readinessPercent } = readinessStatus;

  // Mapeo de criterios a rutas/lecciones recomendadas
  const criteriaLinks = {
    'pathology-protocols': {
      category: 'pathologyProtocols',
      lessons: [
        { id: 'sdra-protocol', title: 'Protocolo SDRA' },
        { id: 'pneumonia-protocol', title: 'Protocolo Neumonía' },
        { id: 'copd-protocol', title: 'Protocolo EPOC' },
        { id: 'asthma-protocol', title: 'Protocolo Asma' }
      ]
    },
    'critical-protocols': {
      category: 'pathologyProtocols',
      lessons: [
        { id: 'sdra-protocol', title: 'Protocolo SDRA (Crítico)' },
        { id: 'pneumonia-protocol', title: 'Protocolo Neumonía (Crítico)' },
        { id: 'copd-protocol', title: 'Protocolo EPOC (Crítico)' },
        { id: 'asthma-protocol', title: 'Protocolo Asma (Crítico)' }
      ]
    },
    'protective-strategies': {
      category: 'protectiveStrategies',
      lessons: [
        { id: 'low-tidal-volume', title: 'Bajo Volumen Tidal' },
        { id: 'permissive-hypercapnia', title: 'Hipercapnia Permisiva' },
        { id: 'peep-strategies', title: 'Estrategias de PEEP' },
        { id: 'lung-protective-ventilation', title: 'Ventilación Protectora' }
      ]
    },
    'troubleshooting-practice': {
      category: 'troubleshooting',
      lessons: [
        { id: 'high-pressure-alarm', title: 'Alarma de Presión Alta' },
        { id: 'low-tidal-volume-alarm', title: 'Alarma de Volumen Bajo' },
        { id: 'patient-ventilator-asynchrony', title: 'Asincronía Paciente-Ventilador' },
        { id: 'hypoxemia-management', title: 'Manejo de Hipoxemia' }
      ]
    }
  };

  // Manejador para abrir el diálogo de "coming soon"
  const handleStartEvaluation = () => {
    setDialogOpen(true);
  };

  // Manejador para cerrar el diálogo
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Renderizar un criterio individual
  const renderCriterion = (criterion) => {
    const criterionLinks = criteriaLinks[criterion.id];

    return (
      <ListItem
        key={criterion.id}
        sx={{
          border: '1px solid',
          borderColor: criterion.met ? 'success.light' : 'grey.300',
          borderRadius: 2,
          mb: 1,
          backgroundColor: criterion.met ? 'success.50' : 'grey.50'
        }}
      >
        <ListItemIcon>
          {criterion.met ? (
            <CheckIcon sx={{ color: 'success.main', fontSize: 28 }} />
          ) : (
            <CancelIcon sx={{ color: 'error.main', fontSize: 28 }} />
          )}
        </ListItemIcon>

        <ListItemText
          primary={
            <Typography variant="body1" fontWeight={criterion.met ? '600' : '500'}>
              {criterion.description}
            </Typography>
          }
          secondary={
            <Box mt={1}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <LinearProgress
                  variant="determinate"
                  value={criterion.progress}
                  sx={{
                    flexGrow: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: criterion.met ? 'success.main' : 'warning.main',
                      borderRadius: 3
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round(criterion.progress)}%
                </Typography>
              </Box>

              {/* Mostrar links a contenido faltante si no está completo */}
              {!criterion.met && criterionLinks && (
                <Box mt={1}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    Para completar este criterio:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {criterionLinks.lessons.map((lesson) => (
                      <Chip
                        key={lesson.id}
                        label={lesson.title}
                        size="small"
                        icon={<SchoolIcon />}
                        clickable
                        component="a"
                        href={`#lesson-${lesson.id}`}
                        sx={{
                          fontSize: '0.7rem',
                          height: '24px',
                          '& .MuiChip-icon': {
                            fontSize: '0.9rem'
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          }
        />
      </ListItem>
    );
  };

  return (
    <>
      <Card
        elevation={3}
        sx={{
          borderTop: isReady ? '4px solid' : '4px solid',
          borderTopColor: isReady ? 'success.main' : 'warning.main'
        }}
      >
        <CardContent>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              {isReady ? (
                <TrophyIcon sx={{ color: 'success.main', fontSize: 32 }} />
              ) : (
                <AssessmentIcon sx={{ color: 'warning.main', fontSize: 32 }} />
              )}
              <Typography variant="h5" fontWeight="700">
                Preparación para Evaluación
              </Typography>
            </Box>

            <Chip
              label={isReady ? 'LISTO' : 'EN PROGRESO'}
              color={isReady ? 'success' : 'warning'}
              sx={{ fontWeight: '700' }}
            />
          </Box>

          {/* Mensaje principal */}
          {isReady ? (
            <Alert severity="success" icon={<TrophyIcon />} sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="600">
                ¡Felicitaciones! Has completado los requisitos necesarios.
              </Typography>
              <Typography variant="body2">
                Estás preparado para comenzar con las evaluaciones prácticas y contrastar tus configuraciones
                con las de expertos en ventilación mecánica.
              </Typography>
            </Alert>
          ) : (
            <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
              <Typography variant="body2">
                Completa al menos 3 de los 4 criterios siguientes para estar preparado para las evaluaciones prácticas.
                Actualmente has completado <strong>{metCount} de {totalCriteria}</strong> criterios.
              </Typography>
            </Alert>
          )}

          {/* Progreso general */}
          <Box mb={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="body2" fontWeight="600" color="text.secondary">
                Progreso de Preparación
              </Typography>
              <Typography variant="body2" fontWeight="700" color="primary">
                {Math.round(readinessPercent)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={readinessPercent}
              sx={{
                height: 12,
                borderRadius: 6,
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: isReady ? 'success.main' : 'primary.main',
                  borderRadius: 6
                }
              }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Lista de criterios */}
          <Typography variant="h6" fontWeight="600" gutterBottom>
            Criterios de Preparación
          </Typography>
          <List sx={{ p: 0 }}>
            {criteria.map(renderCriterion)}
          </List>

          {/* Botón de acción */}
          <Box mt={3} textAlign="center">
            {isReady ? (
              <Button
                variant="contained"
                size="large"
                color="success"
                startIcon={<TrophyIcon />}
                endIcon={<NextIcon />}
                onClick={handleStartEvaluation}
                sx={{
                  py: 1.5,
                  px: 4,
                  fontWeight: '700',
                  fontSize: '1rem'
                }}
              >
                Comenzar Evaluaciones Prácticas
              </Button>
            ) : (
              <Button
                variant="outlined"
                size="large"
                startIcon={<SchoolIcon />}
                disabled
                sx={{ py: 1.5, px: 4 }}
              >
                Completa los criterios para comenzar
              </Button>
            )}
          </Box>

          {/* Información adicional */}
          {!isReady && (
            <Box mt={2} textAlign="center">
              <Typography variant="caption" color="text.secondary">
                Tip: Haz clic en los chips de las lecciones para ir directamente al contenido
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog de "Coming Soon" */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <TrophyIcon color="primary" />
            <Typography variant="h6" fontWeight="700">
              Módulo de Evaluación
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="info">
              El módulo de evaluación práctica está en desarrollo y estará disponible próximamente.
            </Alert>

            <Typography variant="body1">
              Mientras tanto, puedes:
            </Typography>

            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Repasar el contenido del Módulo 3"
                  secondary="Refuerza tu conocimiento revisando las lecciones completadas"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Practicar con los checklists"
                  secondary="Familiarízate con los protocolos clínicos interactivos"
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Explorar otros módulos"
                  secondary="Continúa tu aprendizaje con otros módulos disponibles"
                />
              </ListItem>
            </List>

            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              Te notificaremos cuando el módulo de evaluación esté disponible para que puedas
              poner a prueba tus habilidades y contrastar tus configuraciones con las de expertos.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained">
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReadinessIndicator;
