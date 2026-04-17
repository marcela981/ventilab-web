import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Button,
  Alert,
  Chip,
  Divider,
  styled,
  alpha,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';

/**
 * QuizContainer - Contenedor principal del quiz con estilos
 */
const QuizContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: theme.shape.borderRadius,
  boxShadow: 'none',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
}));

/**
 * QuestionHeader - Encabezado del quiz con icono
 */
const QuestionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

/**
 * OptionLabel - Label personalizado para opciones
 */
const OptionLabel = styled(FormControlLabel)(({ theme, iscorrect, isselected, showfeedback }) => {
  let backgroundColor = 'transparent';
  let borderColor = theme.palette.divider;

  if (showfeedback === 'true') {
    if (iscorrect === 'true') {
      backgroundColor = alpha(theme.palette.success.main, 0.1);
      borderColor = theme.palette.success.main;
    } else if (isselected === 'true' && iscorrect === 'false') {
      backgroundColor = alpha(theme.palette.error.main, 0.1);
      borderColor = theme.palette.error.main;
    }
  }

  return {
    width: '100%',
    margin: `${theme.spacing(1)} 0`,
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    border: `2px solid ${borderColor}`,
    backgroundColor,
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: showfeedback === 'true' 
        ? backgroundColor 
        : alpha(theme.palette.primary.main, 0.05),
      borderColor: showfeedback === 'true' 
        ? borderColor 
        : theme.palette.primary.main,
    },
  };
});

/**
 * FeedbackContainer - Contenedor para el feedback con animación
 */
const FeedbackContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  animation: 'fadeIn 0.5s ease-in',
  '@keyframes fadeIn': {
    from: {
      opacity: 0,
      transform: 'translateY(-10px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
}));

/**
 * InteractiveQuiz - Componente de quiz interactivo con feedback inmediato
 * para evaluación del aprendizaje en lecciones educativas.
 * 
 * Soporta preguntas de opción única (single-choice) y opción múltiple (multiple-choice),
 * proporcionando feedback instantáneo, explicaciones detalladas y seguimiento de intentos.
 * 
 * @component
 * @example
 * ```jsx
 * // Quiz de opción única
 * const quiz = {
 *   question: "¿Cuál es el rango normal de PEEP en ventilación mecánica?",
 *   options: ["0-2 cmH₂O", "5-10 cmH₂O", "15-20 cmH₂O", "25-30 cmH₂O"],
 *   correctAnswer: "5-10 cmH₂O",
 *   explanation: "El rango normal de PEEP es 5-10 cmH₂O para mantener los alvéolos abiertos...",
 *   type: "single-choice"
 * };
 * 
 * <InteractiveQuiz quiz={quiz} />
 * ```
 * 
 * @example
 * ```jsx
 * // Quiz de opción múltiple
 * const quiz = {
 *   question: "¿Cuáles son complicaciones de la ventilación mecánica?",
 *   options: ["Barotrauma", "Volutrauma", "Hipertensión", "Atelectrauma"],
 *   correctAnswer: ["Barotrauma", "Volutrauma", "Atelectrauma"],
 *   explanation: "El barotrauma, volutrauma y atelectrauma son complicaciones directas...",
 *   type: "multiple-choice"
 * };
 * 
 * <InteractiveQuiz quiz={quiz} />
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.quiz - Objeto con los datos del quiz
 * @param {Function} [props.onComplete] - Callback llamado al completar correctamente
 */
