/**
 * =============================================================================
 * useSearch Hook for VentiLab
 * =============================================================================
 * Custom React hook that manages all search functionality including:
 * - Full-text search across modules and lessons
 * - Real-time autocomplete suggestions
 * - Advanced filtering and sorting
 * - Search history management
 * - Debounced API calls for performance
 * - Pagination support
 *
 * This hook provides a complete search experience with automatic state
 * management, error handling, and cleanup on unmount.
 *
 * Usage Examples:
 * ---------------
 *
 * @example
 * // Basic search
 * const { 
 *   query, 
 *   results, 
 *   performSearch, 
 *   isSearching 
 * } = useSearch();
 *
 * const handleSearch = (searchTerm) => {
 *   performSearch(searchTerm);
 * };
 *
 * @example
 * // Search with filters
 * const { 
 *   performSearch, 
 *   setFilter, 
 *   filters 
 * } = useSearch();
 *
 * setFilter('difficulty', ['BEGINNER', 'INTERMEDIATE']);
 * performSearch('ventilación mecánica');
 *
 * @example
 * // Autocomplete suggestions
 * const { 
 *   suggestions, 
 *   fetchSuggestions 
 * } = useSearch();
 *
 * <input 
 *   onChange={(e) => fetchSuggestions(e.target.value)}
 * />
 * {suggestions.map(suggestion => ...)}
 *
 * @example
 * // Search history
 * const { 
 *   getSearchHistory, 
 *   clearSearchHistory 
 * } = useSearch();
 *
 * const history = getSearchHistory();
 * 
 * =============================================================================
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * API Base URL
 * Uses environment variable with fallback to localhost
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * LocalStorage key for search history
 */
const SEARCH_HISTORY_KEY = 'ventilab_search_history';

/**
 * Maximum number of search history items to store
 */
const MAX_HISTORY_ITEMS = 10;

/**
 * Debounce delay for search (milliseconds)
 */
const SEARCH_DEBOUNCE_DELAY = 300;

/**
 * Debounce delay for suggestions (milliseconds)
 */
const SUGGESTIONS_DEBOUNCE_DELAY = 200;

/**
 * Helper function to get authentication token
 * @returns {string|null} Authentication token
 */
const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ventilab_auth_token') || 
         localStorage.getItem('token') || 
         sessionStorage.getItem('token');
};

/**
 * Helper function to make authenticated API requests with AbortController support
 * @param {string} url - Full API URL
 * @param {Object} options - Fetch options
 * @param {AbortSignal} signal - AbortController signal for request cancellation
 * @returns {Promise<Object>} Response data
 * @throws {Error} If request fails or is aborted
 */
const fetchWithAuth = async (url, options = {}, signal = null) => {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const fetchOptions = {
    ...options,
    headers,
    ...(signal && { signal }),
  };

  const response = await fetch(url, fetchOptions);

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  let data;
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { message: text };
  }

  if (!response.ok) {
    const errorMessage = data?.error?.message || data?.message || 'Error en la petición';
    const error = new Error(errorMessage);
    error.statusCode = response.status;
    error.details = data?.error?.details || [];
    throw error;
  }

  return data;
};

/**
 * Helper function to build URL with query parameters
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {string} Full URL with query string
 */
const buildUrlWithParams = (endpoint, params = {}) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        // For arrays, add comma-separated values or multiple params
        url.searchParams.append(key, value.join(','));
      } else {
        url.searchParams.append(key, value);
      }
    }
  });
  
  return url.toString();
};

/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Main useSearch hook
 * @returns {Object} Search state and functions
 */
