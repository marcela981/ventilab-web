import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
  styled,
  alpha,
} from '@mui/material';
import {
  Article as ArticleIcon,
  Image as ImageIcon,
  PlayCircle as PlayCircleIcon,
  Quiz as QuizIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

/**
 * NavigationContainer - Contenedor sticky para el menú de navegación
 */
const NavigationContainer = styled(Paper)(({ theme }) => ({
  position: 'sticky',
  top: theme.spacing(2),
  maxHeight: `calc(100vh - ${theme.spacing(4)})`,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: 'rgba(33, 150, 243, 0.15)', // Mismo color que Mis notas
  border: '1px solid rgba(33, 150, 243, 0.3)',
  borderRadius: 2,
  boxShadow: 'none',
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}));

/**
 * NavigationHeader - Encabezado del menú
 */
const NavigationHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: 'transparent',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
}));

/**
 * ScrollableList - Lista con scroll interno
 */
const ScrollableList = styled(List)(({ theme }) => ({
  overflowY: 'auto',
  overflowX: 'hidden',
  flex: 1,
  padding: theme.spacing(1),
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.divider,
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
}));

/**
 * StyledListItemButton - ListItemButton personalizado
 */
const StyledListItemButton = styled(ListItemButton)(({ theme, iscurrent, iscompleted }) => {
  const isCurrentBool = iscurrent === 'true';
  const isCompletedBool = iscompleted === 'true';

  return {
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(0.5),
    transition: 'all 0.3s ease',
    backgroundColor: isCurrentBool ? 'rgba(144, 202, 249, 0.3)' : 'transparent',
    borderLeft: isCurrentBool ? `4px solid #90CAF9` : '4px solid transparent',
    paddingLeft: theme.spacing(1.5),
    
    '&:hover': {
      backgroundColor: isCurrentBool 
        ? 'rgba(144, 202, 249, 0.4)'
        : 'rgba(144, 202, 249, 0.2)',
      transform: 'translateX(4px)',
    },

    '& .MuiListItemIcon-root': {
      color: isCurrentBool ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
      minWidth: 40,
    },

    '& .MuiListItemText-primary': {
      fontWeight: isCurrentBool ? 600 : 400,
      color: isCurrentBool ? theme.palette.primary.main : theme.palette.text.primary,
      fontSize: '0.875rem',
    },
  };
});

/**
 * MobileMenuButton - Botón flotante para abrir menú en móvil
 */
const MobileMenuButton = styled(IconButton)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  boxShadow: theme.shadows[6],
  zIndex: theme.zIndex.speedDial,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
}));

/**
 * Obtiene el icono apropiado según el tipo de sección
 * @param {string} type - Tipo de sección
 * @returns {JSX.Element} - Componente de icono
 */
const getSectionIcon = (type) => {
  const icons = {
    text: ArticleIcon,
    image: ImageIcon,
    video: PlayCircleIcon,
    quiz: QuizIcon,
    diagram: TimelineIcon,
    article: ArticleIcon,
    default: ArticleIcon,
  };

  const IconComponent = icons[type?.toLowerCase()] || icons.default;
  return <IconComponent />;
};

/**
 * SectionNavigation - Componente de navegación lateral para secciones de lección.
 * 
 * Proporciona un menú de navegación vertical sticky que permite a los usuarios
 * navegar fácilmente entre las diferentes secciones de una lección. Incluye
 * indicadores visuales para la sección actual y completadas, iconos por tipo,
 * navegación por teclado y diseño responsive con drawer en móvil.
 * 
 * @component
 * @example
 * ```jsx
 * const sections = [
 *   { id: '1', title: 'Introducción', type: 'text', completed: true },
 *   { id: '2', title: 'Video Explicativo', type: 'video', completed: true },
 *   { id: '3', title: 'Diagrama Interactivo', type: 'diagram', completed: false },
 *   { id: '4', title: 'Evaluación', type: 'quiz', completed: false }
 * ];
 * 
 * <SectionNavigation
 *   sections={sections}
 *   currentSection={2}
 *   onSectionClick={(index) => scrollToSection(index)}
 * />
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.sections - Array de secciones con id, title, type y completed
 * @param {number} props.currentSection - Índice de la sección actual (0-based)
 * @param {Function} props.onSectionClick - Callback al hacer click en una sección
 */
