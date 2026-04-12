/**
 * QuickActionsGrid - Malla de accesos rápidos del panel
 * Distribución auto-adaptable: no se comprime cuando el sidebar abre/cierra.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

function ActionCard({ icon, title, description, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        transition: 'transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
        '&:hover': {
          transform: 'translateX(4px)',
          background: 'rgba(16, 174, 222, 0.1)',
          borderColor: 'rgba(16, 174, 222, 0.35)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        },
        '&:hover .arrow-icon': {
          transform: 'translateX(4px)',
          color: '#7dd3fc',
        },
      }}
    >
      <Box
        sx={{
          width: 38, height: 38, borderRadius: 1.5, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(16, 174, 222, 0.15)',
          border: '1px solid rgba(16, 174, 222, 0.3)',
          color: '#7dd3fc',
          '& svg': { fontSize: 20 },
        }}
      >
        {icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} sx={{ color: '#fff' }} noWrap>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }} noWrap>
          {description}
        </Typography>
      </Box>

      <ArrowForwardIcon
        className="arrow-icon"
        sx={{
          fontSize: 16, color: 'rgba(255,255,255,0.35)', flexShrink: 0,
          transition: 'transform 0.18s ease, color 0.18s ease',
        }}
      />
    </Box>
  );
}

export default function QuickActionsGrid({ actions, navigate }) {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2.5,
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Typography
        variant="subtitle1"
        fontWeight={700}
        sx={{ color: '#e8eaf6', mb: 2 }}
      >
        Accesos rápidos
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {actions.map((action) => (
          <ActionCard
            key={action.path}
            icon={action.icon}
            title={action.title}
            description={action.description}
            onClick={() => navigate(action.path)}
          />
        ))}
      </Box>
    </Box>
  );
}

QuickActionsGrid.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      icon: PropTypes.node.isRequired,
    })
  ).isRequired,
  navigate: PropTypes.func.isRequired,
};

ActionCard.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};