export const useSearch = () => {
  // =========================================================================
  // State Management
  // =========================================================================

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    categories: [],
    difficulties: [],
    duration: null,
    status: 'all',
    type: 'both',
  });

  const [sortBy, setSortByState] = useState('relevance');
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // =========================================================================
  // Refs for cleanup and debouncing
  // =========================================================================

  const abortControllerRef = useRef(null);
  const suggestionsAbortControllerRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const suggestionsDebounceRef = useRef(null);

  // =========================================================================
  // Search History Management
  // =========================================================================

  /**
   * Add a search query to history
   * Stores an object with query, timestamp, and resultCount
   * Prevents consecutive duplicates and maintains max 10 items
   * @param {string} searchQuery - Query to add to history
   * @param {number} resultCount - Number of results found
   */
  const addToHistory = useCallback((searchQuery, resultCount = 0) => {
    if (!searchQuery || searchQuery.trim().length < 2) return;

    try {
      const history = getSearchHistory();
      const trimmedQuery = searchQuery.trim();
      
      // Check if the last search is identical (prevent consecutive duplicates)
      if (history.length > 0 && history[0].query === trimmedQuery) {
        return;
      }
      
      // Create new history entry
      const newEntry = {
        query: trimmedQuery,
        timestamp: new Date().toISOString(),
        resultCount: resultCount || 0,
      };
      
      // Remove any older entries with the same query
      const filteredHistory = history.filter(item => item.query !== trimmedQuery);
      
      // Add new entry at the beginning and limit to MAX_HISTORY_ITEMS
      const newHistory = [newEntry, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }, []);

  /**
   * Get search history from localStorage
   * Returns array of search objects sorted by timestamp (most recent first)
   * @returns {Array<{query: string, timestamp: string, resultCount: number}>} Array of search history objects
   */
  const getSearchHistory = useCallback(() => {
    try {
      const history = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!history) return [];
      
      const parsed = JSON.parse(history);
      
      // Ensure backward compatibility: convert old string format to object format
      const normalized = parsed.map(item => {
        if (typeof item === 'string') {
          return {
            query: item,
            timestamp: new Date().toISOString(),
            resultCount: 0,
          };
        }
        return item;
      });
      
      // Sort by timestamp descending (most recent first)
      return normalized.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error reading search history:', error);
      return [];
    }
  }, []);

  /**
   * Clear all search history
   */
  const clearSearchHistory = useCallback(() => {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }, []);

  /**
   * Remove a specific search from history
   * @param {string} queryToRemove - Query to remove from history
   */
  const removeFromHistory = useCallback((queryToRemove) => {
    try {
      const history = getSearchHistory();
      const filteredHistory = history.filter(item => item.query !== queryToRemove);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('Error removing from search history:', error);
    }
  }, [getSearchHistory]);

  // =========================================================================
  // Main Search Function
  // =========================================================================

  /**
   * Perform a search with current filters and pagination
   * This function is debounced to avoid excessive API calls
   * @param {string} searchQuery - Search term
   * @param {Object} options - Additional search options
   */
  const performSearchInternal = useCallback(async (searchQuery, options = {}) => {
    // Validate query
    if (!searchQuery || searchQuery.trim().length < 2) {
      setError('El término de búsqueda debe tener al menos 2 caracteres');
      setResults([]);
      return;
    }

    // Cancel previous search request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    setError(null);
    setQuery(searchQuery);

    try {
      // Build query parameters
      const params = {
        q: searchQuery.trim(),
        page: options.page || pagination.page,
        limit: options.limit || pagination.limit,
        sortBy: options.sortBy || sortBy,
      };

      // Add filters if they have values
      if (filters.categories.length > 0) {
        params.category = filters.categories;
      }
      if (filters.difficulties.length > 0) {
        params.difficulty = filters.difficulties;
      }
      if (filters.duration) {
        params.duration = filters.duration;
      }
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.type && filters.type !== 'both') {
        params.type = filters.type;
      }

      // Build URL and make request
      const url = buildUrlWithParams('/search', params);
      const response = await fetchWithAuth(url, {}, abortControllerRef.current.signal);

      // Update results and pagination
      if (response.success && response.data) {
        const resultsData = response.data.results || [];
        const totalResults = response.data.total || 0;
        
        setResults(resultsData);
        setPagination({
          page: response.data.pagination?.page || 1,
          limit: response.data.pagination?.limit || 10,
          total: totalResults,
          totalPages: response.data.pagination?.totalPages || 0,
        });

        // Add to search history with result count (only on successful searches with results)
        if (resultsData.length > 0) {
          addToHistory(searchQuery, totalResults);
        }
      } else {
        setResults([]);
        setError('No se encontraron resultados');
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        console.log('Search request was cancelled');
        return;
      }

      console.error('Search error:', err);
      setError(err.message || 'Error al realizar la búsqueda. Por favor, intenta nuevamente.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [filters, sortBy, pagination.page, pagination.limit, addToHistory]);

  /**
   * Debounced search function
   * Public API for performing searches
   */
  const performSearch = useCallback((searchQuery, options = {}) => {
    // Cancel previous debounced call
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Set up new debounced call
    searchDebounceRef.current = setTimeout(() => {
      performSearchInternal(searchQuery, options);
    }, SEARCH_DEBOUNCE_DELAY);
  }, [performSearchInternal]);

  // =========================================================================
  // Autocomplete Suggestions
  // =========================================================================

  /**
   * Fetch search suggestions for autocomplete
   * This function is debounced for performance
   * @param {string} searchQuery - Partial search term
   * @param {number} limit - Maximum number of suggestions (default: 5)
   */
  const fetchSuggestionsInternal = useCallback(async (searchQuery, limit = 5) => {
    // Validate query
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    // Cancel previous suggestions request
    if (suggestionsAbortControllerRef.current) {
      suggestionsAbortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    suggestionsAbortControllerRef.current = new AbortController();

    setIsFetchingSuggestions(true);

    try {
      // Build URL with query parameters
      const url = buildUrlWithParams('/search/suggestions', {
        q: searchQuery.trim(),
        limit: limit,
      });

      const response = await fetchWithAuth(
        url, 
        {}, 
        suggestionsAbortControllerRef.current.signal
      );

      // Update suggestions
      if (response.success && response.data && response.data.suggestions) {
        setSuggestions(response.data.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        console.log('Suggestions request was cancelled');
        return;
      }

      console.error('Suggestions error:', err);
      setSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  }, []);

  /**
   * Debounced suggestions function
   * Public API for fetching suggestions
   */
  const fetchSuggestions = useCallback((searchQuery, limit = 5) => {
    // Cancel previous debounced call
    if (suggestionsDebounceRef.current) {
      clearTimeout(suggestionsDebounceRef.current);
    }

    // Set up new debounced call
    suggestionsDebounceRef.current = setTimeout(() => {
      fetchSuggestionsInternal(searchQuery, limit);
    }, SUGGESTIONS_DEBOUNCE_DELAY);
  }, [fetchSuggestionsInternal]);

  // =========================================================================
  // Filter Management
  // =========================================================================

  /**
   * Set a specific filter value
   * @param {string} filterName - Name of the filter (categories, difficulties, etc.)
   * @param {any} value - Filter value
   */
  const setFilter = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
    }));

    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      page: 1,
    }));
  }, []);

  /**
   * Clear all filters to default values
   */
  const clearFilters = useCallback(() => {
    setFilters({
      categories: [],
      difficulties: [],
      duration: null,
      status: 'all',
      type: 'both',
    });

    // Reset to first page
    setPagination(prev => ({
      ...prev,
      page: 1,
    }));
  }, []);

  // =========================================================================
  // Sorting Management
  // =========================================================================

  /**
   * Set the sort order
   * @param {string} order - Sort order (relevance, date, popularity, duration)
   */
  const setSortBy = useCallback((order) => {
    setSortByState(order);

    // Reset to first page when sort changes
    setPagination(prev => ({
      ...prev,
      page: 1,
    }));
  }, []);

  // =========================================================================
  // Pagination Management
  // =========================================================================

  /**
   * Go to the next page of results
   */
  const nextPage = useCallback(() => {
    setPagination(prev => {
      if (prev.page < prev.totalPages) {
        const newPage = prev.page + 1;
        
        // Re-perform search with new page
        if (query) {
          performSearchInternal(query, { page: newPage });
        }
        
        return { ...prev, page: newPage };
      }
      return prev;
    });
  }, [query, performSearchInternal]);

  /**
   * Go to the previous page of results
   */
  const prevPage = useCallback(() => {
    setPagination(prev => {
      if (prev.page > 1) {
        const newPage = prev.page - 1;
        
        // Re-perform search with new page
        if (query) {
          performSearchInternal(query, { page: newPage });
        }
        
        return { ...prev, page: newPage };
      }
      return prev;
    });
  }, [query, performSearchInternal]);

  /**
   * Go to a specific page
   * @param {number} pageNumber - Page number to navigate to
   */
  const goToPage = useCallback((pageNumber) => {
    if (pageNumber < 1 || pageNumber > pagination.totalPages) {
      return;
    }

    setPagination(prev => ({ ...prev, page: pageNumber }));

    // Re-perform search with new page
    if (query) {
      performSearchInternal(query, { page: pageNumber });
    }
  }, [query, pagination.totalPages, performSearchInternal]);

  /**
   * Set the number of items per page
   * @param {number} limit - Items per page
   */
  const setPageLimit = useCallback((limit) => {
    setPagination(prev => ({
      ...prev,
      limit,
      page: 1, // Reset to first page when limit changes
    }));

    // Re-perform search with new limit
    if (query) {
      performSearchInternal(query, { limit, page: 1 });
    }
  }, [query, performSearchInternal]);

  // =========================================================================
  // Utility Functions
  // =========================================================================

  /**
   * Clear all search results and reset state
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setSuggestions([]);
    setQuery('');
    setError(null);
    setPagination({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  }, []);

  /**
   * Log a click on a search result for analytics
   * Fire-and-forget, doesn't block UI
   * 
   * @param {string} resultId - ID of the clicked result
   * @param {string} resultType - Type of result ('module' or 'lesson')
   * @param {string} searchQuery - The query that produced this result
   */
  const logResultClick = useCallback(async (resultId, resultType, searchQuery) => {
    try {
      const token = getAuthToken();
      if (!token) return; // Don't log if user is not authenticated

      // Fire-and-forget: don't await or handle errors
      fetch(`${API_BASE_URL}/search/log-click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: searchQuery || query,
          selectedResult: resultId,
          selectedType: resultType,
          // Could add sessionId here if tracking sessions
        }),
      }).catch((err) => {
        // Silently fail - analytics shouldn't break the app
        console.debug('Analytics: Failed to log result click', err);
      });
    } catch (err) {
      // Silently fail - analytics shouldn't break the app
      console.debug('Analytics: Error logging result click', err);
    }
  }, [query]);

  // =========================================================================
  // Cleanup on unmount
  // =========================================================================

  useEffect(() => {
    // Cleanup function to cancel pending requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (suggestionsAbortControllerRef.current) {
        suggestionsAbortControllerRef.current.abort();
      }
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      if (suggestionsDebounceRef.current) {
        clearTimeout(suggestionsDebounceRef.current);
      }
    };
  }, []);

  // =========================================================================
  // Re-perform search when filters or sort order changes
  // =========================================================================

  useEffect(() => {
    // Only re-search if we have an active query
    if (query && query.trim().length >= 2) {
      performSearchInternal(query, { page: 1 });
    }
  }, [filters, sortBy]); // Don't include performSearchInternal to avoid infinite loops

  // =========================================================================
  // Return hook API
  // =========================================================================

  return {
    // State
    query,
    results,
    suggestions,
    isSearching,
    isFetchingSuggestions,
    error,
    filters,
    sortBy,
    pagination,

    // Search functions
    performSearch,
    fetchSuggestions,

    // Filter management
    setFilter,
    clearFilters,

    // Sorting
    setSortBy,

    // Pagination
    nextPage,
    prevPage,
    goToPage,
    setPageLimit,

    // History management
    addToHistory,
    getSearchHistory,
    clearSearchHistory,
    removeFromHistory,

    // Utility
    clearResults,
    
    // Analytics
    logResultClick,
  };
};

export default useSearch;

