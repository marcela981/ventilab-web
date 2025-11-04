/**
 * =============================================================================
 * SearchBar Examples
 * =============================================================================
 * Example implementations of the SearchBar component
 * =============================================================================
 */

import React from 'react';
import { Box, Container, Typography, Paper, AppBar, Toolbar } from '@mui/material';
import SearchBar from './SearchBar';

/**
 * Example 1: Basic Search Bar
 */
export const BasicSearchBar = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Basic Search Bar
      </Typography>
      <SearchBar />
    </Container>
  );
};

/**
 * Example 2: Search Bar in App Bar (Global Navigation)
 */
export const AppBarSearchBar = () => {
  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 0 }}>
          VentiLab
        </Typography>
        
        <Box sx={{ flexGrow: 1, maxWidth: 600 }}>
          <SearchBar placeholder="Buscar en VentiLab..." />
        </Box>
        
        <Typography variant="body2">Usuario</Typography>
      </Toolbar>
    </AppBar>
  );
};

/**
 * Example 3: Search Bar with Custom Handler
 */
export const SearchBarWithCustomHandler = () => {
  const handleNavigate = (selectedItem, path) => {
    console.log('Navigating to:', selectedItem);
    console.log('Path:', path);
    
    // You can add custom logic here
    // For example, track analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'search_select', {
        search_term: selectedItem.title,
        content_type: selectedItem.type,
      });
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Search Bar with Custom Navigation Handler
      </Typography>
      <SearchBar 
        onNavigate={handleNavigate}
        placeholder="Buscar con tracking personalizado..."
      />
    </Container>
  );
};

/**
 * Example 4: Search Bar in Centered Layout
 */
export const CenteredSearchBar = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 3,
      }}
    >
      <Typography variant="h3" component="h1" gutterBottom>
        Buscar en VentiLab
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Encuentra lecciones y módulos de ventilación mecánica
      </Typography>
      <SearchBar 
        placeholder="¿Qué quieres aprender hoy?"
        sx={{ width: '100%', maxWidth: 700 }}
      />
    </Box>
  );
};

/**
 * Example 5: Search Bar in Sidebar
 */
export const SidebarSearchBar = () => {
  return (
    <Paper
      sx={{
        width: 280,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="h6">Navegación</Typography>
      
      <SearchBar 
        placeholder="Buscar..."
        maxSuggestions={3}
        sx={{ width: '100%' }}
      />
      
      <Typography variant="body2" color="text.secondary">
        Menú
      </Typography>
      {/* Other sidebar content */}
    </Paper>
  );
};

/**
 * Example 6: Search Bar without Keyboard Shortcut
 */
export const SearchBarNoShortcut = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Search Bar (Sin atajo de teclado)
      </Typography>
      <SearchBar 
        enableShortcut={false}
        placeholder="Búsqueda sin Ctrl+K..."
      />
    </Container>
  );
};

/**
 * Example 7: Multiple Search Bars (Different Contexts)
 */
export const MultipleSearchBars = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Múltiples Barras de Búsqueda
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mt: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Búsqueda Global
          </Typography>
          <SearchBar 
            placeholder="Buscar en toda la plataforma..."
            maxSuggestions={5}
          />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Búsqueda de Módulos
          </Typography>
          <SearchBar 
            placeholder="Buscar solo módulos..."
            maxSuggestions={3}
            enableShortcut={false}
          />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Búsqueda Rápida
          </Typography>
          <SearchBar 
            placeholder="Búsqueda rápida..."
            maxSuggestions={3}
            enableShortcut={false}
          />
        </Paper>
      </Box>
    </Container>
  );
};

/**
 * Example 8: Search Bar in Dashboard
 */
export const DashboardSearchBar = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Typography variant="h4">Dashboard</Typography>
        
        <SearchBar 
          placeholder="Buscar contenido..."
          sx={{ width: 400 }}
        />
      </Box>
      
      <Typography variant="body1" color="text.secondary">
        Contenido del dashboard...
      </Typography>
    </Box>
  );
};

/**
 * All Examples Component
 */
const SearchBarExamples = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        SearchBar Examples
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6, mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <BasicSearchBar />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <AppBarSearchBar />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <SearchBarWithCustomHandler />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <CenteredSearchBar />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <SidebarSearchBar />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <SearchBarNoShortcut />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <MultipleSearchBars />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <DashboardSearchBar />
        </Paper>
      </Box>
    </Container>
  );
};

export default SearchBarExamples;

