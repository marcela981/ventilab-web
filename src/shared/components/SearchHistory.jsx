/**
 * =============================================================================
 * SearchHistory Component - VentiLab
 * =============================================================================
 * Displays recent search history with options to repeat or remove searches
 * 
 * Features:
 * - List of recent searches (max 10)
 * - Relative time formatting (date-fns)
 * - Result count display
 * - Click to repeat search
 * - Remove individual searches
 * - Clear all history
 * - Empty state
 * - Keyboard accessible
 * 
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Divider,
  Button,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import {
  History as HistoryIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  DeleteOutline as DeleteOutlineIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * SearchHistory Component
 * 
 * @param {Object} props
 * @param {Function} props.onSearchSelect - Callback when a search is selected
 * @param {Function} props.onRemoveSearch - Callback to remove a specific search
 * @param {Function} props.onClearHistory - Callback to clear all history
 * @param {Array} props.history - Array of search history objects
 * @param {boolean} props.isLoading - Whether history is loading
 */
const SearchHistory = ({
  onSearchSelect,
  onRemoveSearch,
  onClearHistory,
  history = [],
  isLoading = false,
}) => {
  const theme = useTheme();

  /**
   * Format timestamp to relative time
   * @param {string} timestamp - ISO timestamp
   * @returns {string} Formatted relative time
   */
  const formatRelativeTime = useCallback((timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: es,
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Hace un momento';
    }
  }, []);

  /**
   * Handle search selection
   * @param {Object} searchItem - Search history item
   */
  const handleSearchSelect = useCallback((searchItem) => {
    if (onSearchSelect) {
      onSearchSelect(searchItem.query);
    }
  }, [onSearchSelect]);

  /**
   * Handle remove search
   * @param {Event} e - Click event
   * @param {string} query - Query to remove
   */
  const handleRemoveSearch = useCallback((e, query) => {
    e.stopPropagation(); // Prevent triggering the search
    if (onRemoveSearch) {
      onRemoveSearch(query);
    }
  }, [onRemoveSearch]);

  /**
   * Handle clear all history
   */
  const handleClearHistory = useCallback(() => {
    if (onClearHistory) {
      onClearHistory();
    }
  }, [onClearHistory]);

  // Empty state
  if (!isLoading && history.length === 0) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 3,
          textAlign: 'center',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <SearchIcon
          sx={{
            fontSize: 48,
            color: alpha(theme.palette.text.secondary, 0.5),
            mb: 2,
          }}
        />
        <Typography variant="body2" color="text.secondary">
          No hay búsquedas recientes
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Tus búsquedas aparecerán aquí
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        maxHeight: 400,
        overflowY: 'auto',
        backgroundColor: theme.palette.background.paper,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: alpha(theme.palette.divider, 0.1),
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: alpha(theme.palette.primary.main, 0.3),
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.5),
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          pb: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          backgroundColor: theme.palette.background.paper,
          zIndex: 1,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ fontWeight: 600 }}
        >
          Búsquedas recientes
        </Typography>
        {history.length > 0 && (
          <Button
            size="small"
            startIcon={<DeleteOutlineIcon />}
            onClick={handleClearHistory}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              color: 'text.secondary',
              '&:hover': {
                color: 'error.main',
              },
            }}
          >
            Borrar historial
          </Button>
        )}
      </Box>

      {/* History List */}
      <List sx={{ pt: 0 }}>
        {history.map((item, index) => (
          <React.Fragment key={`${item.query}-${item.timestamp}`}>
            <ListItem
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="eliminar búsqueda"
                  size="small"
                  onClick={(e) => handleRemoveSearch(e, item.query)}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'error.main',
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                    },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                onClick={() => handleSearchSelect(item)}
                sx={{
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <HistoryIcon
                    sx={{
                      color: 'text.secondary',
                      fontSize: 20,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: 'text.primary',
                        pr: 1,
                      }}
                    >
                      {item.query}
                    </Typography>
                  }
                  secondary={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mt: 0.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: '0.7rem' }}
                      >
                        {formatRelativeTime(item.timestamp)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: '0.7rem' }}
                      >
                        •
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: '0.7rem' }}
                      >
                        {item.resultCount} {item.resultCount === 1 ? 'resultado' : 'resultados'}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
            {index < history.length - 1 && (
              <Divider variant="inset" component="li" sx={{ ml: 7 }} />
            )}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

SearchHistory.propTypes = {
  /**
   * Callback function when a search item is selected
   * Receives the query string
   */
  onSearchSelect: PropTypes.func.isRequired,

  /**
   * Callback function to remove a specific search from history
   * Receives the query string to remove
   */
  onRemoveSearch: PropTypes.func.isRequired,

  /**
   * Callback function to clear all search history
   */
  onClearHistory: PropTypes.func.isRequired,

  /**
   * Array of search history objects
   * Each object should have: { query, timestamp, resultCount }
   */
  history: PropTypes.arrayOf(
    PropTypes.shape({
      query: PropTypes.string.isRequired,
      timestamp: PropTypes.string.isRequired,
      resultCount: PropTypes.number,
    })
  ),

  /**
   * Whether history is currently loading
   */
  isLoading: PropTypes.bool,
};

export default SearchHistory;

