import React from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * PracticalCaseSection - Componente para renderizar un caso práctico
 */
const PracticalCaseSection = ({
  practicalCase,
  caseIndex,
  caseAnswers,
  showAnswers,
  onAnswerChange,
  onToggleAnswers,
}) => {
  const theme = useTheme();
  const caseId = practicalCase.caseId || `case-${caseIndex}`;
  
  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        minHeight: '60vh',
      }}
    >
      <Typography 
        variant="h4" 
        component="h2" 
        gutterBottom 
        sx={{ 
          fontWeight: 600, 
          mb: 3,
          color: theme.palette.secondary.main,
          pb: 2,
          borderBottom: `3px solid ${theme.palette.secondary.main}`,
        }}
      >
        {practicalCase.title || `Caso Clínico ${caseIndex + 1}`}
      </Typography>
      
      {practicalCase.patientData && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Datos del Paciente:
          </Typography>
          <Box component="dl" sx={{ pl: 2 }}>
            {Object.entries(practicalCase.patientData).map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', mb: 1 }}>
                <Typography component="dt" variant="body1" sx={{ fontWeight: 600, mr: 2, minWidth: 150 }}>
                  {key}:
                </Typography>
                <Typography component="dd" variant="body1">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
      
      {(practicalCase.clinicalScenario || practicalCase.caso) && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Escenario Clínico:
          </Typography>
          <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
            {practicalCase.clinicalScenario || practicalCase.caso || practicalCase.escenario}
          </Typography>
        </Box>
      )}
      
      {practicalCase.questions && practicalCase.questions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Preguntas:
          </Typography>
          {practicalCase.questions.map((question, qIndex) => {
            const answerKey = `${caseId}-${qIndex}`;
            const userAnswer = caseAnswers[answerKey] || '';
            const questionText = typeof question === 'string' 
              ? question 
              : (question.questionText || question.texto || '');
            const expectedAnswer = typeof question === 'object' 
              ? (question.expectedAnswer || question.respuestaEsperada || '')
              : '';
            const explanation = typeof question === 'object' 
              ? (question.explanation || question.explicacion || '')
              : '';
            
            return (
              <Box key={qIndex} sx={{ mb: 3 }}>
                <Typography variant="body1" gutterBottom sx={{ fontWeight: 500, mb: 1 }}>
                  {qIndex + 1}. {questionText}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={userAnswer}
                  onChange={(e) => onAnswerChange(caseId, qIndex, e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  sx={{ mt: 1 }}
                />
                {showAnswers && (expectedAnswer || explanation) && (
                  <Box sx={{ mt: 2, p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
                    {expectedAnswer && (
                      <>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                          Respuesta Esperada:
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {expectedAnswer}
                        </Typography>
                      </>
                    )}
                    {explanation && (
                      <>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: expectedAnswer ? 1 : 0 }}>
                          Explicación:
                        </Typography>
                        <Typography variant="body2">
                          {explanation}
                        </Typography>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
      
      <Button
        variant="outlined"
        onClick={() => onToggleAnswers(caseId)}
        sx={{ mt: 2 }}
      >
        {showAnswers ? 'Ocultar Respuestas' : 'Mostrar Respuestas Esperadas'}
      </Button>
    </Paper>
  );
};

export default PracticalCaseSection;

