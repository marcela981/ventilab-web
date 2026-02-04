"use client";

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, IconButton, Link } from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';

/**
 * AIExpanderResults - Renders the AI response in a structured format
 *
 * Displays:
 * - Expanded explanation with markdown
 * - Key points as bullet list
 * - Deeper dive items
 * - Suggested references
 * - Internal links
 * - Offline note indicator
 *
 * @param {Object} props
 * @param {Object} props.response - AI response object
 * @param {string} props.resultId - ID for the result region
 * @param {Function} props.onSaveToNotes - Callback to save to notes
 * @param {boolean} props.savingNote - Whether a note is being saved
 * @param {boolean} props.noteSaved - Whether note was saved successfully
 */
const AIExpanderResults = ({ response, resultId, onSaveToNotes, savingNote, noteSaved }) => {
  const { t } = useTranslation('ai');

  if (!response) return null;

  // Ensure expandedExplanation exists and is not empty
  if (!response.expandedExplanation || response.expandedExplanation.trim().length === 0) {
    return (
      <Typography variant="body2" sx={{ color: '#a0a0a0', fontStyle: 'italic' }}>
        {t('topicExpander.results.noResults')}
      </Typography>
    );
  }

  const bulletStyle = {
    position: 'absolute',
    left: 0,
    top: '0.5em',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#0BBAF4',
  };

  return (
    <Box
      id={resultId}
      role="region"
      aria-live="polite"
      aria-atomic="true"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        color: '#1a1a1a',
      }}
    >
      {/* Header with save button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: '#0BBAF4', fontWeight: 600 }}>
          {t('topicExpander.results.expandedExplanation')}
        </Typography>
        <IconButton
          size="small"
          onClick={onSaveToNotes}
          disabled={savingNote || noteSaved}
          sx={{
            color: noteSaved ? '#4caf50' : '#0BBAF4',
            '&:hover': {
              backgroundColor: 'rgba(11, 186, 244, 0.2)',
            },
          }}
          title={noteSaved ? 'Guardado' : 'Guardar en Notas'}
        >
          <StarIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Explanation */}
      {response.expandedExplanation && (
        <Box>
          <Box sx={{ color: '#e0e0e0', lineHeight: 1.7, fontSize: '0.95rem', '& p': { color: '#e0e0e0' }, '& strong': { color: '#ffffff' } }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {response.expandedExplanation}
            </ReactMarkdown>
          </Box>
        </Box>
      )}

      {/* Key Points */}
      {response.keyPoints && response.keyPoints.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#0BBAF4', fontWeight: 600, mb: 1 }}>
            {t('topicExpander.results.keyPoints')}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2, listStyle: 'none' }}>
            {response.keyPoints.map((point, index) => (
              <Box key={index} component="li" sx={{ mb: 1, position: 'relative', pl: 1.5 }}>
                <Box component="span" sx={bulletStyle} />
                <Box sx={{ color: '#e0e0e0', lineHeight: 1.6, fontSize: '0.9rem', '& p': { color: '#e0e0e0' } }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {point}
                  </ReactMarkdown>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Deeper Dive */}
      {response.deeperDive && response.deeperDive.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#0BBAF4', fontWeight: 600, mb: 1 }}>
            {t('topicExpander.results.deeperDive')}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2, listStyle: 'none' }}>
            {response.deeperDive.map((item, index) => (
              <Box key={index} component="li" sx={{ mb: 1, position: 'relative', pl: 1.5 }}>
                <Box component="span" sx={bulletStyle} />
                <Box sx={{ color: '#1a1a1a', lineHeight: 1.6, fontSize: '0.9rem' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {item}
                  </ReactMarkdown>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Suggested References */}
      {response.suggestedReferences && response.suggestedReferences.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#0BBAF4', fontWeight: 600, mb: 1 }}>
            {t('topicExpander.results.suggestedReferences')}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {response.suggestedReferences.map((ref, index) => (
              <Box key={index} component="li" sx={{ mb: 0.5 }}>
                <Typography sx={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                  {typeof ref === 'string' ? ref : ref.title || ref}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Internal Links */}
      {response.internalLinks && response.internalLinks.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#0BBAF4', fontWeight: 600, mb: 1 }}>
            {t('topicExpander.results.internalLinks')}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {response.internalLinks.map((link, index) => (
              <Box key={index} component="li" sx={{ mb: 0.5 }}>
                <Link
                  href={link.url || link.route}
                  sx={{
                    color: '#0BBAF4',
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {link.title || link.url || link.route}
                </Link>
                {link.description && (
                  <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', ml: 1 }}>
                    {link.description}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Offline Note */}
      {response.isOffline && (
        <Typography variant="caption" sx={{ color: '#666666', fontStyle: 'italic', mt: 1 }}>
          {t('topicExpander.results.offlineNote')}
        </Typography>
      )}
    </Box>
  );
};

AIExpanderResults.propTypes = {
  response: PropTypes.shape({
    expandedExplanation: PropTypes.string,
    keyPoints: PropTypes.arrayOf(PropTypes.string),
    deeperDive: PropTypes.arrayOf(PropTypes.string),
    suggestedReferences: PropTypes.array,
    internalLinks: PropTypes.array,
    isOffline: PropTypes.bool,
  }),
  resultId: PropTypes.string.isRequired,
  onSaveToNotes: PropTypes.func.isRequired,
  savingNote: PropTypes.bool,
  noteSaved: PropTypes.bool,
};

AIExpanderResults.defaultProps = {
  response: null,
  savingNote: false,
  noteSaved: false,
};

export default AIExpanderResults;
