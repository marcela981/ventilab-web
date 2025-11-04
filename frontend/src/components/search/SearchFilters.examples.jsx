/**
 * =============================================================================
 * SearchFilters Examples - VentiLab
 * =============================================================================
 * Ejemplos de uso del componente SearchFilters en diferentes contextos
 * =============================================================================
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Paper,
  Divider,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import SearchFilters, { ActiveFiltersChips } from './SearchFilters';

/**
 * Default filters object
 */
const DEFAULT_FILTERS = {
  categories: [],
  difficulties: [],
  duration: null,
  status: 'all',
  type: 'both',
};

/**
 * Example 1: Basic SearchFilters with Auto-Apply
 */
export const BasicSearchFilters = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [totalResults, setTotalResults] = useState(42);

  const setFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    
    // Simular cambio en resultados
    setTotalResults(Math.floor(Math.random() * 100));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setTotalResults(42);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Ejemplo 1: Filtros Básicos con Aplicación Automática
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <SearchFilters
            filters={filters}
            setFilter={setFilter}
            clearFilters={clearFilters}
            totalResults={totalResults}
            isSearching={false}
            autoApply={true}
          />
        </Grid>

        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Área de Resultados
            </Typography>
            
            <ActiveFiltersChips filters={filters} setFilter={setFilter} />
            
            <Typography variant="body2" color="text.secondary">
              Se encontraron {totalResults} resultados.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">
              Los filtros seleccionados son:
            </Typography>
            <pre style={{ fontSize: 12, backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4 }}>
              {JSON.stringify(filters, null, 2)}
            </pre>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

/**
 * Example 2: SearchFilters with Manual Apply
 */
