// Next.js Settings Page - VentyLab
import { Container, Typography, Paper, Box } from '@mui/material';
import { Settings } from '@mui/icons-material';

export default function SettingsPage() {
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
        <Settings sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#1976d2' }}>
          Configuración
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Esta sección está en desarrollo. Aquí podrás configurar las preferencias de la aplicación.
        </Typography>
      </Paper>
    </Container>
  );
}
