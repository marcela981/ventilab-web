/**
 * =============================================================================
 * ModuleCategoryNav Component for VentyLab
 * =============================================================================
 * 
 * Navigation component for modules with subcategories (like module-03-configuration).
 * Supports both tabs (desktop) and accordion (mobile) navigation patterns.
 * 
 * Features:
 * - Tabs navigation for desktop/tablet
 * - Accordion navigation for mobile (automatic switch)
 * - Category-based lesson organization
 * - Progress tracking per category
 * - Visual indicators for lesson types
 * - Completion status indicators
 * - Smooth animations
 * - Lazy loading support
 * 
 * @component
 * @example
 * ```jsx
 * <ModuleCategoryNav
 *   moduleId="module-03-configuration"
 *   categories={[
 *     {
 *       id: 'pathologyProtocols',
 *       title: 'Protocolos por Patología',
 *       description: 'Protocolos específicos para diferentes patologías',
 *       icon: <MedicalServices />,
 *       color: '#e53935',
 *       lessons: [
 *         { id: 'sdra-protocol', title: 'Protocolo SDRA', estimatedTime: 45 },
 *         { id: 'copd-protocol', title: 'Protocolo EPOC', estimatedTime: 40 }
 *       ]
 *     }
 *   ]}
 *   currentCategory="pathologyProtocols"
 *   currentLesson="sdra-protocol"
 *   onCategoryChange={(categoryId) => console.log('Category changed:', categoryId)}
 *   onLessonClick={(lessonId, categoryId) => console.log('Lesson clicked:', lessonId)}
 * />
 * ```
 * 
 * @param {Object} props - Component props
 * @param {string} props.moduleId - Current module ID
 * @param {Array} props.categories - Array of category objects
 * @param {string} props.categories[].id - Category ID
 * @param {string} props.categories[].title - Category title
 * @param {string} [props.categories[].description] - Category description
 * @param {React.ReactNode} [props.categories[].icon] - Material UI icon component
 * @param {string} [props.categories[].color] - Theme color for category
 * @param {Array} props.categories[].lessons - Array of lessons in category
 * @param {string} props.categories[].lessons[].id - Lesson ID
 * @param {string} props.categories[].lessons[].title - Lesson title
 * @param {number} [props.categories[].lessons[].estimatedTime] - Estimated time in minutes
 * @param {string} [props.categories[].lessons[].type] - Lesson type (quiz, case, protocol, theory)
 * @param {string} [props.currentCategory] - Currently active category ID
 * @param {string} [props.currentLesson] - Currently active lesson ID
 * @param {Function} [props.onCategoryChange] - Callback when category changes
 * @param {Function} [props.onLessonClick] - Callback when lesson is clicked
 * @param {string} [props.variant] - 'tabs' or 'accordion' (auto-detected on mobile)
 */

import React, { useState, useMemo, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  LinearProgress,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Collapse,
  alpha,
  styled,
} from '@mui/material';
import {
  MedicalServices as MedicalServicesIcon,
  Shield as ShieldIcon,
  TrendingUp as TrendingUpIcon,
  Build as BuildIcon,
  ChecklistRtl as ChecklistIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  PlayCircle as PlayCircleIcon,
  Quiz as QuizIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import useTeachingModule from '@/features/teaching/hooks/useTeachingModule';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';

/**
 * CategoryIcon - Wrapper for category icons with consistent styling
 */
const CategoryIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: theme.spacing(1),
}));

/**
 * StyledTab - Custom styled tab with icon support
 */
const StyledTab = styled(Tab)(({ theme, categorycolor }) => ({
  minHeight: 64,
  textTransform: 'none',
  fontSize: '0.95rem',
  fontWeight: 500,
  '&.Mui-selected': {
    color: categorycolor || theme.palette.primary.main,
    fontWeight: 600,
  },
}));

/**
 * StyledAccordion - Custom styled accordion
 */
