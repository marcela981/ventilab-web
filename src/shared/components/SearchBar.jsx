/**
 * =============================================================================
 * SearchBar Component
 * =============================================================================
 * Global search bar component for VentiLab
 * 
 * Features:
 * - Real-time autocomplete suggestions
 * - Keyboard navigation (arrows, enter, esc)
 * - Global keyboard shortcut (Ctrl+K / Cmd+K)
 * - Responsive design
 * - Material UI integration
 * - Accessible (ARIA attributes)
 * - Smooth animations
 * 
 * Usage:
 * <SearchBar />
 * 
 * =============================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';
import {
  TextField,
  Autocomplete,
  Box,
  Typography,
  CircularProgress,
  Paper,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  InputAdornment,
  Fade,
  useTheme,
  useMediaQuery,
  alpha,
  Popper,
} from '@mui/material';
import {
  Search as SearchIcon,
  MenuBook as MenuBookIcon,
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Autorenew as AutorenewIcon,
} from '@mui/icons-material';
import { useSearch } from '@/shared/hooks/useSearch';
import SearchHistory from '@/shared/components/SearchHistory';

/**
 * Format category name for display
 * @param {string} category - Category enum value
 * @returns {string} Formatted category name
 */
const formatCategory = (category) => {
  const categoryMap = {
    FUNDAMENTALS: 'Fundamentos',
    VENTILATION_PRINCIPLES: 'Principios de Ventilación',
    CLINICAL_APPLICATIONS: 'Aplicaciones Clínicas',
    ADVANCED_TECHNIQUES: 'Técnicas Avanzadas',
    TROUBLESHOOTING: 'Solución de Problemas',
    PATIENT_SAFETY: 'Seguridad del Paciente',
  };
  return categoryMap[category] || category;
};

/**
 * Get completion status icon and color
 * @param {boolean} completed - Whether item is completed
 * @returns {Object} Icon component and color
 */
const getCompletionStatus = (completed) => {
  if (completed === true) {
    return {
      icon: CheckCircleIcon,
      color: 'success.main',
      label: 'Completado',
    };
  } else if (completed === false) {
    return {
      icon: RadioButtonUncheckedIcon,
      color: 'text.secondary',
      label: 'Pendiente',
    };
  }
  return null;
};

/**
 * Detect if user is on Mac
 * @returns {boolean} True if Mac OS
 */
