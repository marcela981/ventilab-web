import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el state para mostrar la UI de error
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Ignorar errores de HMR
    if (error.message?.includes('HMR') || 
        error.message?.includes('Invalid message') ||
        error.message?.includes('isrManifest')) {
      console.warn('HMR Error (ignorando):', error.message);
      return;
    }

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log del error
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Si es un error de HMR, no mostrar el error boundary
      if (this.state.error?.message?.includes('HMR') || 
          this.state.error?.message?.includes('Invalid message') ||
          this.state.error?.message?.includes('isrManifest')) {
        return this.props.children;
      }

      // UI de error personalizada
      return (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            m: 2, 
            textAlign: 'center',
            backgroundColor: '#fff3e0',
            border: '1px solid #ff9800'
          }}
        >
          <Box sx={{ mb: 3 }}>
            <ErrorOutline 
              sx={{ 
                fontSize: 64, 
                color: '#ff9800',
                mb: 2 
              }} 
            />
            <Typography variant="h5" gutterBottom color="error">
              ¡Oops! Algo salió mal
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Ha ocurrido un error inesperado. Por favor, recarga la página o contacta al soporte técnico.
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={this.handleReset}
              sx={{ mr: 2 }}
            >
              Reintentar
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
            >
              Recargar Página
            </Button>
          </Box>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box sx={{ mt: 3, textAlign: 'left' }}>
              <Typography variant="h6" color="error" gutterBottom>
                Detalles del Error (Desarrollo):
              </Typography>
              <Paper 
                sx={{ 
                  p: 2, 
                  backgroundColor: '#f5f5f5',
                  overflow: 'auto',
                  maxHeight: 200
                }}
              >
                <Typography 
                  variant="body2" 
                  component="pre" 
                  sx={{ 
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </Typography>
              </Paper>
            </Box>
          )}
        </Paper>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
