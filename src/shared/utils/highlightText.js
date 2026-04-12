/**
 * =============================================================================
 * highlightText Utility - VentiLab
 * =============================================================================
 * Utilidades para resaltar términos de búsqueda en textos y crear snippets
 * 
 * Features:
 * - Búsqueda case-insensitive
 * - Extracción de contexto inteligente
 * - Resaltado con estilos personalizables
 * - Manejo robusto de edge cases
 * - Funciones puras y testables
 * - No corta palabras a la mitad
 * 
 * =============================================================================
 */

import React from 'react';
import { Box } from '@mui/material';

/**
 * Escape special regex characters in a string
 * @private
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for regex
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Find the nearest word boundary (space, punctuation, or string edge)
 * @private
 * @param {string} text - Text to search in
 * @param {number} position - Starting position
 * @param {string} direction - 'left' or 'right'
 * @returns {number} Position of nearest boundary
 */
const findWordBoundary = (text, position, direction) => {
  if (direction === 'left') {
    // Move left to find start of word or boundary
    let pos = position;
    while (pos > 0 && /\S/.test(text[pos - 1])) {
      pos--;
    }
    return pos;
  } else {
    // Move right to find end of word or boundary
    let pos = position;
    while (pos < text.length && /\S/.test(text[pos])) {
      pos++;
    }
    return pos;
  }
};

/**
 * Trim text to fit within maxLength, avoiding cutting words
 * @private
 * @param {string} text - Text to trim
 * @param {number} maxLength - Maximum length
 * @param {boolean} addEllipsisStart - Add ellipsis at start
 * @param {boolean} addEllipsisEnd - Add ellipsis at end
 * @returns {string} Trimmed text
 */
const smartTrim = (text, maxLength, addEllipsisStart = false, addEllipsisEnd = false) => {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  let trimmed = text.slice(0, maxLength);
  
  // Find last space to avoid cutting words
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    trimmed = trimmed.slice(0, lastSpace);
  }

  return `${addEllipsisStart ? '...' : ''}${trimmed.trim()}${addEllipsisEnd ? '...' : ''}`;
};

/**
 * Creates a text snippet around the first occurrence of the search term
 * 
 * @param {string} text - The full text to extract snippet from
 * @param {string} query - The search term to find
 * @param {number} [maxLength=150] - Maximum length of the snippet
 * @returns {string} Extracted snippet with ellipsis if needed
 * 
 * @example
 * const snippet = createSnippet(
 *   'La ventilación mecánica es un procedimiento médico...',
 *   'ventilación',
 *   100
 * );
 * // Returns: "...La ventilación mecánica es un procedimiento médico..."
 */
export const createSnippet = (text, query, maxLength = 150) => {
  // Handle edge cases
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    // No search term, just return trimmed text
    return smartTrim(text, maxLength, false, text.length > maxLength);
  }

  // Remove extra whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const cleanQuery = query.trim();

  // Find first occurrence (case-insensitive)
  const lowerText = cleanText.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  // If no match found, return start of text
  if (matchIndex === -1) {
    return smartTrim(cleanText, maxLength, false, cleanText.length > maxLength);
  }

  // Calculate context window
  const matchLength = cleanQuery.length;
  const matchCenter = matchIndex + Math.floor(matchLength / 2);
  const halfWindow = Math.floor(maxLength / 2);

  // Determine start and end positions
  let start = Math.max(0, matchCenter - halfWindow);
  let end = Math.min(cleanText.length, matchCenter + halfWindow);

  // Adjust if we're at the beginning or end
  if (start === 0) {
    end = Math.min(cleanText.length, maxLength);
  } else if (end === cleanText.length) {
    start = Math.max(0, cleanText.length - maxLength);
  }

  // Adjust to word boundaries
  if (start > 0) {
    start = findWordBoundary(cleanText, start, 'left');
  }
  if (end < cleanText.length) {
    end = findWordBoundary(cleanText, end, 'right');
  }

  // Extract snippet
  let snippet = cleanText.slice(start, end).trim();

  // Add ellipsis
  const needsStartEllipsis = start > 0;
  const needsEndEllipsis = end < cleanText.length;

  if (needsStartEllipsis) {
    snippet = '...' + snippet;
  }
  if (needsEndEllipsis) {
    snippet = snippet + '...';
  }

  return snippet;
};

/**
 * Default highlight styles
 */
