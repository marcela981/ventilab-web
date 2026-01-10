/**
 * =============================================================================
 * DecisionPoint Component
 * =============================================================================
 * 
 * Componente interactivo para renderizar decisiones clínicas con feedback
 * inmediato. Soporta decisiones de selección única (single) y múltiple (multi),
 * con evaluación automática y retroalimentación formativa.
 * 
 * @component
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Alert,
  Button,
  Chip,
  Divider,
  Collapse,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

// =============================================================================
// Strings for i18n (centralized for future translation)
// =============================================================================
const strings = {
  expertOption: 'Opción experta',
  confirm: 'Confirmar respuesta',
  edit: 'Editar respuesta',
  feedback: {
    excellent: '¡Excelente! Has seleccionado la(s) opción(es) del experto.',
    suboptimal: 'Opción subóptima. Revisa la retroalimentación para entender por qué.',
    risky: 'Esta opción es riesgosa o incorrecta. Revisa los conceptos antes de continuar.',
    registered: 'Respuesta registrada.',
    score: (current, max) => `Puntaje: ${current.toFixed(1)} / ${max.toFixed(1)}`,
  },
  aria: {
    decision: (prompt) => `Decisión: ${prompt}`,
    confirm: 'Confirmar respuesta',
    edit: 'Editar respuesta',
    feedback: 'Retroalimentación de la decisión',
  },
};

// =============================================================================
// Main Component
// =============================================================================

const DecisionPoint = ({ decision, onAnswer, isAnswered, isCaseFinalized = false, initialSelectedIds = [] }) => {
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
  const [hasAnswered, setHasAnswered] = useState(isAnswered);
  const [hasEdited, setHasEdited] = useState(false);
  const [showRationales, setShowRationales] = useState(isAnswered);
  const [previousScore, setPreviousScore] = useState(0);

  const isMulti = decision.type === 'multi';

  // Calcular puntaje de la selección actual
  const calculateScore = useCallback((optionIds) => {
    if (!optionIds || optionIds.length === 0) return 0;
    
    return optionIds.reduce((sum, optionId) => {
      return sum + (decision.weights?.[optionId] || 0);
    }, 0);
  }, [decision.weights]);

  // Inicializar puntaje previo si hay respuestas previas
  useEffect(() => {
    if (isAnswered && initialSelectedIds.length > 0) {
      const initialScore = calculateScore(initialSelectedIds);
      setPreviousScore(initialScore);
    }
  }, [isAnswered, initialSelectedIds, calculateScore]);

  // Obtener IDs de opciones expertas
  const expertOptionIds = useMemo(() => {
    return decision.options
      .filter(opt => opt.isExpertChoice)
      .map(opt => opt.id);
  }, [decision.options]);

  // Calcular puntaje máximo posible
  const maxPossibleScore = useMemo(() => {
    if (isMulti) {
      // Para multi, el máximo es la suma de todas las opciones expertas
      return expertOptionIds.reduce((sum, optId) => {
        return sum + (decision.weights?.[optId] || 0);
      }, 0);
    } else {
      // Para single, el máximo es el peso de la mejor opción
      const weights = Object.values(decision.weights || {});
      return weights.length > 0 ? Math.max(...weights) : 0;
    }
  }, [isMulti, expertOptionIds, decision.weights]);

  // Determinar si la selección coincide 100% con el experto
  const isPerfectMatch = useMemo(() => {
    if (selectedIds.length === 0) return false;
    
    if (isMulti) {
      // Para multi, debe tener exactamente las mismas opciones expertas
      if (selectedIds.length !== expertOptionIds.length) return false;
      return expertOptionIds.every(id => selectedIds.includes(id)) &&
             selectedIds.every(id => expertOptionIds.includes(id));
    } else {
      // Para single, debe ser una opción experta
      return expertOptionIds.includes(selectedIds[0]);
    }
  }, [selectedIds, expertOptionIds, isMulti]);

  // Calcular puntaje actual
  const currentScore = useMemo(() => {
    return calculateScore(selectedIds);
  }, [selectedIds, calculateScore]);

  // Determinar severidad del feedback
  const getFeedbackSeverity = useCallback(() => {
    if (currentScore === 0) return 'error';
    if (isPerfectMatch) return 'success';
    if (currentScore > 0 && currentScore < maxPossibleScore) return 'warning';
    return 'info';
  }, [currentScore, isPerfectMatch, maxPossibleScore]);

  // Obtener mensaje de feedback
  const getFeedbackMessage = useCallback(() => {
    const severity = getFeedbackSeverity();
    
    if (severity === 'success') {
      return strings.feedback.excellent;
    } else if (severity === 'warning') {
      return strings.feedback.suboptimal;
    } else if (severity === 'error') {
      return strings.feedback.risky;
    }
    return strings.feedback.registered;
  }, [getFeedbackSeverity]);

  // Manejar cambio de selección
  const handleSelectionChange = useCallback((optionId, checked) => {
    if (hasAnswered && !hasEdited) return; // Bloquear si ya respondió y no ha editado

    if (isMulti) {
      setSelectedIds((prev) => {
        if (checked) {
          return [...prev, optionId];
        } else {
          return prev.filter(id => id !== optionId);
        }
      });
    } else {
      setSelectedIds([optionId]);
    }
  }, [isMulti, hasAnswered, hasEdited]);

  // Confirmar respuesta
  const handleConfirm = useCallback(() => {
    if (selectedIds.length === 0) return;

    const score = calculateScore(selectedIds);
    const scoreDelta = score - previousScore;

    // Crear rationaleMap
    const rationaleMap = {};
    decision.options.forEach(opt => {
      if (selectedIds.includes(opt.id)) {
        rationaleMap[opt.id] = opt.rationale;
      }
    });

    // Crear breakdownItem
    const breakdownItem = {
      decisionId: decision.id,
      domain: decision.domain || 'general',
      selected: [...selectedIds],
      expert: [...expertOptionIds],
      rationaleMap,
    };

    // Disparar callback
    if (onAnswer) {
      onAnswer(decision.id, selectedIds, scoreDelta, breakdownItem);
    }

    setPreviousScore(score);
    setHasAnswered(true);
    setShowRationales(true);
  }, [selectedIds, decision, calculateScore, previousScore, expertOptionIds, onAnswer]);

  // Permitir editar respuesta
  const handleEdit = useCallback(() => {
    if (isCaseFinalized) return; // No permitir editar si el caso está finalizado
    if (hasEdited) return; // Solo permitir una edición

    setHasAnswered(false);
    setHasEdited(true);
    setShowRationales(false);
  }, [isCaseFinalized, hasEdited]);

  // Verificar si hay selección válida
  const hasValidSelection = selectedIds.length > 0;

  // Verificar si puede confirmar
  const canConfirm = hasValidSelection && (!hasAnswered || hasEdited);

  return (
    <Card
      sx={{
        mb: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: hasAnswered ? 'rgba(25, 118, 210, 0.03)' : 'transparent',
        transition: 'all 0.3s ease',
      }}
      role="region"
      aria-label={strings.aria.decision(decision.prompt)}
      tabIndex={0}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {decision.prompt}
          </Typography>
          {decision.domain && (
            <Chip
              label={decision.domain}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Decision Options */}
        {isMulti ? (
          <FormGroup>
            {decision.options.map((option) => {
              const isSelected = selectedIds.includes(option.id);
              const isExpert = option.isExpertChoice;
              const showRationale = hasAnswered && showRationales && isSelected;

              return (
                <Box key={option.id} sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleSelectionChange(option.id, e.target.checked)}
                          disabled={hasAnswered && !hasEdited}
                          color="primary"
                          aria-describedby={showRationale ? `rationale-${option.id}` : undefined}
                        />
                      }
                    label={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body1"
                            fontWeight={isSelected ? 600 : 400}
                            sx={{
                              color: isSelected ? 'primary.main' : 'text.primary',
                            }}
                          >
                            {option.label}
                          </Typography>
                          {isExpert && (
                            <Chip
                              label={strings.expertOption}
                              size="small"
                              color="success"
                              icon={<CheckCircleIcon />}
                              aria-label={`${strings.expertOption}: ${option.label}`}
                            />
                          )}
                        </Box>
                        {showRationale && (
                          <Collapse in={showRationales}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                mt: 1,
                                pl: 4,
                                fontStyle: 'italic',
                              }}
                              id={`rationale-${option.id}`}
                            >
                              {option.rationale}
                            </Typography>
                          </Collapse>
                        )}
                      </Box>
                    }
                    sx={{
                      mb: 1,
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: isSelected
                        ? 'rgba(25, 118, 210, 0.08)'
                        : 'transparent',
                      border: isSelected
                        ? '1px solid rgba(25, 118, 210, 0.3)'
                        : '1px solid transparent',
                      transition: 'all 0.2s',
                      opacity: hasAnswered && !hasEdited && !isSelected ? 0.6 : 1,
                    }}
                  />
                </Box>
              );
            })}
          </FormGroup>
        ) : (
          <FormControl component="fieldset" fullWidth disabled={hasAnswered && !hasEdited}>
            <RadioGroup
              value={selectedIds[0] || ''}
              onChange={(e) => handleSelectionChange(e.target.value, true)}
            >
              {decision.options.map((option) => {
                const isSelected = selectedIds.includes(option.id);
                const isExpert = option.isExpertChoice;
                const showRationale = hasAnswered && showRationales && isSelected;

                return (
                  <Box key={option.id} sx={{ mb: 2 }}>
                    <FormControlLabel
                      value={option.id}
                      control={
                        <Radio
                          color="primary"
                          aria-describedby={showRationale ? `rationale-${option.id}` : undefined}
                        />
                      }
                      label={
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="body1"
                              fontWeight={isSelected ? 600 : 400}
                              sx={{
                                color: isSelected ? 'primary.main' : 'text.primary',
                              }}
                            >
                              {option.label}
                            </Typography>
                            {isExpert && (
                              <Chip
                                label="Opción experta"
                                size="small"
                                color="success"
                                icon={<CheckCircleIcon />}
                              />
                            )}
                          </Box>
                          {showRationale && (
                            <Collapse in={showRationales}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: 'block',
                                  mt: 1,
                                  pl: 4,
                                  fontStyle: 'italic',
                                }}
                              >
                                {option.rationale}
                              </Typography>
                            </Collapse>
                          )}
                        </Box>
                      }
                      sx={{
                        mb: 1,
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: isSelected
                          ? 'rgba(25, 118, 210, 0.08)'
                          : 'transparent',
                        border: isSelected
                          ? '1px solid rgba(25, 118, 210, 0.3)'
                          : '1px solid transparent',
                        transition: 'all 0.2s',
                        opacity: hasAnswered && !hasEdited && !isSelected ? 0.6 : 1,
                      }}
                    />
                  </Box>
                );
              })}
            </RadioGroup>
          </FormControl>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3, alignItems: 'center' }}>
          {!hasAnswered || hasEdited ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleConfirm}
              disabled={!canConfirm}
              aria-label={strings.aria.confirm}
              tabIndex={canConfirm ? 0 : -1}
            >
              {strings.confirm}
            </Button>
          ) : (
            <>
              {!isCaseFinalized && !hasEdited && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  aria-label={strings.aria.edit}
                  tabIndex={0}
                >
                  {strings.edit}
                </Button>
              )}
            </>
          )}
        </Box>

        {/* Feedback Alert */}
        {hasAnswered && (
          <Alert
            severity={getFeedbackSeverity()}
            icon={
              getFeedbackSeverity() === 'success' ? (
                <CheckCircleIcon />
              ) : getFeedbackSeverity() === 'error' ? (
                <ErrorIcon />
              ) : (
                <WarningIcon />
              )
            }
            sx={{ mt: 3 }}
            role="alert"
            aria-live="polite"
            aria-label={strings.aria.feedback}
            id={`feedback-${decision.id}`}
          >
            <Typography variant="body2" fontWeight={600} gutterBottom>
              {getFeedbackMessage()}
            </Typography>
            {decision.feedback && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {decision.feedback}
              </Typography>
            )}
            {!isPerfectMatch && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {strings.feedback.score(currentScore, maxPossibleScore)}
              </Typography>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

DecisionPoint.propTypes = {
  /**
   * Objeto de decisión con estructura:
   * {
   *   id: string,
   *   type: 'single' | 'multi',
   *   prompt: string,
   *   domain: string,
   *   options: Array<{ id, label, rationale, isExpertChoice }>,
   *   weights: Object<optionId: number>,
   *   feedback: string (opcional)
   * }
   */
  decision: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['single', 'multi']).isRequired,
    prompt: PropTypes.string.isRequired,
    domain: PropTypes.string,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        rationale: PropTypes.string.isRequired,
        isExpertChoice: PropTypes.bool,
      })
    ).isRequired,
    weights: PropTypes.objectOf(PropTypes.number).isRequired,
    feedback: PropTypes.string,
  }).isRequired,

  /**
   * Callback ejecutado al confirmar respuesta
   * @param {string} decisionId - ID de la decisión
   * @param {Array<string>} selectedIds - IDs de opciones seleccionadas
   * @param {number} scoreDelta - Cambio en el puntaje
   * @param {Object} breakdownItem - Objeto con análisis de la respuesta
   */
  onAnswer: PropTypes.func.isRequired,

  /**
   * Indica si la decisión ya fue respondida
   */
  isAnswered: PropTypes.bool,

  /**
   * Indica si el caso clínico ha sido finalizado
   */
  isCaseFinalized: PropTypes.bool,

  /**
   * IDs de opciones previamente seleccionadas (para inicialización)
   */
  initialSelectedIds: PropTypes.arrayOf(PropTypes.string),
};

DecisionPoint.defaultProps = {
  isAnswered: false,
  isCaseFinalized: false,
  initialSelectedIds: [],
};

export default DecisionPoint;

