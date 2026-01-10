// Next.js Evaluation Page - VentyLab
import { Container, Typography, Paper, Box } from '@mui/material';
import { Assessment } from '@mui/icons-material';

export default function Evaluation() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper 
        elevation={2} 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #1976d210, #dc004e10)'
        }}
      >
        <Assessment sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#1976d2' }}>
          Módulo de Evaluación
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Esta sección está en desarrollo. Aquí podrás realizar evaluaciones y seguimiento del aprendizaje.
        </Typography>
      </Paper>
    </Container>
  );
}