const DEFAULT_HIGHLIGHT_STYLE = {
  fontWeight: 600,
  backgroundColor: 'rgba(255, 193, 7, 0.3)', // warning.light with alpha
  color: 'text.primary',
  px: 0.5,
  borderRadius: 0.5,
  display: 'inline',
};

/**
 * Highlights search terms in text and returns React elements
 * 
 * This function searches for all occurrences of the query term in the text
 * (case-insensitive), extracts a snippet of the specified length around the
 * first occurrence, and returns an array of React elements where matches
 * are wrapped in styled Box components.
 * 
 * @param {string} text - The text to search and highlight in
 * @param {string} query - The search term to highlight
 * @param {number} [maxLength=150] - Maximum length of the snippet to extract
 * @param {Object} [highlightStyle] - Custom styles for highlighted text
 * @returns {React.ReactElement[]} Array of React elements with highlighted matches
 * 
 * @example
 * // Basic usage
 * const highlighted = highlightSearchTerm(
 *   'La ventilación mecánica invasiva es un procedimiento...',
 *   'ventilación'
 * );
 * 
 * @example
 * // With custom styles
 * const highlighted = highlightSearchTerm(
 *   'Principios de ventilación mecánica',
 *   'ventilación',
 *   100,
 *   { fontWeight: 700, color: 'primary.main', backgroundColor: 'transparent' }
 * );
 * 
 * @example
 * // Multi-word query
 * const highlighted = highlightSearchTerm(
 *   'La ventilación mecánica invasiva requiere...',
 *   'ventilación mecánica'
 * );
 * 
 * @example
 * // In JSX
 * <Typography>
 *   {highlightSearchTerm(content, searchQuery)}
 * </Typography>
 */
export const highlightSearchTerm = (
  text,
  query,
  maxLength = 150,
  highlightStyle = DEFAULT_HIGHLIGHT_STYLE
) => {
  // Handle edge cases
  if (!text || typeof text !== 'string') {
    return [];
  }

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    // No search term, just return plain snippet
    const snippet = createSnippet(text, '', maxLength);
    return [<span key="text-0">{snippet}</span>];
  }

  // Create snippet first
  const snippet = createSnippet(text, query, maxLength);
  
  if (!snippet) {
    return [];
  }

  // Prepare query for regex (escape special chars and handle multiple words)
  const cleanQuery = query.trim();
  const escapedQuery = escapeRegex(cleanQuery);
  
  // Create regex for finding all occurrences (case-insensitive, global)
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  // Split text by matches
  const parts = snippet.split(regex);
  
  // If no matches found in snippet, return plain text
  if (parts.length === 1) {
    return [<span key="text-0">{snippet}</span>];
  }

  // Map parts to React elements
  return parts.map((part, index) => {
    // Check if this part matches the query (case-insensitive)
    const isMatch = part.toLowerCase() === cleanQuery.toLowerCase();
    
    if (isMatch) {
      // Highlighted match
      return (
        <Box
          key={`highlight-${index}`}
          component="span"
          sx={highlightStyle}
        >
          {part}
        </Box>
      );
    } else {
      // Regular text
      return <span key={`text-${index}`}>{part}</span>;
    }
  });
};

/**
 * Highlights text using marker syntax (<<term>>)
 * 
 * This is useful when working with pre-marked text from backend services
 * that already indicate which parts should be highlighted.
 * 
 * @param {string} text - Text with markers like "some <<highlighted>> text"
 * @param {Object} [highlightStyle] - Custom styles for highlighted text
 * @returns {React.ReactElement[]} Array of React elements with highlighted matches
 * 
 * @example
 * const marked = "La <<ventilación>> mecánica es importante";
 * const highlighted = highlightMarkedText(marked);
 * 
 * @example
 * // With custom styles
 * const highlighted = highlightMarkedText(
 *   "La <<ventilación>> mecánica",
 *   { backgroundColor: 'primary.light', color: 'primary.contrastText' }
 * );
 */
