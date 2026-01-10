/**
 * =============================================================================
 * InteractiveChecklist Component for VentyLab
 * =============================================================================
 * 
 * A React component that renders interactive, checkable checklists for clinical
 * protocols. Supports item completion tracking, progress calculation, localStorage
 * persistence, and visual feedback.
 * 
 * Features:
 * - Interactive checkboxes for each checklist item
 * - Progress bar showing completion percentage
 * - Visual indicators for item criticality (critical, important, standard)
 * - Optional items marked clearly
 * - Completion celebration with callback
 * - State persistence in localStorage
 * - Reset functionality with confirmation
 * - Responsive design for mobile and desktop
 * - Accessibility features (ARIA labels, keyboard navigation)
 * - Smooth animations for state changes
 * 
 * @component
 * @example
 * ```jsx
 * <InteractiveChecklist
 *   checklistData={{
 *     id: 'initial-setup',
 *     title: 'Configuración Inicial del Ventilador',
 *     description: 'Verificar todos los pasos antes de conectar al paciente',
 *     category: 'configuración-inicial',
 *     items: [
 *       {
 *         id: 'item-1',
 *         text: 'Verificar calibración del ventilador',
 *         optional: false,
 *         criticality: 'critical'
 *       },
 *       {
 *         id: 'item-2',
 *         text: 'Revisar circuitos y conexiones',
 *         optional: false,
 *         criticality: 'important'
 *       }
 *     ]
 *   }}
 *   onComplete={(data) => console.log('Checklist completed!', data)}
 *   showProgress={true}
 *   allowReset={true}
 *   persistState={true}
 *   storageKey="checklist-initial-setup"
 * />
 * ```
 * 
 * @param {Object} props - Component props
 * @param {Object} props.checklistData - The checklist data object
 * @param {string} props.checklistData.id - Unique identifier for the checklist
 * @param {string} props.checklistData.title - Title of the checklist
 * @param {string} [props.checklistData.description] - Optional description text
 * @param {string} props.checklistData.category - Category (pre-intubación, configuración-inicial, etc.)
 * @param {Array} props.checklistData.items - Array of checklist items
 * @param {string} props.checklistData.items[].id - Unique ID for the item
 * @param {string} props.checklistData.items[].text - Text to display for the item
 * @param {boolean} [props.checklistData.items[].optional] - Whether item is optional (default: false)
 * @param {string} [props.checklistData.items[].criticality] - Criticality level: 'critical', 'important', or 'standard'
 * @param {Function} [props.onComplete] - Callback when all mandatory items are completed
 * @param {boolean} [props.showProgress] - Whether to show progress bar (default: true)
 * @param {boolean} [props.allowReset] - Whether to show reset button (default: true)
 * @param {boolean} [props.persistState] - Whether to persist state in localStorage (default: false)
 * @param {string} [props.storageKey] - Key for localStorage if persistState is true
 */

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Chip,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useTheme,
  useMediaQuery,
  Fade,
  Grow,
  alpha,
  styled,
} from '@mui/material';
import {
  ChecklistRtl as ChecklistIcon,
  CheckCircle as CheckCircleIcon,
  RestartAlt as RestartIcon,
} from '@mui/icons-material';
import useChecklistState from '../../../../hooks/useChecklistState';

/**
 * ChecklistContainer - Main container with styling
 */
const ChecklistContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  transition: 'all 0.3s ease',
}));

/**
 * ChecklistHeader - Header section with title and icon
 */
const ChecklistHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

/**
 * ItemText - Styled text for checklist items
 */
const ItemText = styled(ListItemText, {
  shouldForwardProp: (prop) => prop !== 'criticality' && prop !== 'isCompleted',
})(({ theme, criticality, isCompleted }) => {
  let color = theme.palette.text.primary;
  
  if (isCompleted) {
    color = theme.palette.text.secondary;
  } else {
    switch (criticality) {
      case 'critical':
        color = theme.palette.error.main;
        break;
      case 'important':
        color = theme.palette.warning.main;
        break;
      case 'standard':
      default:
        color = theme.palette.text.primary;
        break;
    }
  }
  
  return {
    '& .MuiListItemText-primary': {
      color,
      textDecoration: isCompleted ? 'line-through' : 'none',
      transition: 'all 0.3s ease',
    },
  };
});

/**
 * StyledListItem - List item with responsive padding
 */
const StyledListItem = styled(ListItem)(({ theme, isMobile }) => ({
  padding: isMobile ? theme.spacing(2, 1) : theme.spacing(1.5, 1),
  borderRadius: theme.shape.borderRadius,
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}));

/**
 * ProgressContainer - Container for progress bar
 */
const ProgressContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  marginTop: theme.spacing(2),
}));

/**
 * CompletionAlert - Alert shown when checklist is completed
 */
