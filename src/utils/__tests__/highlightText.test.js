/**
 * =============================================================================
 * highlightText Utility Tests
 * =============================================================================
 * Test suite for text highlighting and snippet utilities
 * =============================================================================
 */

import React from 'react';
import {
  highlightSearchTerm,
  highlightMarkedText,
  highlightMultipleTerms,
  createSnippet,
  getPlainHighlightedText,
  containsSearchTerm,
  countOccurrences,
} from '../highlightText';

describe('highlightText utilities', () => {
  describe('createSnippet', () => {
    test('returns empty string for null or undefined text', () => {
      expect(createSnippet(null, 'test')).toBe('');
      expect(createSnippet(undefined, 'test')).toBe('');
      expect(createSnippet('', 'test')).toBe('');
    });

    test('returns trimmed text when no query provided', () => {
      const text = 'This is a short text.';
      expect(createSnippet(text, '')).toBe(text);
      expect(createSnippet(text, null)).toBe(text);
    });

    test('returns full text when shorter than maxLength', () => {
      const text = 'Short text';
      expect(createSnippet(text, 'text', 100)).toBe(text);
    });

    test('creates snippet around first occurrence of query', () => {
      const text = 'La ventilación mecánica invasiva es un procedimiento médico que ayuda a los pacientes a respirar.';
      const snippet = createSnippet(text, 'ventilación', 50);
      
      expect(snippet).toContain('ventilación');
      expect(snippet.length).toBeLessThanOrEqual(60); // Allow some margin for ellipsis
      expect(snippet).toMatch(/\.\.\./); // Should have ellipsis
    });

    test('does not cut words in the middle', () => {
      const text = 'La ventilación mecánica invasiva es un procedimiento médico.';
      const snippet = createSnippet(text, 'ventilación', 30);
      
      // Check that we don't have partial words
      const words = snippet.replace(/\.\.\./g, '').trim().split(' ');
      words.forEach(word => {
        // Each word should be complete (no truncation in the middle)
        expect(word.length).toBeGreaterThan(1);
      });
    });

    test('adds ellipsis at start when snippet is from middle', () => {
      const text = 'Inicio del texto. La ventilación mecánica invasiva es importante. Final del texto.';
      const snippet = createSnippet(text, 'ventilación', 40);
      
      expect(snippet).toMatch(/^\.\.\./);
    });

    test('adds ellipsis at end when snippet is from start', () => {
      const text = 'La ventilación mecánica invasiva es un procedimiento médico muy importante.';
      const snippet = createSnippet(text, 'ventilación', 30);
      
      expect(snippet).toMatch(/\.\.\.$/);
    });

    test('handles query at the beginning of text', () => {
      const text = 'Ventilación mecánica es importante para los pacientes críticos.';
      const snippet = createSnippet(text, 'ventilación', 40);
      
      expect(snippet).not.toMatch(/^\.\.\./);
      expect(snippet).toMatch(/\.\.\.$/);
    });

    test('handles query at the end of text', () => {
      const text = 'Los pacientes críticos necesitan ventilación mecánica.';
      const snippet = createSnippet(text, 'ventilación', 40);
      
      expect(snippet).toContain('ventilación');
    });

    test('is case-insensitive', () => {
      const text = 'La VENTILACIÓN mecánica es importante.';
      const snippet = createSnippet(text, 'ventilación', 50);
      
      expect(snippet).toContain('VENTILACIÓN');
    });

    test('handles multiple spaces in text', () => {
      const text = 'La    ventilación    mecánica    es    importante.';
      const snippet = createSnippet(text, 'ventilación', 50);
      
      expect(snippet).not.toMatch(/\s{2,}/); // Should normalize spaces
      expect(snippet).toContain('ventilación');
    });

    test('returns beginning when query not found', () => {
      const text = 'La ventilación mecánica es importante para los pacientes críticos.';
      const snippet = createSnippet(text, 'xyz123', 30);
      
      expect(snippet).toBe('La ventilación mecánica es...');
    });
  });

  describe('highlightSearchTerm', () => {
    test('returns empty array for null or undefined text', () => {
      expect(highlightSearchTerm(null, 'test')).toEqual([]);
      expect(highlightSearchTerm(undefined, 'test')).toEqual([]);
    });

    test('returns plain text when query is empty', () => {
      const text = 'Test text';
      const result = highlightSearchTerm(text, '');
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('span');
    });

    test('highlights single occurrence', () => {
      const text = 'La ventilación mecánica es importante.';
      const result = highlightSearchTerm(text, 'ventilación', 100);
      
      // Should have multiple parts (text before, highlight, text after)
      expect(result.length).toBeGreaterThan(1);
      
      // Check that one part is highlighted (Box component)
      const highlighted = result.find(el => el.type?.render?.displayName === 'Box' || el.props?.sx);
      expect(highlighted).toBeDefined();
    });

    test('is case-insensitive', () => {
      const text = 'La VENTILACIÓN mecánica.';
      const result = highlightSearchTerm(text, 'ventilación', 100);
      
      expect(result.length).toBeGreaterThan(1);
    });

    test('handles multiple occurrences', () => {
      const text = 'La ventilación mecánica y la ventilación manual.';
      const result = highlightSearchTerm(text, 'ventilación', 100);
      
      // Count highlighted elements
      const highlightedCount = result.filter(
        el => el.type?.render?.displayName === 'Box' || el.props?.sx
      ).length;
      
      expect(highlightedCount).toBe(2);
    });

    test('handles multi-word queries', () => {
      const text = 'La ventilación mecánica invasiva es importante.';
      const result = highlightSearchTerm(text, 'ventilación mecánica', 100);
      
      expect(result.length).toBeGreaterThan(1);
    });

    test('applies custom highlight styles', () => {
      const text = 'La ventilación mecánica.';
      const customStyle = { fontWeight: 700, color: 'red' };
      const result = highlightSearchTerm(text, 'ventilación', 100, customStyle);
      
      const highlighted = result.find(el => el.props?.sx);
      expect(highlighted.props.sx).toEqual(customStyle);
    });

    test('handles special regex characters in query', () => {
      const text = 'Price is $100 (approx.)';
      const result = highlightSearchTerm(text, '$100', 100);
      
      expect(result.length).toBeGreaterThan(1);
    });

    test('creates snippet when text is long', () => {
      const longText = 'A'.repeat(200) + ' ventilación ' + 'B'.repeat(200);
      const result = highlightSearchTerm(longText, 'ventilación', 50);
      
      // Should create a snippet, not process entire text
      const fullText = result.map(el => 
        typeof el === 'string' ? el : el.props?.children
      ).join('');
      
      expect(fullText.length).toBeLessThan(longText.length);
      expect(fullText).toContain('...');
    });
  });

  describe('highlightMarkedText', () => {
    test('returns empty array for null text', () => {
      expect(highlightMarkedText(null)).toEqual([]);
    });

    test('highlights marked terms', () => {
      const text = 'La <<ventilación>> mecánica es <<importante>>.';
      const result = highlightMarkedText(text);
      
      // Should have 5 parts: text, highlight, text, highlight, text
      expect(result.length).toBe(5);
      
      // Count highlighted elements
      const highlightedCount = result.filter(
        el => el.type?.render?.displayName === 'Box' || el.props?.sx
      ).length;
      
      expect(highlightedCount).toBe(2);
    });

    test('handles text without markers', () => {
      const text = 'Plain text without markers.';
      const result = highlightMarkedText(text);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('span');
    });

    test('applies custom styles to marked text', () => {
      const text = 'Some <<highlighted>> text.';
      const customStyle = { backgroundColor: 'yellow' };
      const result = highlightMarkedText(text, customStyle);
      
      const highlighted = result.find(el => el.props?.sx);
      expect(highlighted.props.sx).toEqual(customStyle);
    });
  });

  describe('highlightMultipleTerms', () => {
    test('highlights multiple different terms', () => {
      const text = 'La ventilación mecánica invasiva es importante.';
      const terms = [
        { term: 'ventilación', style: { color: 'blue' } },
        { term: 'invasiva', style: { color: 'red' } },
      ];
      const result = highlightMultipleTerms(text, terms);
      
      expect(result.length).toBeGreaterThan(2);
    });

    test('returns plain text when no terms provided', () => {
      const text = 'Some text';
      const result = highlightMultipleTerms(text, []);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('span');
    });

    test('handles overlapping term matches', () => {
      const text = 'ventilación mecánica invasiva';
      const terms = [
        { term: 'ventilación mecánica' },
        { term: 'mecánica invasiva' },
      ];
      
      // Should handle gracefully without throwing
      expect(() => highlightMultipleTerms(text, terms)).not.toThrow();
    });
  });

  describe('getPlainHighlightedText', () => {
    test('returns empty string for null text', () => {
      expect(getPlainHighlightedText(null, 'test')).toBe('');
    });

    test('wraps matched terms with markers', () => {
      const text = 'La ventilación mecánica es importante.';
      const result = getPlainHighlightedText(text, 'ventilación');
      
      expect(result).toContain('**ventilación**');
    });

    test('handles multiple occurrences', () => {
      const text = 'ventilación y ventilación';
      const result = getPlainHighlightedText(text, 'ventilación', 100);
      
      const matches = result.match(/\*\*ventilación\*\*/g);
      expect(matches).toHaveLength(2);
    });

    test('is case-insensitive', () => {
      const text = 'La VENTILACIÓN mecánica.';
      const result = getPlainHighlightedText(text, 'ventilación');
      
      expect(result).toContain('**VENTILACIÓN**');
    });
  });

  describe('containsSearchTerm', () => {
    test('returns false for null or empty inputs', () => {
      expect(containsSearchTerm(null, 'test')).toBe(false);
      expect(containsSearchTerm('test', null)).toBe(false);
      expect(containsSearchTerm('', '')).toBe(false);
    });

    test('returns true when text contains query', () => {
      expect(containsSearchTerm('La ventilación mecánica', 'ventilación')).toBe(true);
    });

    test('returns false when text does not contain query', () => {
      expect(containsSearchTerm('La ventilación mecánica', 'xyz')).toBe(false);
    });

    test('is case-insensitive', () => {
      expect(containsSearchTerm('La VENTILACIÓN', 'ventilación')).toBe(true);
      expect(containsSearchTerm('La ventilación', 'VENTILACIÓN')).toBe(true);
    });
  });

  describe('countOccurrences', () => {
    test('returns 0 for null or empty inputs', () => {
      expect(countOccurrences(null, 'test')).toBe(0);
      expect(countOccurrences('test', null)).toBe(0);
      expect(countOccurrences('', '')).toBe(0);
    });

    test('counts single occurrence', () => {
      expect(countOccurrences('La ventilación mecánica', 'ventilación')).toBe(1);
    });

    test('counts multiple occurrences', () => {
      const text = 'ventilación y ventilación y ventilación';
      expect(countOccurrences(text, 'ventilación')).toBe(3);
    });

    test('is case-insensitive', () => {
      const text = 'Ventilación y VENTILACIÓN';
      expect(countOccurrences(text, 'ventilación')).toBe(2);
    });

    test('handles special regex characters', () => {
      const text = 'Price $100 and $100 again';
      expect(countOccurrences(text, '$100')).toBe(2);
    });
  });

  describe('edge cases', () => {
    test('handles very short text', () => {
      expect(createSnippet('Hi', 'Hi', 10)).toBe('Hi');
      expect(highlightSearchTerm('Hi', 'Hi', 10)).toHaveLength(1);
    });

    test('handles very long query', () => {
      const longQuery = 'A'.repeat(100);
      const text = 'Some text ' + longQuery + ' more text';
      
      expect(() => createSnippet(text, longQuery, 50)).not.toThrow();
      expect(() => highlightSearchTerm(text, longQuery, 50)).not.toThrow();
    });

    test('handles text with only whitespace', () => {
      expect(createSnippet('   ', 'test')).toBe('');
      expect(highlightSearchTerm('   ', 'test')).toEqual([]);
    });

    test('handles query with special characters', () => {
      const text = 'Use (parentheses) and [brackets] in text.';
      
      expect(() => createSnippet(text, '(parentheses)', 100)).not.toThrow();
      expect(() => highlightSearchTerm(text, '[brackets]', 100)).not.toThrow();
    });

    test('handles unicode characters', () => {
      const text = 'Ventilación mecánica invasiva con parámetros específicos.';
      const result = highlightSearchTerm(text, 'parámetros', 100);
      
      expect(result.length).toBeGreaterThan(1);
    });

    test('handles emojis', () => {
      const text = 'Important! 🚨 ventilación mecánica 🏥';
      const result = highlightSearchTerm(text, 'ventilación', 100);
      
      expect(result.length).toBeGreaterThan(1);
    });

    test('handles numbers in query', () => {
      const text = 'The value is 123 and another 456.';
      const result = highlightSearchTerm(text, '123', 100);
      
      expect(result.length).toBeGreaterThan(1);
    });
  });
});

