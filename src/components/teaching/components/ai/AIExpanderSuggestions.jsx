"use client";

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Chip, Stack, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * AIExpanderSuggestions - Renders suggestion chips for AI topic expander
 *
 * @param {Object} props
 * @param {Array} props.suggestions - Array of suggestion objects with id and text
 * @param {Function} props.onSuggestionClick - Callback when a suggestion is clicked
 * @param {Function} props.onRotate - Callback to rotate/refresh suggestions
 * @param {number} props.totalSuggestions - Total number of available suggestions
 * @param {boolean} props.showRotateLink - Whether to show the "see more" link
 */
const AIExpanderSuggestions = ({
  suggestions,
  onSuggestionClick,
  onRotate,
  totalSuggestions,
  showRotateLink,
}) => {
  const { t } = useTranslation('ai');

  const handleKeyDown = (e, suggestion) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSuggestionClick(suggestion);
    }
  };

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <Box
      role="group"
      aria-label={t('suggestions.ariaLabel')}
      aria-live="polite"
      sx={{
        alignSelf: 'center',
        maxWidth: '80%',
        textAlign: 'center',
      }}
    >
      <Typography variant="caption" sx={{ color: '#a0a0a0', mb: 1, display: 'block' }}>
        {t('suggestions.ariaLabel')}
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}
        role="list"
      >
        {suggestions.map((suggestion, index) => (
          <Chip
            key={suggestion.id}
            label={suggestion.text}
            onClick={() => onSuggestionClick(suggestion)}
            onKeyDown={(e) => handleKeyDown(e, suggestion)}
            role="button"
            tabIndex={0}
            aria-label={`${t('suggestions.ariaLabel')} ${index + 1}: ${suggestion.text}`}
            sx={{
              cursor: 'pointer',
              backgroundColor: '#2a3441',
              color: '#0BBAF4',
              border: '1px solid rgba(11, 186, 244, 0.4)',
              fontWeight: 500,
              fontSize: '0.875rem',
              '&:hover': {
                backgroundColor: '#0BBAF4',
                color: '#ffffff',
                border: '1px solid #0BBAF4',
                transform: 'translateY(-2px)',
                boxShadow: '0 2px 8px rgba(11, 186, 244, 0.4)',
              },
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </Stack>
      {showRotateLink && totalSuggestions > 2 && (
        <Link
          component="button"
          type="button"
          onClick={onRotate}
          sx={{
            color: '#0BBAF4',
            fontSize: '0.75rem',
            textDecoration: 'none',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            fontFamily: 'inherit',
            mt: 1,
            display: 'block',
            '&:hover': {
              textDecoration: 'underline',
              color: '#4dd0e1',
            },
          }}
        >
          {t('suggestions.seeMore')}
        </Link>
      )}
    </Box>
  );
};

AIExpanderSuggestions.propTypes = {
  suggestions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
    })
  ).isRequired,
  onSuggestionClick: PropTypes.func.isRequired,
  onRotate: PropTypes.func,
  totalSuggestions: PropTypes.number,
  showRotateLink: PropTypes.bool,
};

AIExpanderSuggestions.defaultProps = {
  onRotate: null,
  totalSuggestions: 0,
  showRotateLink: true,
};

export default AIExpanderSuggestions;
