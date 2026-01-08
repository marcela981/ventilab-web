// Next.js Evaluation Page - VentyLab
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  Assessment,
  ArrowForward,
  CheckCircle,
} from '@mui/icons-material';
import { evaluationService } from '../src/service/api/evaluationService';
import { useApiClient } from '../src/hooks/useApiClient';

export default function Evaluation() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useApiClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cases, setCases] = useState([]);
  const [filters, setFilters] = useState({
    nivel: '',
    patologia: '',
  });

  useEffect(() => {
    loadCases();
  }, [filters]);

  const loadCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await evaluationService.getCases({
        ...filters,
        limit: 20,
      });

      if (result.success) {
        setCases(result.data.cases || []);
      } else {
        setError(result.error || 'Error al cargar casos');
      }
    } catch (err) {
      setError('Error al cargar casos clínicos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCaseClick = (caseId) => {
    router.push(`/evaluation/${caseId}`);
  };

  if (isLoading || loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          {isLoading ? 'Verificando autenticación...' : 'Cargando casos clínicos...'}
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Casos Clínicos de Evaluación
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Selecciona un caso clínico para evaluar tu conocimiento en configuración de ventiladores mecánicos.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {cases.length === 0 && !loading && (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No hay casos clínicos disponibles en este momento.
          </Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        {cases.map((caseItem) => (
          <Grid item xs={12} md={6} lg={4} key={caseItem.id}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardActionArea
                onClick={() => handleCaseClick(caseItem.id)}
                sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', p: 2 }}
              >
                <Box sx={{ width: '100%', mb: 2 }}>
                  <Chip
                    label={caseItem.difficulty}
                    color={
                      caseItem.difficulty === 'BEGINNER'
                        ? 'success'
                        : caseItem.difficulty === 'INTERMEDIATE'
                        ? 'warning'
                        : 'error'
                    }
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={caseItem.pathology}
                    color="primary"
                    size="small"
                  />
                </Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {caseItem.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2, flex: 1 }}
                >
                  {caseItem.description.substring(0, 150)}...
                </Typography>
                <Box sx={{ width: '100%', mt: 'auto' }}>
                  {caseItem.userAttempts.hasAttempted && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CheckCircle sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
                        Mejor score: {caseItem.userAttempts.bestScore?.toFixed(1)}/100
                      </Typography>
                    </Box>
                  )}
                  <Button
                    endIcon={<ArrowForward />}
                    variant="contained"
                    fullWidth
                  >
                    {caseItem.userAttempts.hasAttempted
                      ? 'Reintentar'
                      : 'Comenzar Evaluación'}
                  </Button>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
