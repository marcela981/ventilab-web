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
    <Box>
      <Typography 
        variant="h4" 
        component="h2" 
        gutterBottom 
        sx={{ 
          fontWeight: 600, 
          mb: 3,
          color: '#0BBAF4',
          pb: 2,
          borderBottom: `3px solid #0BBAF4`,
        }}
      >
        {practicalCase.title || `Caso Clínico ${caseIndex + 1}`}
      </Typography>
      
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          backgroundColor: 'transparent',
          minHeight: '60vh',
          color: '#ffffff',
        }}
      >
      
      {practicalCase.patientData && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, color: '#0BBAF4' }}>
            Datos del Paciente:
          </Typography>
          <Box component="dl" sx={{ pl: 2 }}>
            {Object.entries(practicalCase.patientData).map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', mb: 1 }}>
                <Typography component="dt" variant="body1" sx={{ fontWeight: 600, mr: 2, minWidth: 150, color: '#BBECFC' }}>
                  {key}:
                </Typography>
                <Typography component="dd" variant="body1" sx={{ color: '#ffffff' }}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
      
      {(practicalCase.clinicalScenario || practicalCase.caso) && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, color: '#0BBAF4' }}>
            Escenario Clínico:
          </Typography>
          <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, color: '#ffffff' }}>
            {practicalCase.clinicalScenario || practicalCase.caso || practicalCase.escenario}
          </Typography>
        </Box>
      )}
      
      {practicalCase.questions && practicalCase.questions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, color: '#0BBAF4' }}>
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
                <Typography variant="body1" gutterBottom sx={{ fontWeight: 500, mb: 1, color: '#ffffff' }}>
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
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#BBECFC' }}>
                          Respuesta Esperada:
                        </Typography>
                        <Typography variant="body2" paragraph sx={{ color: '#ffffff' }}>
                          {expectedAnswer}
                        </Typography>
                      </>
                    )}
                    {explanation && (
                      <>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: expectedAnswer ? 1 : 0, color: '#BBECFC' }}>
                          Explicación:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ffffff' }}>
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
    </Box>
  );
};

export default PracticalCaseSection;