const InteractiveQuiz = ({ quiz, onComplete }) => {
  // Estados
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const isSingleChoice = quiz.type === 'single-choice';
  const isMultipleChoice = quiz.type === 'multiple-choice';

  /**
   * Normaliza la respuesta correcta a array
   * @returns {Array} - Array de respuestas correctas
   */
  const getCorrectAnswersArray = useCallback(() => {
    if (Array.isArray(quiz.correctAnswer)) {
      return quiz.correctAnswer;
    }
    return [quiz.correctAnswer];
  }, [quiz.correctAnswer]);

  /**
   * Verifica si una opción es correcta
   * @param {string} option - Opción a verificar
   * @returns {boolean}
   */
  const isCorrectOption = useCallback((option) => {
    const correctAnswers = getCorrectAnswersArray();
    return correctAnswers.includes(option);
  }, [getCorrectAnswersArray]);

  /**
   * Maneja el cambio de selección en single-choice
   * @param {Object} event - Evento del input
   */
  const handleSingleChoiceChange = useCallback((event) => {
    if (!showFeedback) {
      setSelectedAnswer(event.target.value);
    }
  }, [showFeedback]);

  /**
   * Maneja el cambio de selección en multiple-choice
   * @param {string} option - Opción seleccionada
   */
  const handleMultipleChoiceChange = useCallback((option) => {
    if (showFeedback) return;

    setSelectedAnswers((prev) => {
      if (prev.includes(option)) {
        return prev.filter((ans) => ans !== option);
      }
      return [...prev, option];
    });
  }, [showFeedback]);

  /**
   * Valida la respuesta del usuario
   * @returns {boolean} - True si la respuesta es correcta
   */
  const validateAnswer = useCallback(() => {
    const correctAnswers = getCorrectAnswersArray();

    if (isSingleChoice) {
      return correctAnswers.includes(selectedAnswer);
    }

    if (isMultipleChoice) {
      // Deben tener la misma longitud y los mismos elementos
      if (selectedAnswers.length !== correctAnswers.length) {
        return false;
      }
      return selectedAnswers.every((ans) => correctAnswers.includes(ans));
    }

    return false;
  }, [isSingleChoice, isMultipleChoice, selectedAnswer, selectedAnswers, getCorrectAnswersArray]);

  /**
   * Maneja el envío de la respuesta
   */
  const handleSubmit = useCallback(() => {
    const correct = validateAnswer();
    setIsCorrect(correct);
    setShowFeedback(true);
    setAttempts((prev) => prev + 1);

    if (correct && !isCompleted) {
      setIsCompleted(true);
      if (onComplete && typeof onComplete === 'function') {
        onComplete({
          quiz,
          attempts: attempts + 1,
          correct: true,
        });
      }
    }
  }, [validateAnswer, isCompleted, onComplete, quiz, attempts]);

  /**
   * Reinicia el quiz para un nuevo intento
   */
  const handleRetry = useCallback(() => {
    setSelectedAnswer('');
    setSelectedAnswers([]);
    setShowFeedback(false);
    setIsCorrect(false);
  }, []);

  /**
   * Verifica si el botón de enviar debe estar deshabilitado
   * @returns {boolean}
   */
  const isSubmitDisabled = () => {
    if (showFeedback) return true;
    if (isSingleChoice) return !selectedAnswer;
    if (isMultipleChoice) return selectedAnswers.length === 0;
    return true;
  };

  /**
   * Verifica si una opción está seleccionada
   * @param {string} option - Opción a verificar
   * @returns {boolean}
   */
  const isOptionSelected = (option) => {
    if (isSingleChoice) return selectedAnswer === option;
    if (isMultipleChoice) return selectedAnswers.includes(option);
    return false;
  };

  // Validación básica del quiz
  if (!quiz || !quiz.question || !quiz.options || !Array.isArray(quiz.options)) {
    return (
      <QuizContainer elevation={2}>
        <Alert severity="error">
          Quiz inválido: faltan datos requeridos
        </Alert>
      </QuizContainer>
    );
  }

  return (
    <QuizContainer elevation={2} role="region" aria-label="Quiz interactivo">
      {/* Encabezado con icono y contador de intentos */}
      <QuestionHeader>
        <QuizIcon sx={{ fontSize: 32, mt: 0.5, color: '#e8f4fd' }} />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="h3" sx={{ flex: 1, color: '#ffffff', fontWeight: 600 }}>
              {quiz.question}
            </Typography>
            {attempts > 0 && (
              <Chip
                label={`${attempts} ${attempts === 1 ? 'intento' : 'intentos'}`}
                size="small"
                variant="outlined"
                sx={{ 
                  ml: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#e8f4fd'
                }}
              />
            )}
          </Box>
          <Typography variant="caption" sx={{ color: '#e8f4fd' }}>
            {isMultipleChoice 
              ? 'Selecciona todas las opciones correctas' 
              : 'Selecciona la opción correcta'}
          </Typography>
        </Box>
      </QuestionHeader>

      <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Opciones de respuesta */}
      <Box role="group" aria-label="Opciones de respuesta">
        {isSingleChoice && (
          <RadioGroup
            value={selectedAnswer}
            onChange={handleSingleChoiceChange}
            aria-label={quiz.question}
          >
            {quiz.options.map((option, index) => (
              <OptionLabel
                key={index}
                value={option}
                control={<Radio disabled={showFeedback} />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <Typography variant="body1" sx={{ flex: 1, color: '#ffffff' }}>
                      {option}
                    </Typography>
                    {showFeedback && isCorrectOption(option) && (
                      <CheckCircleIcon color="success" fontSize="small" />
                    )}
                    {showFeedback && isOptionSelected(option) && !isCorrectOption(option) && (
                      <CancelIcon color="error" fontSize="small" />
                    )}
                  </Box>
                }
                iscorrect={isCorrectOption(option).toString()}
                isselected={isOptionSelected(option).toString()}
                showfeedback={showFeedback.toString()}
              />
            ))}
          </RadioGroup>
        )}

        {isMultipleChoice && (
          <Box>
            {quiz.options.map((option, index) => (
              <OptionLabel
                key={index}
                control={
                  <Checkbox
                    checked={selectedAnswers.includes(option)}
                    onChange={() => handleMultipleChoiceChange(option)}
                    disabled={showFeedback}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <Typography variant="body1" sx={{ flex: 1, color: '#ffffff' }}>
                      {option}
                    </Typography>
                    {showFeedback && isCorrectOption(option) && (
                      <CheckCircleIcon color="success" fontSize="small" />
                    )}
                    {showFeedback && isOptionSelected(option) && !isCorrectOption(option) && (
                      <CancelIcon color="error" fontSize="small" />
                    )}
                  </Box>
                }
                iscorrect={isCorrectOption(option).toString()}
                isselected={isOptionSelected(option).toString()}
                showfeedback={showFeedback.toString()}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Botones de acción */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={isSubmitDisabled()}
          fullWidth={!showFeedback}
          size="large"
          aria-label="Verificar respuesta"
        >
          Verificar Respuesta
        </Button>

        {showFeedback && !isCorrect && (
          <Button
            variant="outlined"
            color="primary"
            onClick={handleRetry}
            startIcon={<RefreshIcon />}
            fullWidth
            size="large"
            aria-label="Reintentar"
          >
            Reintentar
          </Button>
        )}
      </Box>

      {/* Feedback */}
      {showFeedback && (
        <FeedbackContainer>
          <Alert
            severity={isCorrect ? 'success' : 'error'}
            icon={isCorrect ? <CheckCircleIcon /> : <CancelIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle2" component="div" gutterBottom>
              {isCorrect ? '¡Correcto! 🎉' : 'Respuesta incorrecta'}
            </Typography>
            <Typography variant="body2">
              {quiz.explanation}
            </Typography>
          </Alert>

          {isCorrect && (
            <Box
              sx={{
                p: 2,
                backgroundColor: 'success.light',
                color: 'success.contrastText',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                {attempts === 1 
                  ? '¡Excelente! Lo lograste en el primer intento.' 
                  : `Lo lograste en ${attempts} intentos.`}
              </Typography>
            </Box>
          )}
        </FeedbackContainer>
      )}
    </QuizContainer>
  );
};

export default InteractiveQuiz;

