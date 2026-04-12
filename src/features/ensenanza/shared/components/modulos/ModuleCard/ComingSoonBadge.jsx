/**
 * ComingSoonBadge Component
 * Badge to indicate that a module is under construction
 * WCAG AA compliant with proper contrast and accessibility
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Chip, Tooltip } from '@mui/material';
import { Construction as ConstructionIcon } from '@mui/icons-material';

/**
 * ComingSoonBadge - Badge that indicates a module is coming soon
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the badge
 * @param {string} props.tooltip - Tooltip text (default: "Este módulo está en preparación y se habilitará pronto")
 * @returns {JSX.Element|null}
 */
const ComingSoonBadge = ({ 
  show = false, 
  tooltip = "Este módulo está en preparación y se habilitará pronto" 
}) => {
  if (!show) {
    return null;
  }

  const badge = (
    <Chip
      icon={<ConstructionIcon sx={{ fontSize: 16 }} />}
      label="En construcción"
      size="small"
      sx={{
        backgroundColor: 'warning.light',
        color: 'warning.contrastText',
        fontSize: '0.75rem',
        fontWeight: 600,
        height: 24,
        '& .MuiChip-icon': {
          color: 'warning.contrastText',
        },
        // WCAG AA: Ensure sufficient contrast (4.5:1 for small text)
        // Warning colors should meet contrast requirements
        '@media (prefers-contrast: high)': {
          backgroundColor: 'warning.dark',
          border: '1px solid',
          borderColor: 'warning.contrastText',
        },
      }}
      role="status"
      aria-label="Módulo en construcción"
    />
  );

  if (tooltip) {
    return (
      <Tooltip
        title={tooltip}
        arrow
        placement="top"
        enterDelay={300}
        leaveDelay={100}
      >
        <span>{badge}</span>
      </Tooltip>
    );
  }

  return badge;
};

ComingSoonBadge.propTypes = {
  show: PropTypes.bool,
  tooltip: PropTypes.string,
};

export default ComingSoonBadge;

