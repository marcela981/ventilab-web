import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Error,
  Warning,
  Info,
  Assessment,
} from '@mui/icons-material';
import evaluationService from '@/features/evaluation/services/evaluationService';
import { useAuth } from '@/shared/hooks/useAuth';

export default function EvaluationCasePage() {
  const router = useRouter();
  const { caseId } = router.query;
  const { isAuthenticated, isLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [showExpertConfig, setShowExpertConfig] = useState(false);

  // Estado del formulario
  const [configuration, setConfiguration] = useState({
    ventilationMode: 'volume',
    tidalVolume: '',
    respiratoryRate: '',
    peep: '',
    fio2: '',
    maxPressure: '',
    iERatio: '',
  });

  // Cargar caso clínico
  useEffect(() => {
    if (caseId) {
      loadCase();
    }
  }, [caseId]);

  const loadCase = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await evaluationService.getCaseById(caseId);
      
      if (result.success) {
        setCaseData(result.data);
      } else {
        setError(result.error || 'Error al cargar el caso');
      }
    } catch (err) {
      setError('Error al cargar el caso clínico');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setConfiguration(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      setEvaluationResult(null);
      setShowExpertConfig(false);

      // Validar configuración mínima
      if (!configuration.ventilationMode) {
        setError('El modo de ventilación es requerido');
        setSubmitting(false);
        return;
      }

      // Preparar configuración para enviar (convertir strings a números)
      const configToSend = {
        ventilationMode: configuration.ventilationMode,
        tidalVolume: configuration.tidalVolume ? parseFloat(configuration.tidalVolume) : undefined,
        respiratoryRate: configuration.respiratoryRate ? parseInt(configuration.respiratoryRate) : undefined,
        peep: configuration.peep ? parseFloat(configuration.peep) : undefined,
        fio2: configuration.fio2 ? parseFloat(configuration.fio2) : undefined,
        maxPressure: configuration.maxPressure ? parseFloat(configuration.maxPressure) : undefined,
        iERatio: configuration.iERatio || undefined,
      };

      const result = await evaluationService.evaluateCase(caseId, configToSend);

      if (result.success) {
        setEvaluationResult(result.data);
        setShowExpertConfig(true);
      } else {
        setError(result.error || 'Error al evaluar el caso');
      }
    } catch (err) {
      setError('Error al procesar la evaluación');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getErrorClassificationColor = (classification) => {
    switch (classification) {
      case 'correcto':
        return 'success';
      case 'menor':
        return 'info';
      case 'moderado':
        return 'warning';
      case 'critico':
        return 'error';
      default:
        return 'default';
    }
  };

  const getErrorClassificationIcon = (classification) => {
    switch (classification) {
      case 'correcto':
        return <CheckCircle />;
      case 'menor':
        return <Info />;
      case 'moderado':
        return <Warning />;
      case 'critico':
        return <Error />;
      default:
        return null;
    }
  };

  if (isLoading || loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          {isLoading ? 'Verificando autenticación...' : 'Cargando caso clínico...'}
        </Typography>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="warning">
          Debes estar autenticado para acceder a los casos clínicos.
        </Alert>
        <Button
          variant="contained"
          onClick={() => router.push('/auth/signin')}
          sx={{ mt: 2 }}
        >
          Iniciar Sesión
        </Button>
      </Container>
    );
  }

  if (error && !caseData) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          onClick={() => router.push('/evaluation')}
          sx={{ mt: 2 }}
        >
          Volver a Evaluaciones
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Información del caso */}
      {caseData && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {caseData.case.title}
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Chip
              label={caseData.case.difficulty}
              color={
                caseData.case.difficulty === 'BEGINNER'
                  ? 'success'
                  : caseData.case.difficulty === 'INTERMEDIATE'
                  ? 'warning'
                  : 'error'
              }
              sx={{ mr: 1 }}
            />
            <Chip label={caseData.case.pathology} color="primary" />
          </Box>
          <Typography variant="body1" paragraph>
            <strong>Paciente:</strong> {caseData.case.patientAge} años,{' '}
            {caseData.case.patientWeight} kg
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Diagnóstico:</strong> {caseData.case.mainDiagnosis}
          </Typography>
          {caseData.case.comorbidities.length > 0 && (
            <Typography variant="body1" paragraph>
              <strong>Comorbilidades:</strong>{' '}
              {caseData.case.comorbidities.join(', ')}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" paragraph>
            {caseData.case.description}
          </Typography>
          {caseData.case.labData && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Datos de Laboratorio:
              </Typography>
              <pre style={{ fontSize: '0.875rem', margin: 0 }}>
                {JSON.stringify(caseData.case.labData, null, 2)}
              </pre>
            </Box>
          )}
        </Paper>
      )}

      {/* Formulario de configuración */}
      {!evaluationResult && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Configuración del Ventilador
          </Typography>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Modo de Ventilación"
                  value={configuration.ventilationMode}
                  onChange={(e) =>
                    handleInputChange('ventilationMode', e.target.value)
                  }
                  required
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="volume">Volumen Control</option>
                  <option value="pressure">Presión Control</option>
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Volumen Tidal (Vt) - ml"
                  value={configuration.tidalVolume}
                  onChange={(e) =>
                    handleInputChange('tidalVolume', e.target.value)
                  }
                  inputProps={{ min: 0, step: 10 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Frecuencia Respiratoria (FR) - resp/min"
                  value={configuration.respiratoryRate}
                  onChange={(e) =>
                    handleInputChange('respiratoryRate', e.target.value)
                  }
                  inputProps={{ min: 0, step: 1 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="PEEP - cmH2O"
                  value={configuration.peep}
                  onChange={(e) =>
                    handleInputChange('peep', e.target.value)
                  }
                  inputProps={{ min: 0, step: 1 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="FiO2 - %"
                  value={configuration.fio2}
                  onChange={(e) =>
                    handleInputChange('fio2', e.target.value)
                  }
                  inputProps={{ min: 0, max: 100, step: 1 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Presión Máxima - cmH2O"
                  value={configuration.maxPressure}
                  onChange={(e) =>
                    handleInputChange('maxPressure', e.target.value)
                  }
                  inputProps={{ min: 0, step: 1 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Relación I:E"
                  value={configuration.iERatio}
                  onChange={(e) =>
                    handleInputChange('iERatio', e.target.value)
                  }
                  placeholder="Ej: 1:2"
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} /> : <Assessment />}
                >
                  {submitting ? 'Evaluando...' : 'Evaluar Configuración'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      )}

      {/* Resultados de evaluación */}
      {evaluationResult && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Resultados de la Evaluación
            </Typography>

            {/* Score */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {evaluationResult.comparison.score.toFixed(1)}/100
              </Typography>
              <Chip
                label={
                  evaluationResult.attempt.isSuccessful
                    ? 'Aprobado'
                    : 'No Aprobado'
                }
                color={
                  evaluationResult.attempt.isSuccessful ? 'success' : 'error'
                }
                sx={{ mt: 1 }}
              />
            </Box>

            {/* Resumen */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="success.main">
                      {evaluationResult.comparison.summary.correct}
                    </Typography>
                    <Typography variant="body2">Correctos</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="info.main">
                      {evaluationResult.comparison.summary.minor}
                    </Typography>
                    <Typography variant="body2">Menores</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="warning.main">
                      {evaluationResult.comparison.summary.moderate}
                    </Typography>
                    <Typography variant="body2">Moderados</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="error.main">
                      {evaluationResult.comparison.summary.critical}
                    </Typography>
                    <Typography variant="body2">Críticos</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Comparación de parámetros */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                  Comparación Detallada de Parámetros
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {evaluationResult.comparison.parameters.map((param, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getErrorClassificationIcon(param.errorClassification)}
                      <Typography variant="subtitle1" sx={{ ml: 1 }}>
                        {param.parameter}
                      </Typography>
                      <Chip
                        label={param.errorClassification}
                        color={getErrorClassificationColor(
                          param.errorClassification
                        )}
                        size="small"
                        sx={{ ml: 2 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Usuario: {param.userValue ?? 'N/A'} | Experto:{' '}
                      {param.expertValue ?? 'N/A'}
                      {param.difference !== null &&
                        ` | Diferencia: ${param.difference}`}
                      {param.differencePercent !== null &&
                        ` (${param.differencePercent.toFixed(1)}%)`}
                    </Typography>
                    {!param.withinRange && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Fuera del rango aceptable
                      </Alert>
                    )}
                    <Divider sx={{ mt: 1 }} />
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>

            {/* Retroalimentación */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Retroalimentación
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="body1" paragraph>
                  {evaluationResult.feedback.text}
                </Typography>

                {evaluationResult.feedback.strengths.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Fortalezas:
                    </Typography>
                    <ul>
                      {evaluationResult.feedback.strengths.map((strength, i) => (
                        <li key={i}>{strength}</li>
                      ))}
                    </ul>
                  </Box>
                )}

                {evaluationResult.feedback.improvements.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Áreas de Mejora:
                    </Typography>
                    <ul>
                      {evaluationResult.feedback.improvements.map(
                        (improvement, i) => (
                          <li key={i}>{improvement}</li>
                        )
                      )}
                    </ul>
                  </Box>
                )}

                {evaluationResult.feedback.recommendations.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Recomendaciones:
                    </Typography>
                    <ul>
                      {evaluationResult.feedback.recommendations.map(
                        (rec, i) => (
                          <li key={i}>{rec}</li>
                        )
                      )}
                    </ul>
                  </Box>
                )}

                {evaluationResult.feedback.safetyConcerns &&
                  evaluationResult.feedback.safetyConcerns.length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Preocupaciones de Seguridad:
                      </Typography>
                      <ul style={{ margin: 0 }}>
                        {evaluationResult.feedback.safetyConcerns.map(
                          (concern, i) => (
                            <li key={i}>{concern}</li>
                          )
                        )}
                      </ul>
                    </Alert>
                  )}
              </Paper>
            </Box>

            {/* Configuración experta */}
            {showExpertConfig && evaluationResult.expertConfiguration && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">
                    Configuración Experta Recomendada
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        Modo de Ventilación
                      </Typography>
                      <Typography variant="body1">
                        {evaluationResult.expertConfiguration.ventilationMode}
                      </Typography>
                    </Grid>
                    {evaluationResult.expertConfiguration.tidalVolume && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Volumen Tidal
                        </Typography>
                        <Typography variant="body1">
                          {evaluationResult.expertConfiguration.tidalVolume} ml
                        </Typography>
                      </Grid>
                    )}
                    {evaluationResult.expertConfiguration.respiratoryRate && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Frecuencia Respiratoria
                        </Typography>
                        <Typography variant="body1">
                          {evaluationResult.expertConfiguration.respiratoryRate}{' '}
                          resp/min
                        </Typography>
                      </Grid>
                    )}
                    {evaluationResult.expertConfiguration.peep && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          PEEP
                        </Typography>
                        <Typography variant="body1">
                          {evaluationResult.expertConfiguration.peep} cmH2O
                        </Typography>
                      </Grid>
                    )}
                    {evaluationResult.expertConfiguration.fio2 && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          FiO2
                        </Typography>
                        <Typography variant="body1">
                          {evaluationResult.expertConfiguration.fio2}%
                        </Typography>
                      </Grid>
                    )}
                    {evaluationResult.expertConfiguration.maxPressure && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Presión Máxima
                        </Typography>
                        <Typography variant="body1">
                          {evaluationResult.expertConfiguration.maxPressure}{' '}
                          cmH2O
                        </Typography>
                      </Grid>
                    )}
                    {evaluationResult.expertConfiguration.iERatio && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Relación I:E
                        </Typography>
                        <Typography variant="body1">
                          {evaluationResult.expertConfiguration.iERatio}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Justificación:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {evaluationResult.expertConfiguration.justification}
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Mejora */}
            {evaluationResult.improvement && (
              <Alert
                severity={
                  evaluationResult.improvement.improved ? 'success' : 'info'
                }
                sx={{ mt: 2 }}
              >
                {evaluationResult.improvement.improved
                  ? `¡Mejoraste! Score anterior: ${evaluationResult.improvement.previousScore.toFixed(1)}, Actual: ${evaluationResult.improvement.currentScore.toFixed(1)} (+${evaluationResult.improvement.difference.toFixed(1)})`
                  : `Score anterior: ${evaluationResult.improvement.previousScore.toFixed(1)}, Actual: ${evaluationResult.improvement.currentScore.toFixed(1)}`}
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setEvaluationResult(null);
                  setShowExpertConfig(false);
                }}
              >
                Intentar Nuevamente
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push('/evaluation')}
              >
                Volver a Casos
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </Container>
  );
}

