/**
 * =============================================================================
 * Search Component Example
 * =============================================================================
 * Example component demonstrating how to use the useSearch hook
 * Includes search input, filters, autocomplete, and results display
 * =============================================================================
 */

import React, { useState } from 'react';
import { useSearch } from '@/hooks/useSearch';

const SearchExample = () => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const {
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

    // Functions
    performSearch,
    fetchSuggestions,
    setFilter,
    clearFilters,
    setSortBy,
    nextPage,
    prevPage,
    goToPage,
    getSearchHistory,
    clearSearchHistory,
    clearResults,
  } = useSearch();

  /**
   * Handle input change - fetch suggestions
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim().length >= 2) {
      fetchSuggestions(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  /**
   * Handle search submission
   */
  const handleSearch = (e) => {
    e.preventDefault();
    if (inputValue.trim().length >= 2) {
      performSearch(inputValue);
      setShowSuggestions(false);
    }
  };

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion.title);
    performSearch(suggestion.title);
    setShowSuggestions(false);
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (filterName, value) => {
    setFilter(filterName, value);
  };

  /**
   * Get search history
   */
  const history = getSearchHistory();

  return (
    <div className="search-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Search Header */}
      <div className="search-header" style={{ marginBottom: '30px' }}>
        <h1>Búsqueda de Contenido - VentiLab</h1>
        <p>Busca módulos y lecciones sobre ventilación mecánica</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <div className="search-input-wrapper" style={{ position: 'relative' }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => inputValue.length >= 2 && setShowSuggestions(true)}
            placeholder="Buscar módulos y lecciones..."
            style={{
              width: '100%',
              padding: '12px 50px 12px 16px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isSearching || inputValue.length < 2}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: inputValue.length >= 2 ? 'pointer' : 'not-allowed',
              opacity: inputValue.length >= 2 ? 1 : 0.6,
            }}
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>

          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="suggestions-dropdown"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                marginTop: '4px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                zIndex: 1000,
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {isFetchingSuggestions && (
                <div style={{ padding: '12px', color: '#666' }}>
                  Cargando sugerencias...
                </div>
              )}
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <div>
                    <div style={{ fontWeight: '500' }}>{suggestion.title}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {suggestion.type === 'module' ? '📚 Módulo' : '📖 Lección'} 
                      {suggestion.additionalInfo.category && ` • ${suggestion.additionalInfo.category}`}
                      {suggestion.additionalInfo.completed !== undefined && (
                        <span style={{ 
                          marginLeft: '8px',
                          color: suggestion.additionalInfo.completed ? '#28a745' : '#6c757d'
                        }}>
                          {suggestion.additionalInfo.completed ? '✓ Completado' : '○ Pendiente'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Search History */}
      {history.length > 0 && !query && (
        <div className="search-history" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>Búsquedas recientes</h3>
            <button
              onClick={clearSearchHistory}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                color: '#dc3545',
                backgroundColor: 'transparent',
                border: '1px solid #dc3545',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Limpiar historial
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {history.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setInputValue(item);
                  performSearch(item);
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '16px',
                  cursor: 'pointer',
                }}
              >
                🕐 {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="filters-section" style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
      }}>
        {/* Category Filter */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Categoría
          </label>
          <select
            value={filters.categories[0] || ''}
            onChange={(e) => handleFilterChange('categories', e.target.value ? [e.target.value] : [])}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="">Todas</option>
            <option value="FUNDAMENTALS">Fundamentos</option>
            <option value="VENTILATION_PRINCIPLES">Principios de Ventilación</option>
            <option value="CLINICAL_APPLICATIONS">Aplicaciones Clínicas</option>
            <option value="ADVANCED_TECHNIQUES">Técnicas Avanzadas</option>
            <option value="TROUBLESHOOTING">Solución de Problemas</option>
            <option value="PATIENT_SAFETY">Seguridad del Paciente</option>
          </select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Dificultad
          </label>
          <select
            value={filters.difficulties[0] || ''}
            onChange={(e) => handleFilterChange('difficulties', e.target.value ? [e.target.value] : [])}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="">Todas</option>
            <option value="BEGINNER">Principiante</option>
            <option value="INTERMEDIATE">Intermedio</option>
            <option value="ADVANCED">Avanzado</option>
          </select>
        </div>

        {/* Duration Filter */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Duración
          </label>
          <select
            value={filters.duration || ''}
            onChange={(e) => handleFilterChange('duration', e.target.value || null)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="">Todas</option>
            <option value="SHORT">Corta (&lt; 15 min)</option>
            <option value="MEDIUM">Media (15-30 min)</option>
            <option value="LONG">Larga (&gt; 30 min)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Estado
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="all">Todos</option>
            <option value="not_started">No iniciado</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Completado</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Ordenar por
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="relevance">Relevancia</option>
            <option value="date">Fecha</option>
            <option value="popularity">Popularidad</option>
            <option value="duration">Duración</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={() => {
              clearFilters();
              if (query) performSearch(query);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="error-message"
          style={{
            padding: '12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {query && (
        <div className="results-section">
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>
              Resultados para "{query}" 
              {pagination.total > 0 && (
                <span style={{ fontWeight: 'normal', color: '#666', fontSize: '16px', marginLeft: '8px' }}>
                  ({pagination.total} resultado{pagination.total !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
            {results.length > 0 && (
              <button
                onClick={clearResults}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  color: '#6c757d',
                  backgroundColor: 'transparent',
                  border: '1px solid #6c757d',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>

          {isSearching ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <div>🔍 Buscando...</div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <div>No se encontraron resultados para tu búsqueda</div>
              <div style={{ marginTop: '8px', fontSize: '14px' }}>
                Intenta con otros términos o ajusta los filtros
              </div>
            </div>
          ) : (
            <>
              {/* Results List */}
              <div className="results-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="result-card"
                    style={{
                      padding: '20px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                    {/* Result Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '20px' }}>
                            {result.type === 'module' ? '📚' : '📖'}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            backgroundColor: result.type === 'module' ? '#e3f2fd' : '#fff3e0',
                            color: result.type === 'module' ? '#1976d2' : '#f57c00',
                            borderRadius: '12px',
                            fontWeight: '500',
                          }}>
                            {result.type === 'module' ? 'Módulo' : 'Lección'}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            backgroundColor: 
                              result.difficulty === 'BEGINNER' ? '#d4edda' :
                              result.difficulty === 'INTERMEDIATE' ? '#fff3cd' : '#f8d7da',
                            color:
                              result.difficulty === 'BEGINNER' ? '#155724' :
                              result.difficulty === 'INTERMEDIATE' ? '#856404' : '#721c24',
                            borderRadius: '12px',
                          }}>
                            {result.difficulty === 'BEGINNER' ? 'Principiante' :
                             result.difficulty === 'INTERMEDIATE' ? 'Intermedio' : 'Avanzado'}
                          </span>
                        </div>
                        <h3 style={{ margin: '8px 0', fontSize: '18px' }}>{result.title}</h3>
                      </div>
                      {result.completedStatus && (
                        <span style={{
                          fontSize: '12px',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          backgroundColor:
                            result.completedStatus === 'completed' ? '#d4edda' :
                            result.completedStatus === 'in_progress' ? '#cce5ff' : '#f8f9fa',
                          color:
                            result.completedStatus === 'completed' ? '#155724' :
                            result.completedStatus === 'in_progress' ? '#004085' : '#6c757d',
                        }}>
                          {result.completedStatus === 'completed' ? '✓ Completado' :
                           result.completedStatus === 'in_progress' ? '⟳ En progreso' : '○ No iniciado'}
                        </span>
                      )}
                    </div>

                    {/* Result Snippet */}
                    <p
                      style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: '8px 0' }}
                      dangerouslySetInnerHTML={{
                        __html: result.snippet.replace(/<<(.+?)>>/g, '<mark style="background-color: #fff3cd; padding: 2px 4px;">$1</mark>')
                      }}
                    />

                    {/* Result Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#666' }}>
                      <span>⏱️ {result.estimatedTime} min</span>
                      {result.parentModule && (
                        <span>📚 {result.parentModule.title}</span>
                      )}
                      {result.category && (
                        <span>🏷️ {result.category}</span>
                      )}
                      <span style={{ marginLeft: 'auto', fontWeight: '500', color: '#007bff' }}>
                        Relevancia: {result.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div
                  className="pagination"
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '24px',
                    padding: '16px',
                  }}
                >
                  <button
                    onClick={prevPage}
                    disabled={pagination.page === 1}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: pagination.page === 1 ? '#e9ecef' : '#007bff',
                      color: pagination.page === 1 ? '#6c757d' : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← Anterior
                  </button>

                  <span style={{ padding: '0 16px', fontSize: '14px', color: '#666' }}>
                    Página {pagination.page} de {pagination.totalPages}
                  </span>

                  <button
                    onClick={nextPage}
                    disabled={pagination.page === pagination.totalPages}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: pagination.page === pagination.totalPages ? '#e9ecef' : '#007bff',
                      color: pagination.page === pagination.totalPages ? '#6c757d' : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchExample;

