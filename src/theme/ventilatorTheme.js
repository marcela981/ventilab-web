import { createTheme } from '@mui/material';

export const ventilatorTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#de0b24', // Rojo Cereza
    },
    secondary: {
      main: '#5B0002', // Rojo Sangre toro
    },
    tertiary: {
      main: '#2F2E2E', // Gris oscuro
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
});