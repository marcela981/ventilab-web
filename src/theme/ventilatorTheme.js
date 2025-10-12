import { createTheme } from '@mui/material';

export const ventilatorTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#10aede',        // Cyan brillante
      light: '#00a1db',       // Azul claro
      dark: '#3d98cc',        // Azul medio
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3d98cc',        // Azul medio
      light: '#00a1db',       // Azul claro
      dark: '#0a112b',        // Azul oscuro profundo
      contrastText: '#ffffff',
    },
    background: {
      default: '#0a112b',     // Fondo principal
      paper: 'rgba(255, 255, 255, 0.05)', // Superficie sutil
    },
    surface: {
      main: 'rgba(255, 255, 255, 0.05)',
      elevated: 'rgba(255, 255, 255, 0.08)',
    },
    text: {
      primary: '#e8f4fd',     // Azul muy claro
      secondary: 'rgba(232, 244, 253, 0.7)',
      disabled: 'rgba(232, 244, 253, 0.4)',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    info: {
      main: '#10aede',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: '#e8f4fd',
    },
    h6: {
      fontWeight: 500,
      color: '#e8f4fd',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)',
    '0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)',
  ],
});
});