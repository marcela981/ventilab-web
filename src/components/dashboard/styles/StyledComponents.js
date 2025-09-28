import { styled } from '@mui/material/styles';
import { Box, Paper, Button } from '@mui/material';

export const DashboardContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  padding: theme.spacing(2),
  paddingBottom: '140px', // Espacio aumentado para la barra de navegación fija
}));

export const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'rgba(121, 10, 10, 0.57)',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
}));

export const ModeIndicator = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 20,
  left: 20,
  zIndex: 1000,
  padding: theme.spacing(1, 2),
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderRadius: theme.spacing(1),
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

// Botón de ajuste personalizado
export const AdjustButton = styled(Button)(({ theme, active }) => ({
  backgroundColor: active ? theme.palette.secondary.main : 'rgba(255, 255, 255, 0.1)',
  color: active ? '#fff' : theme.palette.text.primary,
  fontWeight: 600,
  padding: theme.spacing(1, 2),
  borderRadius: theme.spacing(1),
  border: active ? '2px solid #de0b24' : '2px solid rgba(255, 255, 255, 0.2)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: active ? theme.palette.secondary.dark : 'rgba(255, 255, 255, 0.2)',
    transform: 'scale(1.05)',
  },
}));

// Tarjeta personalizada con modo de edición
export const EditableCard = styled(Paper)(({ theme, isEditing, isVisible, isDragging, isExpanded }) => ({
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