export const ManualApplySearchFilters = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [tempFilters, setTempFilters] = useState(DEFAULT_FILTERS);
  const [totalResults] = useState(42);

  const setTempFilter = (key, value) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    console.log('Filtros aplicados:', tempFilters);
  };

  const clearFilters = () => {
    setTempFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Ejemplo 2: Filtros con Aplicación Manual
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <SearchFilters
            filters={tempFilters}
            setFilter={setTempFilter}
            clearFilters={clearFilters}
            totalResults={totalResults}
            isSearching={false}
            autoApply={false}
            onApplyFilters={handleApplyFilters}
          />
        </Grid>

        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Filtros Aplicados Actualmente
            </Typography>
            
            <ActiveFiltersChips filters={filters} setFilter={setFilter} />
            
            <Divider sx={{ my: 2 }} />
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Filtros temporales (sin aplicar):
                </Typography>
                <pre style={{ fontSize: 12, backgroundColor: '#fff3e0', padding: 12, borderRadius: 4 }}>
                  {JSON.stringify(tempFilters, null, 2)}
                </pre>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Filtros aplicados:
                </Typography>
                <pre style={{ fontSize: 12, backgroundColor: '#e8f5e9', padding: 12, borderRadius: 4 }}>
                  {JSON.stringify(filters, null, 2)}
                </pre>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

/**
 * Example 3: SearchFilters with Loading State
 */
export const SearchFiltersWithLoading = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const setFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    
    // Simular búsqueda
    setIsSearching(true);
    setTimeout(() => {
      setTotalResults(Math.floor(Math.random() * 100));
      setIsSearching(false);
    }, 1500);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setIsSearching(true);
    setTimeout(() => {
      setTotalResults(42);
      setIsSearching(false);
    }, 1500);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Ejemplo 3: Filtros con Estado de Carga
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <SearchFilters
            filters={filters}
            setFilter={setFilter}
            clearFilters={clearFilters}
            totalResults={totalResults}
            isSearching={isSearching}
            autoApply={true}
          />
        </Grid>

        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resultados de Búsqueda
            </Typography>
            
            <ActiveFiltersChips filters={filters} setFilter={setFilter} />
            
            {isSearching ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  🔄 Buscando resultados...
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  ✅ Se encontraron {totalResults} resultados
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Simular cards de resultados */}
                {[1, 2, 3].map((i) => (
                  <Card key={i} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6">
                        Resultado de Ejemplo #{i}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Este es un resultado de ejemplo que coincide con los filtros seleccionados.
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

/**
 * Example 4: Pre-selected Filters
 */
export const PreSelectedFilters = () => {
  const [filters, setFilters] = useState({
    categories: ['FUNDAMENTALS', 'VENTILATION_PRINCIPLES'],
    difficulties: ['BEGINNER'],
    duration: 'SHORT',
    status: 'not_started',
    type: 'lesson',
  });
  const [totalResults] = useState(15);

  const setFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Ejemplo 4: Filtros Pre-seleccionados
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Este ejemplo muestra cómo inicializar el componente con filtros ya aplicados,
        útil para enlaces directos o flujos de navegación específicos.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <SearchFilters
            filters={filters}
            setFilter={setFilter}
            clearFilters={clearFilters}
            totalResults={totalResults}
            isSearching={false}
            autoApply={true}
          />
        </Grid>

        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Lecciones Cortas para Principiantes
            </Typography>
            
            <ActiveFiltersChips filters={filters} setFilter={setFilter} />
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Mostrando {totalResults} lecciones que coinciden con:
            </Typography>
            
            <ul style={{ fontSize: 14 }}>
              <li>Categorías: Fundamentos y Principios de Ventilación</li>
              <li>Nivel: Principiante</li>
              <li>Duración: Corta (menos de 15 minutos)</li>
              <li>Estado: No iniciadas</li>
              <li>Tipo: Solo lecciones</li>
            </ul>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

/**
 * Example 5: ActiveFiltersChips Only
 */
export const ActiveFiltersChipsExample = () => {
  const [filters, setFilters] = useState({
    categories: ['FUNDAMENTALS'],
    difficulties: ['BEGINNER', 'INTERMEDIATE'],
    duration: 'MEDIUM',
    status: 'in_progress',
    type: 'both',
  });

  const setFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Ejemplo 5: ActiveFiltersChips Standalone
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Los chips de filtros activos pueden usarse de forma independiente en cualquier
        parte de la interfaz donde necesites mostrar los filtros aplicados.
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtros Aplicados
        </Typography>
        
        <ActiveFiltersChips filters={filters} setFilter={setFilter} />
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="body2" color="text.secondary">
          Haz clic en la X de cualquier chip para removerlo.
        </Typography>
      </Paper>
    </Container>
  );
};

/**
 * All Examples Combined
 */
export const AllSearchFiltersExamples = () => {
  const [currentExample, setCurrentExample] = useState(0);

  const examples = [
    { component: BasicSearchFilters, name: 'Básico con Auto-Apply' },
    { component: ManualApplySearchFilters, name: 'Aplicación Manual' },
    { component: SearchFiltersWithLoading, name: 'Con Estado de Carga' },
    { component: PreSelectedFilters, name: 'Filtros Pre-seleccionados' },
    { component: ActiveFiltersChipsExample, name: 'ActiveFiltersChips Solo' },
  ];

  const CurrentExampleComponent = examples[currentExample].component;

  return (
    <Box sx={{ py: 4 }}>
      {/* Navigation */}
      <Container maxWidth="lg">
        <Typography variant="h3" gutterBottom>
          SearchFilters - Ejemplos de Uso
        </Typography>
        
        <Stack direction="row" spacing={1} sx={{ mb: 4, flexWrap: 'wrap', gap: 1 }}>
          {examples.map((example, index) => (
            <Box
              key={index}
              onClick={() => setCurrentExample(index)}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 1,
                cursor: 'pointer',
                backgroundColor: currentExample === index ? 'primary.main' : 'grey.200',
                color: currentExample === index ? 'white' : 'text.primary',
                '&:hover': {
                  backgroundColor: currentExample === index ? 'primary.dark' : 'grey.300',
                },
                transition: 'all 0.2s',
              }}
            >
              <Typography variant="body2" fontWeight={currentExample === index ? 600 : 400}>
                {index + 1}. {example.name}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Container>

      <Divider sx={{ mb: 4 }} />

      {/* Current Example */}
      <CurrentExampleComponent />
    </Box>
  );
};

export default AllSearchFiltersExamples;

