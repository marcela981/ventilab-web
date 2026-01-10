import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { HelpOutline, School, TrendingUp } from '@mui/icons-material';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  suggestions?: Array<{ label: string; onClick: () => void }>;
}

/**
 * EmptyState - Componente genérico para estados vacíos
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  suggestions
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 3,
        textAlign: 'center'
      }}
    >
      {icon || <HelpOutline sx={{ fontSize: 64, color: '#9e9e9e', opacity: 0.5, mb: 2 }} />}
      
      <Typography
        variant="h6"
        sx={{
          color: '#ffffff',
          fontWeight: 600,
          mb: 1
        }}
      >
        {title}
      </Typography>
      
      <Typography
        variant="body2"
        sx={{
          color: '#e8f4fd',
          opacity: 0.7,
          mb: 3,
          maxWidth: '400px'
        }}
      >
        {description}
      </Typography>

      {suggestions && suggestions.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: '300px', mb: 3 }}>
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outlined"
              startIcon={<School />}
              onClick={suggestion.onClick}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                '&:hover': {
                  borderColor: '#2196F3',
                  backgroundColor: 'rgba(33, 150, 243, 0.1)'
                }
              }}
            >
              {suggestion.label}
            </Button>
          ))}
        </Box>
      )}

      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          startIcon={<TrendingUp />}
          sx={{
            backgroundColor: '#2196F3',
            '&:hover': {
              backgroundColor: '#1976D2'
            }
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;

