import React from 'react';
import { Box, Paper, Tooltip, IconButton, Typography, Collapse } from '@mui/material';
import { styled } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const StyledEditableCard = styled(Paper)(({ theme, isEditing, isVisible, isDragging, isExpanded }) => ({
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

export const EditControls = ({ visible, onToggleVisibility, isVisible }) => (
  <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5, zIndex: 10 }}>
    <Tooltip title={isVisible ? 'Ocultar tarjeta' : 'Mostrar tarjeta'} arrow>
      <IconButton size="small" onClick={onToggleVisibility} sx={{ color: isVisible ? 'primary.main' : 'text.secondary', backgroundColor: 'rgba(0, 0, 0, 0.3)', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.5)' } }}>
        {isVisible ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
    <Tooltip title="Arrastrar para reorganizar" arrow>
      <IconButton size="small" sx={{ color: 'text.secondary', backgroundColor: 'rgba(0, 0, 0, 0.3)', cursor: 'grab', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.5)' } }}>
        <DragIndicatorIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Box>
);

const EditableCard = ({
  children,
  isEditing,
  isVisible,
  isDragging,
  isExpanded,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  return (
    <StyledEditableCard
      elevation={3}
      isEditing={isEditing}
      isVisible={isVisible}
      isDragging={isDragging}
      isExpanded={isExpanded}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {children}
    </StyledEditableCard>
  );
};

export default EditableCard;