const StyledAccordion = styled(Accordion)(({ theme, isactive, categorycolor }) => ({
  marginBottom: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  '&:before': {
    display: 'none',
  },
  boxShadow: isactive ? `0 2px 8px ${alpha(categorycolor || theme.palette.primary.main, 0.2)}` : theme.shadows[1],
  border: isactive ? `1px solid ${categorycolor || theme.palette.primary.main}` : '1px solid transparent',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[2],
  },
}));

/**
 * LessonListItem - Styled list item for lessons
 */
const LessonListItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'isactive' && prop !== 'iscompleted',
})(({ theme, isactive, iscompleted }) => ({
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(0.5),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  borderLeft: isactive ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
  backgroundColor: isactive 
    ? alpha(theme.palette.primary.main, 0.08)
    : 'transparent',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: isactive
      ? alpha(theme.palette.primary.main, 0.12)
      : alpha(theme.palette.action.hover, 0.04),
    borderLeftColor: isactive ? theme.palette.primary.main : theme.palette.divider,
  },
  opacity: iscompleted ? 0.7 : 1,
}));

/**
 * ProgressIndicator - Small progress indicator for categories
 */
const ProgressIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

/**
 * ModuleCategoryNav Component
 */
const ModuleCategoryNav = ({
  moduleId,
  categories = [],
  currentCategory = null,
  currentLesson = null,
  onCategoryChange,
  onLessonClick,
  variant = null, // null = auto-detect
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  
  // Auto-detect variant if not provided
  const effectiveVariant = useMemo(() => {
    if (variant) return variant;
    return isMobile ? 'accordion' : 'tabs';
  }, [variant, isMobile]);

  // Teaching module context
  const {
    activeCategoryId,
    activeLessonId,
    setCategory,
    setLesson,
    isLessonCompleted,
    getCategoryProgress,
  } = useTeachingModule();

  // Learning progress context
  const { completedLessons } = useLearningProgress();

  // Local state for accordion expanded items
  const [expandedAccordions, setExpandedAccordions] = useState(() => {
    // Initialize with current category expanded
    const initial = new Set();
    if (currentCategory || activeCategoryId) {
      initial.add(currentCategory || activeCategoryId);
    }
    return initial;
  });

  // Determine active category (prefer prop, then context, then first category)
  const activeCategory = useMemo(() => {
    return currentCategory || activeCategoryId || (categories.length > 0 ? categories[0].id : null);
  }, [currentCategory, activeCategoryId, categories]);

  // Determine active lesson
  const activeLesson = useMemo(() => {
    return currentLesson || activeLessonId;
  }, [currentLesson, activeLessonId]);

  // Handle category change (tabs)
  const handleCategoryChange = (event, newValue) => {
    const categoryId = categories[newValue]?.id;
    if (categoryId) {
      setCategory(categoryId);
      if (onCategoryChange) {
        onCategoryChange(categoryId);
      }
    }
  };

  // Handle accordion expansion
  const handleAccordionChange = (categoryId) => (event, isExpanded) => {
    setExpandedAccordions((prev) => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(categoryId);
      } else {
        newSet.delete(categoryId);
      }
      return newSet;
    });

    // Also update active category in context
    if (isExpanded) {
      setCategory(categoryId);
      if (onCategoryChange) {
        onCategoryChange(categoryId);
      }
    }
  };

  // Handle lesson click
  const handleLessonClick = (lessonId, categoryId) => {
    setLesson(lessonId, categoryId);
    if (onLessonClick) {
      onLessonClick(lessonId, categoryId);
    }
  };

  // Get category icon
  const getCategoryIcon = (categoryId) => {
    const iconMap = {
      pathologyProtocols: MedicalServicesIcon,
      protectiveStrategies: ShieldIcon,
      weaningContent: TrendingUpIcon,
      troubleshootingGuides: BuildIcon,
      checklistProtocols: ChecklistIcon,
    };
    return iconMap[categoryId] || DescriptionIcon;
  };

  // Get lesson type icon
  const getLessonTypeIcon = (lessonType) => {
    const iconMap = {
      quiz: QuizIcon,
      case: PlayCircleIcon,
      protocol: AssignmentIcon,
      theory: DescriptionIcon,
      checklist: ChecklistIcon,
    };
    return iconMap[lessonType] || DescriptionIcon;
  };

  // Get lesson type chip
  const getLessonTypeChip = (lessonType) => {
    const chipMap = {
      quiz: { label: 'Quiz', color: 'primary' },
      case: { label: 'Caso', color: 'secondary' },
      protocol: { label: 'Protocolo', color: 'success' },
      theory: { label: 'Teoría', color: 'default' },
      checklist: { label: 'Checklist', color: 'info' },
    };
    return chipMap[lessonType] || { label: 'Lección', color: 'default' };
  };

  // Check if lesson is completed (check both contexts)
  const checkLessonCompleted = (lessonId) => {
    // Check teaching module context
    if (isLessonCompleted(lessonId)) {
      return true;
    }
    
    // Check learning progress context (format: moduleId.lessonId)
    const lessonKey = `${moduleId}.${lessonId}`;
    return completedLessons?.has?.(lessonKey) || false;
  };

  // Find active tab index
  const activeTabIndex = useMemo(() => {
    return categories.findIndex(cat => cat.id === activeCategory);
  }, [categories, activeCategory]);

  // Render Tabs variant
  const renderTabsVariant = () => {
    const activeCategoryData = categories.find(cat => cat.id === activeCategory);
    const activeCategoryLessons = activeCategoryData?.lessons || [];

    return (
      <Box>
        {/* Tabs */}
        <Tabs
          value={activeTabIndex >= 0 ? activeTabIndex : 0}
          onChange={handleCategoryChange}
          variant={isTablet ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 3,
          }}
        >
          {categories.map((category) => {
            const CategoryIconComponent = category.icon || getCategoryIcon(category.id);
            const progress = getCategoryProgress(category.id, category.lessons || []);
            
            return (
              <StyledTab
                key={category.id}
                categorycolor={category.color}
                icon={
                  <CategoryIcon>
                    <CategoryIconComponent />
                  </CategoryIcon>
                }
                iconPosition="start"
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="body2" fontWeight="inherit">
                      {category.title}
                    </Typography>
                    {progress.total > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {progress.completed}/{progress.total}
                      </Typography>
                    )}
                  </Box>
                }
              />
            );
          })}
        </Tabs>

        {/* Lessons List */}
        <Collapse in={true} timeout={300}>
          <Box>
            {activeCategoryData && (
              <>
                {activeCategoryData.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {activeCategoryData.description}
                  </Typography>
                )}
                
                <ProgressIndicator>
                  <LinearProgress
                    variant="determinate"
                    value={getCategoryProgress(activeCategory, activeCategoryLessons).percentage}
                    sx={{ flex: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50, textAlign: 'right' }}>
                    {getCategoryProgress(activeCategory, activeCategoryLessons).percentage}%
                  </Typography>
                </ProgressIndicator>

                <List sx={{ mt: 2 }}>
                  {activeCategoryLessons.map((lesson) => {
                    const isCompleted = checkLessonCompleted(lesson.id);
                    const isActive = activeLesson === lesson.id;
                    const lessonTypeChip = getLessonTypeChip(lesson.type);
                    const LessonTypeIcon = getLessonTypeIcon(lesson.type);

                    return (
                      <ListItem
                        key={lesson.id}
                        disablePadding
                        sx={{ mb: 0.5 }}
                      >
                        <LessonListItem
                          isactive={isActive}
                          iscompleted={isCompleted}
                          onClick={() => handleLessonClick(lesson.id, activeCategory)}
                          aria-label={`Ir a lección: ${lesson.title}`}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {isCompleted ? (
                              <CheckCircleIcon color="success" fontSize="small" />
                            ) : (
                              <LessonTypeIcon color="action" fontSize="small" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={lesson.title}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                {lesson.estimatedTime && (
                                  <Chip
                                    icon={<AccessTimeIcon />}
                                    label={`${lesson.estimatedTime} min`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                                {lesson.type && (
                                  <Chip
                                    label={lessonTypeChip.label}
                                    size="small"
                                    color={lessonTypeChip.color}
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            }
                            primaryTypographyProps={{
                              sx: {
                                fontWeight: isActive ? 600 : 400,
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                color: isActive ? 'primary.main' : 'text.primary',
                              },
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                            }}
                          />
                        </LessonListItem>
                      </ListItem>
                    );
                  })}
                </List>
              </>
            )}
          </Box>
        </Collapse>
      </Box>
    );
  };

  // Render Accordion variant
  const renderAccordionVariant = () => {
    return (
      <Box>
        {categories.map((category) => {
          const CategoryIconComponent = category.icon || getCategoryIcon(category.id);
          const isExpanded = expandedAccordions.has(category.id);
          const isActive = activeCategory === category.id;
          const progress = getCategoryProgress(category.id, category.lessons || []);

          return (
            <StyledAccordion
              key={category.id}
              expanded={isExpanded}
              onChange={handleAccordionChange(category.id)}
              isactive={isActive}
              categorycolor={category.color}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`category-${category.id}-content`}
                id={`category-${category.id}-header`}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                  <CategoryIcon>
                    <CategoryIconComponent color={isActive ? 'primary' : 'action'} />
                  </CategoryIcon>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={isActive ? 600 : 400}>
                      {category.title}
                    </Typography>
                    {category.description && (
                      <Typography variant="caption" color="text.secondary">
                        {category.description}
                      </Typography>
                    )}
                    {progress.total > 0 && (
                      <ProgressIndicator>
                        <LinearProgress
                          variant="determinate"
                          value={progress.percentage}
                          sx={{ flex: 1, height: 4, borderRadius: 2 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 45, ml: 1 }}>
                          {progress.completed}/{progress.total}
                        </Typography>
                      </ProgressIndicator>
                    )}
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {(category.lessons || []).map((lesson) => {
                    const isCompleted = checkLessonCompleted(lesson.id);
                    const isActive = activeLesson === lesson.id;
                    const lessonTypeChip = getLessonTypeChip(lesson.type);
                    const LessonTypeIcon = getLessonTypeIcon(lesson.type);

                    return (
                      <ListItem
                        key={lesson.id}
                        disablePadding
                        sx={{ mb: 0.5 }}
                      >
                        <LessonListItem
                          isactive={isActive}
                          iscompleted={isCompleted}
                          onClick={() => handleLessonClick(lesson.id, category.id)}
                          aria-label={`Ir a lección: ${lesson.title}`}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {isCompleted ? (
                              <CheckCircleIcon color="success" fontSize="small" />
                            ) : (
                              <LessonTypeIcon color="action" fontSize="small" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={lesson.title}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                {lesson.estimatedTime && (
                                  <Chip
                                    icon={<AccessTimeIcon />}
                                    label={`${lesson.estimatedTime} min`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                                {lesson.type && (
                                  <Chip
                                    label={lessonTypeChip.label}
                                    size="small"
                                    color={lessonTypeChip.color}
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            }
                            primaryTypographyProps={{
                              sx: {
                                fontWeight: isActive ? 600 : 400,
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                color: isActive ? 'primary.main' : 'text.primary',
                              },
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                            }}
                          />
                        </LessonListItem>
                      </ListItem>
                    );
                  })}
                </List>
              </AccordionDetails>
            </StyledAccordion>
          );
        })}
      </Box>
    );
  };

  // Validation
  if (!categories || categories.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No hay categorías disponibles para este módulo.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {effectiveVariant === 'tabs' ? renderTabsVariant() : renderAccordionVariant()}
    </Box>
  );
};

ModuleCategoryNav.propTypes = {
  moduleId: PropTypes.string.isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      icon: PropTypes.elementType,
      color: PropTypes.string,
      lessons: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          title: PropTypes.string.isRequired,
          estimatedTime: PropTypes.number,
          type: PropTypes.oneOf(['quiz', 'case', 'protocol', 'theory', 'checklist']),
        })
      ).isRequired,
    })
  ).isRequired,
  currentCategory: PropTypes.string,
  currentLesson: PropTypes.string,
  onCategoryChange: PropTypes.func,
  onLessonClick: PropTypes.func,
  variant: PropTypes.oneOf(['tabs', 'accordion']),
};

export default ModuleCategoryNav;

