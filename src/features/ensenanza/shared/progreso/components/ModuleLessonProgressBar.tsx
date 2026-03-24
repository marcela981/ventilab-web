/**
 * =============================================================================
 * ModuleLessonProgressBar - Interactive Segmented Progress Navigator
 * =============================================================================
 * 
 * A dual-purpose progress bar component that:
 * 
 * BEFORE module completion:
 * - Acts as a passive progress indicator
 * - Shows current lesson progress visually
 * - Not interactive (disabled pointer events)
 * 
 * AFTER module completion:
 * - Becomes an interactive navigation tool
 * - Clickable segments for each lesson
 * - Allows direct navigation to any lesson
 * - Visual feedback on hover with tooltips
 * 
 * This approach is superior to a separate navigation bar because:
 * - Saves vertical space (no additional UI element needed)
 * - Progress and navigation are conceptually linked
 * - Intuitive UX - users naturally expect to click on progress bars
 * - Cleaner, more elegant interface
 * - Reduces cognitive load (one component, dual purpose)
 * 
 * @component
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

interface ModuleLessonProgressBarProps {
  /** Total number of lessons in the module */
  totalLessons: number;
  /** Current active lesson index (0-based) */
  currentLesson: number;
  /** Whether the module is fully completed (enables interactivity) */
  isModuleCompleted: boolean;
  /** Callback when user clicks on a lesson segment */
  onSelectLesson: (lessonIndex: number) => void;
  /** Optional: Array of lesson titles for tooltips */
  lessonTitles?: string[];
  /** Optional: Set of completed lesson indices (0-based) */
  completedLessons?: Set<number>;
}

// Styled wrapper for the progress bar container
const ProgressBarContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isInteractive',
})<{ isInteractive: boolean }>(({ isInteractive }) => ({
  position: 'relative',
  width: '100%',
  height: 32,
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 8,
  overflow: 'hidden',
  cursor: isInteractive ? 'pointer' : 'default',
  transition: 'all 0.3s ease',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  ...(isInteractive && {
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(33, 150, 243, 0.3)',
    },
  }),
}));

// Styled segment for individual lessons
const LessonSegment = styled(Box, {
  shouldForwardProp: (prop) => !['isCompleted', 'isCurrent', 'isInteractive'].includes(prop as string),
})<{
  isCompleted: boolean;
  isCurrent: boolean;
  isInteractive: boolean;
}>(({ isCompleted, isCurrent, isInteractive }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.3s ease',
  borderRight: '1px solid rgba(0, 0, 0, 0.2)',
  
  // Color based on state
  backgroundColor: isCompleted
    ? '#4caf50' // Green for completed
    : isCurrent
    ? 'rgba(33, 150, 243, 0.4)' // Blue for current
    : 'rgba(255, 255, 255, 0.1)', // Neutral for future

  // Current lesson highlight
  ...(isCurrent && {
    boxShadow: 'inset 0 0 0 2px rgba(33, 150, 243, 0.8)',
    zIndex: 2,
  }),

  // Hover effect (only when interactive)
  ...(isInteractive && {
    '&:hover': {
      backgroundColor: isCompleted
        ? '#66bb6a' // Lighter green
        : isCurrent
        ? 'rgba(33, 150, 243, 0.6)' // Brighter blue
        : 'rgba(33, 150, 243, 0.2)', // Highlighted neutral
      transform: 'scaleY(1.05)',
      zIndex: 3,
    },
  }),

  // Disabled state styling
  ...(!isInteractive && {
    pointerEvents: 'none',
  }),
}));

/**
 * ModuleLessonProgressBar Component
 * 
 * Displays module progress as segmented bar with optional interactive navigation
 */