const isMac = () => {
  if (typeof window === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

/**
 * SearchBar Component
 */
const SearchBar = ({
  placeholder = 'Buscar lecciones, módulos, temas...',
  maxSuggestions = 5,
  enableShortcut = true,
  onNavigate,
  sx = {},
}) => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const inputRef = useRef(null);

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [shortcutLabel] = useState(isMac() ? '⌘K' : 'Ctrl+K');
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  // Search hook
  const {
    suggestions,
    isFetchingSuggestions,
    fetchSuggestions,
    error,
    clearResults,
    getSearchHistory,
    clearSearchHistory,
    removeFromHistory,
    performSearch,
  } = useSearch();

  /**
   * Load search history on mount and when input is focused
   */
  useEffect(() => {
    const history = getSearchHistory();
    setSearchHistory(history);
  }, [getSearchHistory]);

  /**
   * Handle input change - fetch suggestions or show history
   */
  const handleInputChange = useCallback((event, newValue, reason) => {
    // Only update if user is typing
    if (reason === 'input') {
      setInputValue(newValue);
      
      if (newValue.trim().length >= 2) {
        // Show suggestions when typing
        setShowHistory(false);
        fetchSuggestions(newValue, maxSuggestions);
        setOpen(true);
      } else {
        // Show history when input is empty
        setShowHistory(true);
        setOpen(true);
      }
    }
  }, [fetchSuggestions, maxSuggestions]);

  /**
   * Handle focus - show history if input is empty
   */
  const handleFocus = useCallback(() => {
    const history = getSearchHistory();
    setSearchHistory(history);
    
    if (inputValue.trim().length < 2) {
      setShowHistory(true);
      setOpen(true);
    } else {
      setShowHistory(false);
      setOpen(true);
    }
  }, [inputValue, getSearchHistory]);

  /**
   * Handle blur - close dropdown
   */
  const handleBlur = useCallback(() => {
    // Small delay to allow clicking on history items
    setTimeout(() => {
      setOpen(false);
      setShowHistory(false);
    }, 200);
  }, []);

  /**
   * Handle history search selection
   */
  const handleHistorySelect = useCallback((query) => {
    // Set the input value and navigate to search page
    setInputValue(query);
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setOpen(false);
    setShowHistory(false);
    
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }, [router]);

  /**
   * Handle remove from history
   */
  const handleRemoveFromHistory = useCallback((query) => {
    removeFromHistory(query);
    const updatedHistory = getSearchHistory();
    setSearchHistory(updatedHistory);
  }, [removeFromHistory, getSearchHistory]);

  /**
   * Handle clear all history
   */
  const handleClearHistory = useCallback(() => {
    clearSearchHistory();
    setSearchHistory([]);
  }, [clearSearchHistory]);

  /**
   * Handle suggestion selection
   */
  const handleSuggestionSelect = useCallback((event, value) => {
    if (!value) return;

    // Navigate to the selected item
    const path = value.type === 'module' 
      ? `/modules/${value.id}`
      : `/lessons/${value.id}`;

    // Call custom onNavigate if provided
    if (onNavigate) {
      onNavigate(value, path);
    }

    // Navigate using Next.js router
    router.push(path);

    // Clear the input and close dropdown
    setInputValue('');
    setOpen(false);

    // Blur the input
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }, [router, onNavigate]);

  /**
   * Handle Enter key press without selecting a suggestion
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && inputValue.trim().length >= 2 && open) {
      // Check if a suggestion is highlighted
      const highlightedOption = event.target.getAttribute('aria-activedescendant');
      
      // If no suggestion is highlighted, navigate to search results page
      if (!highlightedOption) {
        event.preventDefault();
        router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
        setInputValue('');
        setOpen(false);
        
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }
    } else if (event.key === 'Escape') {
      setInputValue('');
      setOpen(false);
      
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  }, [inputValue, router, open]);

  /**
   * Handle keyboard shortcut (Ctrl+K / Cmd+K)
   */
  useEffect(() => {
    if (!enableShortcut) return;

    const handleKeyboardShortcut = (event) => {
      // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        
        // Focus the search input
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyboardShortcut);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcut);
    };
  }, [enableShortcut]);

  /**
   * Render suggestion option
   */
  const renderOption = (props, option) => {
    const StatusIcon = option.additionalInfo.completed !== undefined
      ? getCompletionStatus(option.additionalInfo.completed)?.icon
      : null;

    const statusColor = option.additionalInfo.completed !== undefined
      ? getCompletionStatus(option.additionalInfo.completed)?.color
      : null;

    return (
      <li {...props} key={`${option.type}-${option.id}`}>
        <ListItem
          sx={{
            width: '100%',
            py: 1.5,
            px: 2,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          {/* Icon for type (Module or Lesson) */}
          <ListItemIcon sx={{ minWidth: 40 }}>
            {option.type === 'module' ? (
              <FolderIcon 
                sx={{ 
                  color: theme.palette.primary.main,
                  fontSize: 24,
                }} 
              />
            ) : (
              <MenuBookIcon 
                sx={{ 
                  color: theme.palette.secondary.main,
                  fontSize: 24,
                }} 
              />
            )}
          </ListItemIcon>

          {/* Content */}
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {/* Title with highlighted search term */}
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    color: 'text.primary',
                  }}
                >
                  {option.title}
                </Typography>

                {/* Type badge */}
                <Chip
                  label={option.type === 'module' ? 'Módulo' : 'Lección'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    backgroundColor: option.type === 'module' 
                      ? alpha(theme.palette.primary.main, 0.15)
                      : alpha(theme.palette.secondary.main, 0.15),
                    color: option.type === 'module'
                      ? theme.palette.primary.main
                      : theme.palette.secondary.main,
                  }}
                />

                {/* Completion status */}
                {StatusIcon && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <StatusIcon 
                      sx={{ 
                        fontSize: 16,
                        color: statusColor,
                      }} 
                    />
                  </Box>
                )}
              </Box>
            }
            secondary={
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  display: 'block',
                  mt: 0.5,
                }}
              >
                {option.additionalInfo.category 
                  ? formatCategory(option.additionalInfo.category)
                  : 'Sin categoría'}
              </Typography>
            }
          />
        </ListItem>
      </li>
    );
  };

  /**
   * Get option label for Autocomplete
   */
  const getOptionLabel = (option) => {
    return typeof option === 'string' ? option : option.title || '';
  };

  /**
   * Custom Popper component that shows history or suggestions
   */
  const CustomPopper = (props) => {
    // If showing history, render SearchHistory component
    if (showHistory && searchHistory.length > 0) {
      return (
        <Popper {...props} placement="bottom-start">
          <Fade in timeout={200}>
            <Box
              sx={{
                mt: 1,
                width: props.style?.width || '600px',
              }}
            >
              <SearchHistory
                history={searchHistory}
                onSearchSelect={handleHistorySelect}
                onRemoveSearch={handleRemoveFromHistory}
                onClearHistory={handleClearHistory}
                isLoading={false}
              />
            </Box>
          </Fade>
        </Popper>
      );
    }

    // Otherwise, use default Popper for suggestions
    return <Popper {...props} />;
  };

  /**
   * Custom Paper component for dropdown
   */
  const CustomPaper = (props) => {
    return (
      <Fade in timeout={200}>
        <Paper
          {...props}
          elevation={8}
          sx={{
            mt: 1,
            backgroundColor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.background.paper, 0.95)
              : theme.palette.background.paper,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 2,
            overflow: 'hidden',
            ...props.sx,
          }}
        />
      </Fade>
    );
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 600,
        ...sx,
      }}
    >
      <Autocomplete
        freeSolo
        open={open && (showHistory ? searchHistory.length > 0 : suggestions.length > 0)}
        onOpen={() => {
          if (showHistory || (inputValue.trim().length >= 2 && suggestions.length > 0)) {
            setOpen(true);
          }
        }}
        onClose={() => setOpen(false)}
        options={showHistory ? [] : suggestions}
        getOptionLabel={getOptionLabel}
        renderOption={renderOption}
        filterOptions={(x) => x} // Disable built-in filtering (server handles it)
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onChange={handleSuggestionSelect}
        loading={isFetchingSuggestions}
        PopperComponent={CustomPopper}
        PaperComponent={CustomPaper}
        noOptionsText={
          inputValue.trim().length < 2 
            ? 'Escribe al menos 2 caracteres'
            : 'No se encontraron resultados'
        }
        loadingText="Buscando sugerencias..."
        clearOnBlur={false}
        clearOnEscape
        blurOnSelect
        selectOnFocus={false}
        componentsProps={{
          popper: {
            placement: 'bottom-start',
            modifiers: [
              {
                name: 'flip',
                enabled: true,
              },
              {
                name: 'preventOverflow',
                enabled: true,
                options: {
                  altAxis: true,
                  altBoundary: true,
                  tether: true,
                  rootBoundary: 'viewport',
                  padding: 8,
                },
              },
            ],
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            inputRef={inputRef}
            placeholder={placeholder}
            variant="outlined"
            size="medium"
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon 
                    sx={{ 
                      color: 'text.secondary',
                      fontSize: isMobile ? 20 : 24,
                    }} 
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Loading indicator */}
                    {isFetchingSuggestions && (
                      <CircularProgress 
                        size={20} 
                        sx={{ color: 'primary.main' }}
                      />
                    )}
                    
                    {/* Keyboard shortcut hint */}
                    {!isMobile && !inputValue && enableShortcut && (
                      <Chip
                        label={shortcutLabel}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.75rem',
                          backgroundColor: alpha(theme.palette.text.primary, 0.05),
                          color: 'text.secondary',
                          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                          fontFamily: 'monospace',
                          fontWeight: 600,
                        }}
                      />
                    )}

                    {params.InputProps.endAdornment}
                  </Box>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.background.paper, 0.6)
                  : theme.palette.background.paper,
                backdropFilter: 'blur(8px)',
                transition: theme.transitions.create([
                  'background-color',
                  'box-shadow',
                  'border-color',
                ], {
                  duration: theme.transitions.duration.short,
                }),
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.background.paper, 0.8)
                    : theme.palette.background.paper,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  },
                },
                '&.Mui-focused': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.background.paper, 0.9)
                    : theme.palette.background.paper,
                  boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.15)}`,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 2,
                  },
                },
              },
              '& .MuiOutlinedInput-input': {
                fontSize: isMobile ? '0.95rem' : '1rem',
                py: isMobile ? 1.5 : 1.75,
              },
            }}
            // Accessibility
            inputProps={{
              ...params.inputProps,
              'aria-label': 'Buscar en VentiLab',
              'aria-describedby': 'search-helper-text',
              'aria-autocomplete': 'list',
              'aria-controls': open ? 'search-suggestions' : undefined,
              autoComplete: 'off',
            }}
          />
        )}
      />

      {/* Error message */}
      {error && (
        <Typography
          variant="caption"
          color="error"
          sx={{
            display: 'block',
            mt: 0.5,
            ml: 2,
          }}
        >
          {error}
        </Typography>
      )}

      {/* Helper text for screen readers */}
      <Typography
        id="search-helper-text"
        variant="srOnly"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Escribe para buscar lecciones y módulos. 
        Usa las flechas del teclado para navegar por las sugerencias. 
        Presiona Enter para buscar o seleccionar una sugerencia. 
        Presiona Escape para cerrar.
        {enableShortcut && ` Usa ${shortcutLabel} para enfocar la búsqueda desde cualquier lugar.`}
      </Typography>
    </Box>
  );
};

SearchBar.propTypes = {
  /**
   * Placeholder text for the search input
   */
  placeholder: PropTypes.string,

  /**
   * Maximum number of suggestions to display
   */
  maxSuggestions: PropTypes.number,

  /**
   * Enable keyboard shortcut (Ctrl+K / Cmd+K)
   */
  enableShortcut: PropTypes.bool,

  /**
   * Callback function when navigating to a result
   * Receives (selectedItem, path) as arguments
   */
  onNavigate: PropTypes.func,

  /**
   * Additional styles for the container
   */
  sx: PropTypes.object,
};

export default SearchBar;

