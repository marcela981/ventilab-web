import { styled } from '@mui/material/styles';
import { Box, Paper, Button } from '@mui/material';

/**
 * DashboardStyles.js
 * 
 * Contiene todos los styled components utilizados en VentilatorDashboard.jsx
 * para mejorar la organización y mantenibilidad del código.
 */

// Container principal del dashboard
export const DashboardContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  padding: theme.spacing(2),
  paddingBottom: '140px', // Espacio aumentado para la barra de navegación fija
}));

// Paper con estilo personalizado para tarjetas
export const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
  transition: 'all 0.25s ease',
  '&:hover': {
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    transform: 'translateY(-2px)',
  },
}));

// Indicador de modo fijo en la esquina superior izquierda
export const ModeIndicator = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 20,
  left: 20,
  zIndex: 1000,
  padding: theme.spacing(1, 2),
  backgroundColor: 'rgba(10, 17, 43, 0.95)',
  borderRadius: '8px',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
}));

// Botón de ajuste personalizado con estado activo
export const AdjustButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
  backgroundColor: active ? '#10aede' : 'rgba(255, 255, 255, 0.05)',
  color: active ? '#ffffff' : '#e8f4fd',
  fontWeight: 600,
  padding: theme.spacing(1, 2),
  borderRadius: '8px',
  border: active ? '2px solid #10aede' : '2px solid rgba(255, 255, 255, 0.12)',
  transition: 'all 0.25s ease',
  '&:hover': {
    backgroundColor: active ? '#3d98cc' : 'rgba(255, 255, 255, 0.08)',
    transform: 'scale(1.05)',
    boxShadow: '0 4px 14px rgba(16, 174, 222, 0.3)',
  },
}));

// Tarjeta personalizada con modo de edición y propiedades dinámicas
export const EditableCard = styled(Paper, {
  shouldForwardProp: (prop) => !['isEditing', 'isVisible', 'isDragging', 'isExpanded'].includes(prop),
})(({ theme, isEditing, isVisible, isDragging, isExpanded }) => ({
  width: '340px',
  height: isExpanded ? 'auto' : '110px',
  minHeight: isExpanded ? '250px' : '110px',
  maxHeight: isExpanded ? '400px' : '110px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: isExpanded ? 'flex-start' : 'center',
  justifyContent: isExpanded ? 'flex-start' : 'center',
  padding: theme.spacing(1),
  backgroundColor: isVisible ? 'rgba(31, 31, 31, 0.2)' : 'rgba(31, 31, 31, 0.05)',
  position: 'relative',
  opacity: isVisible ? 1 : 0.4,
  cursor: isEditing ? 'grab' : 'default',
  transform: isDragging ? 'scale(1.05) rotate(2deg)' : 'scale(1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: isExpanded ? 'auto' : 'hidden',
  borderRadius: 0,
  border: isEditing 
    ? (isVisible ? '2px dashed rgba(218, 0, 22, 0.5)' : '2px dashed rgba(255, 255, 255, 0.2)')
    : (isVisible ? '1px solid transparent' : '1px solid rgba(255, 255, 255, 0.1)'),
  '&:hover': {
    backgroundColor: isEditing 
      ? (isVisible ? 'rgba(31, 31, 31, 0.4)' : 'rgba(31, 31, 31, 0.1)')
      : (isVisible ? 'rgba(31, 31, 31, 0.2)' : 'rgba(31, 31, 31, 0.05)'),
    transform: isEditing ? 'scale(1.02)' : 'scale(1)',
    opacity: isVisible ? 1 : 0.6,
  },
  '&:active': {
    cursor: isEditing ? 'grabbing' : 'default',
  },
  // Estilo especial para tarjetas ocultas
  ...(isVisible ? {} : {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(45deg, transparent 40%, rgba(255, 255, 255, 0.05) 50%, transparent 60%)',
      pointerEvents: 'none',
    }
  }),
}));
