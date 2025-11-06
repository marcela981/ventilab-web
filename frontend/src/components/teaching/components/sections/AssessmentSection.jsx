import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';

/**
 * AssessmentSection - Componente para renderizar la autoevaluación
 */
const AssessmentSection = ({
  questions,
  assessmentAnswers,
  showAssessmentResults,
  assessmentScore,
  onAnswerChange,
  onSubmit,
  onReset,
  onCloseResults,
}) => {
  if (!questions || questions.length === 0) return null;
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Autoevaluación
      </Typography>
      
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
        {questions.map((question, index) => {
          const questionId = question.questionId || `q-${index}`;
          const userAnswer = assessmentAnswers[questionId];
          
          return (
            <Box key={index} sx={{ mb: 4, pb: 3, borderBottom: index < questions.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                {index + 1}. {question.questionText}
              </Typography>
              
              {question.type === 'multipleChoice' && question.options && (
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <RadioGroup
                    value={userAnswer || ''}
                    onChange={(e) => onAnswerChange(questionId, e.target.value)}
                  >
                    {question.options.map((option, optIndex) => (
                      <FormControlLabel
                        key={optIndex}
                        value={String(optIndex)}
                        control={<Radio />}
                        label={option}
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              )}
              
              {question.type === 'trueFalse' && (
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <RadioGroup
                    value={userAnswer || ''}
                    onChange={(e) => onAnswerChange(questionId, e.target.value)}
                  >
                    <FormControlLabel value="true" control={<Radio />} label="Verdadero" />
                    <FormControlLabel value="false" control={<Radio />} label="Falso" />
                  </RadioGroup>
                </FormControl>
              )}
              
              {question.type === 'shortAnswer' && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={userAnswer || ''}
                  onChange={(e) => onAnswerChange(questionId, e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                />
              )}
              
              {showAssessmentResults && (
                <Box sx={{ mt: 2 }}>
                  {String(userAnswer) === String(question.correctAnswer) ? (
                    <Alert severity="success" sx={{ mb: 1 }}>
                      ¡Correcto!
                    </Alert>
                  ) : (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      Incorrecto. La respuesta correcta es: {question.options ? question.options[question.correctAnswer] : question.correctAnswer}
                    </Alert>
                  )}
                  {question.explanation && (
                    <Paper sx={{ p: 2, backgroundColor: 'info.light', mt: 1 }}>
                      <Typography variant="body2">
                        <strong>Explicación:</strong> {question.explanation}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={onReset}
          >
            Reiniciar
          </Button>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={Object.keys(assessmentAnswers).length === 0}
          >
            Enviar Respuestas
          </Button>
        </Box>
        
        {assessmentScore && (
          <Dialog open={showAssessmentResults} onClose={onCloseResults}>
            <DialogTitle>Resultados de la Autoevaluación</DialogTitle>
            <DialogContent>
              <Typography variant="h4" align="center" gutterBottom>
                {assessmentScore.correct} / {assessmentScore.total}
              </Typography>
              <Typography variant="h6" align="center" color="text.secondary" gutterBottom>
                {assessmentScore.percentage}% Correcto
              </Typography>
              <Typography variant="body1" sx={{ mt: 2 }}>
                {assessmentScore.percentage >= 80
                  ? '¡Excelente trabajo! Has demostrado un buen entendimiento del contenido.'
                  : assessmentScore.percentage >= 60
                  ? 'Buen intento. Te recomendamos revisar los puntos en los que tuviste dificultades.'
                  : 'Te recomendamos revisar el contenido de la lección antes de continuar.'}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={onCloseResults}>Cerrar</Button>
            </DialogActions>
          </Dialog>
        )}
      </Paper>
    </Box>
  );
};

export default AssessmentSection;