const CompletionAlert = styled(Alert)(({ theme }) => ({
  marginTop: theme.spacing(2),
  animation: 'slideIn 0.5s ease-out',
  '@keyframes slideIn': {
    from: {
      opacity: 0,
      transform: 'translateY(-20px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
}));

/**
 * InteractiveChecklist Component
 */
const InteractiveChecklist = ({
  checklistData,
  onComplete,
  showProgress = true,
  allowReset = true,
  persistState = false,
  storageKey = null,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Validation
  if (!checklistData || !checklistData.items || !Array.isArray(checklistData.items)) {
    console.error('InteractiveChecklist: Invalid checklistData provided');
    return null;
  }
  
  // Use checklist state hook
  const {
    itemStates,
    progress,
    allMandatoryComplete,
    toggleItem,
    resetChecklist,
    isItemCompleted,
  } = useChecklistState({
    checklistData,
    persistState,
    storageKey: storageKey || `checklist-${checklistData.id}`,
  });
  
  // State for reset confirmation dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  // State for completion alert
  const [showCompletionAlert, setShowCompletionAlert] = useState(false);
  
  // Track completion time
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);
  
  // Check for completion and trigger callback
  useEffect(() => {
    if (allMandatoryComplete && !completedRef.current) {
      completedRef.current = true;
      const completionTime = Math.round((Date.now() - startTimeRef.current) / 1000); // seconds
      
      setShowCompletionAlert(true);
      
      if (onComplete && typeof onComplete === 'function') {
        onComplete({
          checklistId: checklistData.id,
          checklistTitle: checklistData.title,
          completionTime,
          completedItems: Object.keys(itemStates).filter(id => itemStates[id]),
          totalItems: checklistData.items.length,
          mandatoryItems: checklistData.items.filter(item => !item.optional).length,
        });
      }
    } else if (!allMandatoryComplete && completedRef.current) {
      // Reset completion flag if user unchecks items
      completedRef.current = false;
      setShowCompletionAlert(false);
    }
  }, [allMandatoryComplete, checklistData, itemStates, onComplete]);
  
  /**
   * Handle reset button click
   */
  const handleResetClick = () => {
    setResetDialogOpen(true);
  };
  
  /**
   * Handle reset confirmation
   */
  const handleResetConfirm = () => {
    resetChecklist();
    setResetDialogOpen(false);
    setShowCompletionAlert(false);
    completedRef.current = false;
    startTimeRef.current = Date.now();
  };
  
  /**
   * Handle reset cancel
   */
  const handleResetCancel = () => {
    setResetDialogOpen(false);
  };
  
  /**
   * Get criticality color
   */
  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'critical':
        return theme.palette.error.main;
      case 'important':
        return theme.palette.warning.main;
      case 'standard':
      default:
        return theme.palette.text.secondary;
    }
  };
  
  return (
    <ChecklistContainer>
      {/* Header */}
      <ChecklistHeader>
        <ChecklistIcon color="primary" sx={{ fontSize: 28, mt: 0.5 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant={isMobile ? 'h6' : 'h5'} component="h3" gutterBottom>
            {checklistData.title}
          </Typography>
          {checklistData.description && (
            <Typography variant="body2" color="text.secondary">
              {checklistData.description}
            </Typography>
          )}
        </Box>
      </ChecklistHeader>
      
      {/* Progress Bar */}
      {showProgress && (
        <ProgressContainer>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progreso
            </Typography>
            <Typography variant="body2" color="primary" fontWeight="medium">
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              },
            }}
          />
        </ProgressContainer>
      )}
      
      {/* Checklist Items */}
      <List sx={{ width: '100%' }}>
        {checklistData.items.map((item, index) => {
          const isCompleted = isItemCompleted(item.id);
          
          return (
            <Fade in={true} timeout={300} key={item.id}>
              <StyledListItem
                isMobile={isMobile}
                disablePadding
                sx={{ mb: 1 }}
              >
                <Checkbox
                  checked={isCompleted}
                  onChange={() => toggleItem(item.id)}
                  inputProps={{
                    'aria-label': `Marcar como ${isCompleted ? 'incompleto' : 'completo'}: ${item.text}`,
                    role: 'checkbox',
                    'aria-checked': isCompleted,
                  }}
                  sx={{
                    color: getCriticalityColor(item.criticality),
                    '&.Mui-checked': {
                      color: theme.palette.success.main,
                    },
                  }}
                />
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ItemText
                    primary={item.text}
                    criticality={item.criticality || 'standard'}
                    isCompleted={isCompleted}
                  />
                  {item.optional && (
                    <Chip
                      label="Opcional"
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        borderColor: theme.palette.text.secondary,
                        color: theme.palette.text.secondary,
                      }}
                    />
                  )}
                  {item.criticality === 'critical' && !item.optional && (
                    <Chip
                      label="Crítico"
                      size="small"
                      color="error"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </StyledListItem>
            </Fade>
          );
        })}
      </List>
      
      {/* Completion Alert */}
      {showCompletionAlert && (
        <Grow in={showCompletionAlert}>
          <CompletionAlert
            severity="success"
            icon={<CheckCircleIcon />}
            onClose={() => setShowCompletionAlert(false)}
          >
            <Typography variant="body1" fontWeight="medium">
              ¡Checklist completado!
            </Typography>
            <Typography variant="body2">
              Todos los ítems mandatorios han sido verificados.
            </Typography>
          </CompletionAlert>
        </Grow>
      )}
      
      {/* Reset Button */}
      {allowReset && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RestartIcon />}
            onClick={handleResetClick}
            aria-label="Resetear checklist"
          >
            Resetear Checklist
          </Button>
        </Box>
      )}
      
      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={handleResetCancel}
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
      >
        <DialogTitle id="reset-dialog-title">
          Confirmar Reset
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-dialog-description">
            ¿Está seguro de que desea resetear todo el progreso del checklist?
            Esta acción no se puede deshacer y perderá todo el estado guardado.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetCancel} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleResetConfirm} color="error" variant="contained">
            Resetear
          </Button>
        </DialogActions>
      </Dialog>
    </ChecklistContainer>
  );
};

InteractiveChecklist.propTypes = {
  checklistData: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    category: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired,
        optional: PropTypes.bool,
        criticality: PropTypes.oneOf(['critical', 'important', 'standard']),
      })
    ).isRequired,
  }).isRequired,
  onComplete: PropTypes.func,
  showProgress: PropTypes.bool,
  allowReset: PropTypes.bool,
  persistState: PropTypes.bool,
  storageKey: PropTypes.string,
};

export default InteractiveChecklist;