const ModuleLessonProgressBar: React.FC<ModuleLessonProgressBarProps> = ({
  totalLessons,
  currentLesson,
  isModuleCompleted,
  onSelectLesson,
  lessonTitles = [],
  completedLessons = new Set(),
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate width percentage per lesson segment
  const segmentWidth = useMemo(() => 100 / totalLessons, [totalLessons]);

  /**
   * Handle click on the progress bar
   * Calculates which lesson segment was clicked based on click position
   */
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isModuleCompleted || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const barWidth = rect.width;
      const clickPosition = clickX / barWidth;

      // Calculate lesson index from click position
      const lessonIndex = Math.floor(clickPosition * totalLessons);
      
      // Clamp to valid range
      const validIndex = Math.max(0, Math.min(lessonIndex, totalLessons - 1));

      // Call the navigation handler
      onSelectLesson(validIndex);
    },
    [isModuleCompleted, totalLessons, onSelectLesson]
  );

  /**
   * Handle mouse move for tooltip positioning
   */
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isModuleCompleted || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const barWidth = rect.width;
      const mousePosition = mouseX / barWidth;

      // Calculate hovered segment
      const segmentIndex = Math.floor(mousePosition * totalLessons);
      const validIndex = Math.max(0, Math.min(segmentIndex, totalLessons - 1));

      setHoveredSegment(validIndex);
    },
    [isModuleCompleted, totalLessons]
  );

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = useCallback(() => {
    setHoveredSegment(null);
  }, []);

  /**
   * Get tooltip text for a lesson segment
   */
  const getTooltipText = (index: number): string => {
    const lessonNumber = index + 1;
    const lessonTitle = lessonTitles[index];
    const baseText = lessonTitle
      ? `Lección ${lessonNumber}: ${lessonTitle}`
      : `Lección ${lessonNumber}`;

    if (completedLessons.has(index)) {
      return `${baseText} ✓`;
    } else if (index === currentLesson) {
      return `${baseText} (actual)`;
    }
    return baseText;
  };

  /**
   * Check if a lesson is completed.
   * CRITICAL: Completion is derived ONLY from the completedLessons Set (sourced from DB).
   * We do NOT infer completion from position (index < currentLesson) because
   * that would incorrectly mark lessons as completed when revisiting earlier lessons.
   */
  const isLessonCompleted = (index: number): boolean => {
    return completedLessons.has(index);
  };

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      {/* Progress Bar */}
      <Tooltip
        title={
          isModuleCompleted && hoveredSegment !== null
            ? getTooltipText(hoveredSegment)
            : isModuleCompleted
            ? 'Haz clic para navegar a una lección'
            : 'Progreso del módulo'
        }
        arrow
        placement="top"
        disableInteractive
      >
        <ProgressBarContainer
          ref={containerRef}
          isInteractive={isModuleCompleted}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          role={isModuleCompleted ? 'button' : 'progressbar'}
          aria-label={
            isModuleCompleted
              ? 'Navegador de lecciones'
              : 'Barra de progreso del módulo'
          }
          aria-valuemin={0}
          aria-valuemax={totalLessons}
          aria-valuenow={currentLesson + 1}
        >
          {/* Render lesson segments */}
          {Array.from({ length: totalLessons }, (_, index) => {
            const isCompleted = isLessonCompleted(index);
            const isCurrent = index === currentLesson;
            const leftPosition = index * segmentWidth;

            return (
              <LessonSegment
                key={index}
                isCompleted={isCompleted}
                isCurrent={isCurrent}
                isInteractive={isModuleCompleted}
                sx={{
                  left: `${leftPosition}%`,
                  width: `${segmentWidth}%`,
                }}
              >
                {/* Show checkmark icon for completed lessons when interactive */}
                {isCompleted && isModuleCompleted && (
                  <CheckCircleIcon
                    sx={{
                      fontSize: 14,
                      color: 'rgba(255, 255, 255, 0.9)',
                      opacity: isCurrent ? 0 : 0.7,
                    }}
                  />
                )}

                {/* Show lesson number for current lesson */}
                {isCurrent && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {index + 1}
                  </Typography>
                )}
              </LessonSegment>
            );
          })}
        </ProgressBarContainer>
      </Tooltip>

      {/* Progress Info Text */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 0.5,
          px: 0.5,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.7rem',
          }}
        >
          {isModuleCompleted ? (
            <>
              <CheckCircleIcon
                sx={{
                  fontSize: 12,
                  color: '#4caf50',
                  verticalAlign: 'middle',
                  mr: 0.5,
                }}
              />
              Módulo completado - Navegación libre
            </>
          ) : (
            `Lección ${currentLesson + 1} de ${totalLessons}`
          )}
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: isModuleCompleted ? '#4caf50' : 'rgba(33, 150, 243, 0.8)',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}
        >
          {Math.round((completedLessons.size / totalLessons) * 100)}%
        </Typography>
      </Box>
    </Box>
  );
};

export default ModuleLessonProgressBar;