const SectionNavigation = ({ sections, currentSection, onSectionClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(currentSection);
  const listRef = useRef(null);

  // Sincronizar focusedIndex con currentSection
  useEffect(() => {
    setFocusedIndex(currentSection);
  }, [currentSection]);

  /**
   * Maneja el click en una sección
   * @param {number} index - Índice de la sección
   */
  const handleSectionClick = useCallback((index) => {
    if (onSectionClick && typeof onSectionClick === 'function') {
      onSectionClick(index);
    }
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [onSectionClick, isMobile]);

  /**
   * Maneja la navegación por teclado
   * @param {Object} event - Evento del teclado
   */
  const handleKeyDown = useCallback((event) => {
    if (!sections || sections.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < sections.length - 1 ? prev + 1 : prev;
          return next;
        });
        break;

      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : prev;
          return next;
        });
        break;

      case 'Enter':
        event.preventDefault();
        handleSectionClick(focusedIndex);
        break;

      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        event.preventDefault();
        setFocusedIndex(sections.length - 1);
        break;

      default:
        break;
    }
  }, [sections, focusedIndex, handleSectionClick]);

  /**
   * Abre el drawer en móvil
   */
  const handleOpenDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  /**
   * Cierra el drawer en móvil
   */
  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Validación básica
  if (!sections || sections.length === 0) {
    return null;
  }

  /**
   * Renderiza el contenido del menú de navegación
   */
  const renderNavigationContent = () => (
    <>
      <NavigationHeader>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2" sx={{ color: '#ffffff', fontWeight: 600 }}>
            Contenido de la Lección
          </Typography>
          {isMobile && (
            <IconButton
              size="small"
              onClick={handleCloseDrawer}
              sx={{ color: '#ffffff' }}
              aria-label="Cerrar menú"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
        <Typography variant="caption" sx={{ color: '#ffffff', display: 'block', mt: 0.5, opacity: 0.8 }}>
          {sections.length} {sections.length === 1 ? 'sección' : 'secciones'}
        </Typography>
      </NavigationHeader>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      <ScrollableList
        ref={listRef}
        onKeyDown={handleKeyDown}
        role="navigation"
        aria-label="Navegación de secciones"
      >
        {sections.map((section, index) => {
          const isCurrent = index === currentSection;
          const isFocused = index === focusedIndex;
          const isCompleted = section.completed || false;

          return (
            <StyledListItemButton
              key={section.id || index}
              onClick={() => handleSectionClick(index)}
              iscurrent={isCurrent.toString()}
              iscompleted={isCompleted.toString()}
              selected={isFocused}
              tabIndex={isFocused ? 0 : -1}
              aria-current={isCurrent ? 'true' : 'false'}
              aria-label={`${section.title}${isCurrent ? ' (actual)' : ''}${isCompleted ? ' (completada)' : ''}`}
            >
              <ListItemIcon>
                {isCompleted && !isCurrent ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  getSectionIcon(section.type)
                )}
              </ListItemIcon>

              <ListItemText
                primary={section.title}
                primaryTypographyProps={{
                  sx: {
                    color: '#ffffff',
                    fontWeight: isCurrent ? 600 : 400,
                  }
                }}
                secondary={isCompleted && !isCurrent ? 'Completada' : null}
                secondaryTypographyProps={{
                  variant: 'caption',
                  sx: { color: '#ffffff', opacity: 0.7 },
                }}
              />
            </StyledListItemButton>
          );
        })}
      </ScrollableList>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
        <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8 }} display="block" gutterBottom>
          Usa ↑↓ para navegar, Enter para seleccionar
        </Typography>
        <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8 }}>
          Sección {currentSection + 1} de {sections.length}
        </Typography>
      </Box>
    </>
  );

  return (
    <>
      {/* Navegación desktop (sticky sidebar) */}
      <NavigationContainer elevation={1} role="complementary">
        {renderNavigationContent()}
      </NavigationContainer>

      {/* Botón flotante para móvil */}
      <MobileMenuButton
        onClick={handleOpenDrawer}
        size="large"
        aria-label="Abrir menú de navegación"
      >
        <MenuIcon />
      </MobileMenuButton>

      {/* Drawer para móvil */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        sx={{
          '& .MuiDrawer-paper': {
            width: '80%',
            maxWidth: 320,
          },
        }}
      >
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {renderNavigationContent()}
        </Box>
      </Drawer>
    </>
  );
};

SectionNavigation.propTypes = {
  /**
   * Array de secciones de la lección
   */
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      /**
       * ID único de la sección
       */
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,

      /**
       * Título de la sección
       */
      title: PropTypes.string.isRequired,

      /**
       * Tipo de sección para mostrar el icono apropiado
       * Opciones: 'text', 'image', 'video', 'quiz', 'diagram', 'article'
       */
      type: PropTypes.oneOf(['text', 'image', 'video', 'quiz', 'diagram', 'article']).isRequired,

      /**
       * Indica si la sección está completada
       */
      completed: PropTypes.bool,
    })
  ).isRequired,

  /**
   * Índice de la sección actual (0-based)
   */
  currentSection: PropTypes.number.isRequired,

  /**
   * Callback ejecutado cuando se hace click en una sección.
   * Recibe el índice de la sección como parámetro.
   */
  onSectionClick: PropTypes.func.isRequired,
};

export default SectionNavigation;