export const highlightMarkedText = (text, highlightStyle = DEFAULT_HIGHLIGHT_STYLE) => {
  // Handle edge cases
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Split by markers <<term>>
  const parts = text.split(/<<|>>/);
  
  return parts.map((part, index) => {
    // Odd indices are the highlighted terms (between markers)
    if (index % 2 === 1) {
      return (
        <Box
          key={`highlight-${index}`}
          component="span"
          sx={highlightStyle}
        >
          {part}
        </Box>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
};

/**
 * Highlights multiple search terms in text
 * 
 * Useful for highlighting multiple keywords with different styles.
 * 
 * @param {string} text - The text to highlight
 * @param {Array<{term: string, style?: Object}>} terms - Array of terms and their styles
 * @param {number} [maxLength=150] - Maximum length of snippet
 * @returns {React.ReactElement[]} Array of React elements with highlighted matches
 * 
 * @example
 * const highlighted = highlightMultipleTerms(
 *   'La ventilación mecánica invasiva...',
 *   [
 *     { term: 'ventilación', style: { backgroundColor: 'primary.light' } },
 *     { term: 'invasiva', style: { backgroundColor: 'secondary.light' } }
 *   ]
 * );
 */
export const highlightMultipleTerms = (text, terms, maxLength = 150) => {
  // Handle edge cases
  if (!text || typeof text !== 'string' || !Array.isArray(terms) || terms.length === 0) {
    return [<span key="text-0">{text || ''}</span>];
  }

  // Start with the full text (or snippet if first term provides one)
  let workingText = text;
  if (terms[0]?.term) {
    workingText = createSnippet(text, terms[0].term, maxLength);
  }

  // Create a combined regex for all terms
  const escapedTerms = terms
    .filter(t => t.term && typeof t.term === 'string')
    .map(t => escapeRegex(t.term.trim()));
  
  if (escapedTerms.length === 0) {
    return [<span key="text-0">{workingText}</span>];
  }

  const combinedRegex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = workingText.split(combinedRegex);

  return parts.map((part, index) => {
    // Find which term this part matches
    const matchingTerm = terms.find(
      t => t.term && part.toLowerCase() === t.term.toLowerCase()
    );

    if (matchingTerm) {
      const style = matchingTerm.style || DEFAULT_HIGHLIGHT_STYLE;
      return (
        <Box
          key={`highlight-${index}`}
          component="span"
          sx={style}
        >
          {part}
        </Box>
      );
    }

    return <span key={`text-${index}`}>{part}</span>;
  });
};

/**
 * Gets highlighted text as plain string (for non-React contexts)
 * 
 * Returns a string with special markers around highlighted terms.
 * Useful for console logging, testing, or non-React rendering.
 * 
 * @param {string} text - The text to highlight
 * @param {string} query - The search term
 * @param {number} [maxLength=150] - Maximum length of snippet
 * @returns {string} Text with markers like "some **highlighted** text"
 * 
 * @example
 * const plain = getPlainHighlightedText(
 *   'La ventilación mecánica...',
 *   'ventilación'
 * );
 * // Returns: "La **ventilación** mecánica..."
 */
export const getPlainHighlightedText = (text, query, maxLength = 150) => {
  if (!text || !query) {
    return text || '';
  }

  const snippet = createSnippet(text, query, maxLength);
  const escapedQuery = escapeRegex(query.trim());
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  return snippet.replace(regex, '**$1**');
};

/**
 * Checks if text contains the search query
 * 
 * Simple utility for checking if highlighting is needed.
 * 
 * @param {string} text - Text to search in
 * @param {string} query - Search term
 * @returns {boolean} True if text contains query (case-insensitive)
 * 
 * @example
 * if (containsSearchTerm(title, searchQuery)) {
 *   // Apply highlighting
 * }
 */
export const containsSearchTerm = (text, query) => {
  if (!text || !query) {
    return false;
  }

  return text.toLowerCase().includes(query.toLowerCase());
};

/**
 * Counts occurrences of search term in text
 * 
 * @param {string} text - Text to search in
 * @param {string} query - Search term
 * @returns {number} Number of occurrences (case-insensitive)
 * 
 * @example
 * const count = countOccurrences(content, 'ventilación');
 * // Returns: 3
 */
export const countOccurrences = (text, query) => {
  if (!text || !query) {
    return 0;
  }

  const escapedQuery = escapeRegex(query.trim());
  const regex = new RegExp(escapedQuery, 'gi');
  const matches = text.match(regex);
  
  return matches ? matches.length : 0;
};

// Export default object with all functions
export default {
  highlightSearchTerm,
  highlightMarkedText,
  highlightMultipleTerms,
  createSnippet,
  getPlainHighlightedText,
  containsSearchTerm,
  countOccurrences,
};

