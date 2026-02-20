/**
 * =============================================================================
 * ModuleCompletionCelebration Component for VentyLab
 * =============================================================================
 * 
 * Gamified celebration message shown when a user completes all lessons in a module.
 * Displays once per module completion and announces free navigation capability.
 * 
 * Features:
 * - Animated celebration message
 * - Confetti effect (optional)
 * - Clear messaging about unlocked free navigation
 * - Auto-dismiss or manual close
 * - Persistent state (doesn't show again for same module)
 * 
 * @component
 */

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Close as CloseIcon,
  EmojiEvents as TrophyIcon,
  LibraryBooks as LibraryBooksIcon,
  TouchApp as TouchAppIcon,
} from '@mui/icons-material';

/**
 * ModuleCompletionCelebration - Gamified module completion message
 */
const ModuleCompletionCelebration = ({
  open,
  onClose,
  moduleTitle,
  moduleId,
  totalLessons,
}) => {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (open) {
      // Stagger animation phases
      const timer1 = setTimeout(() => setAnimationPhase(1), 300);
      const timer2 = setTimeout(() => setAnimationPhase(2), 600);
      const timer3 = setTimeout(() => setAnimationPhase(3), 900);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      setAnimationPhase(0);
    }
  }, [open]);

  const handleClose = () => {
    // Store in localStorage to prevent showing again for this module
    try {
      const celebratedModules = JSON.parse(
        localStorage.getItem('vlab:celebrated_modules') || '[]'
      );
      if (!celebratedModules.includes(moduleId)) {
        celebratedModules.push(moduleId);
        localStorage.setItem(
          'vlab:celebrated_modules',
          JSON.stringify(celebratedModules)
        );
      }
    } catch (error) {
      console.warn('[ModuleCompletionCelebration] Failed to save state:', error);
    }

    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Zoom}
      transitionDuration={400}
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          overflow: 'visible',
          position: 'relative',
        },
      }}
    >
      {/* Close button */}
      <IconButton
        onClick={handleClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent
        sx={{
          textAlign: 'center',
          py: 5,
          px: 4,
          color: '#ffffff',
        }}
      >
        {/* Trophy Icon */}
        <Fade in={animationPhase >= 1} timeout={500}>
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              justifyContent: 'center',
              animation: animationPhase >= 1 ? 'bounce 1s ease-in-out' : 'none',
              '@keyframes bounce': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-20px)' },
              },
            }}
          >
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              }}
            >
              <TrophyIcon
                sx={{
                  fontSize: 56,
                  color: '#FFD700',
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
                }}
              />
            </Box>
          </Box>
        </Fade>

        {/* Celebration Message */}
        <Fade in={animationPhase >= 2} timeout={500}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: 2,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              🎉 ¡Módulo Completado!
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mb: 3,
                fontWeight: 500,
                opacity: 0.95,
              }}
            >
              {moduleTitle}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 1,
                opacity: 0.9,
                fontSize: '1rem',
              }}
            >
              Has completado las <strong>{totalLessons}</strong> lecciones de este módulo.
            </Typography>
          </Box>
        </Fade>

        {/* Free Navigation Message */}
        <Fade in={animationPhase >= 3} timeout={500}>
          <Box
            sx={{
              mt: 4,
              p: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 2,
              backdropFilter: 'blur(10px)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 2,
              }}
            >
              <LibraryBooksIcon sx={{ color: '#FFD700' }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: '1.1rem',
                }}
              >
                Navegación Libre Desbloqueada
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                mb: 2,
                opacity: 0.95,
                lineHeight: 1.6,
              }}
            >
              Ahora puedes explorar todas las lecciones libremente. Salta entre
              lecciones, revisa conceptos y profundiza en los temas que más te interesen.
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <TouchAppIcon sx={{ fontSize: 18, opacity: 0.8 }} />
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.8,
                  fontSize: '0.85rem',
                }}
              >
                Usa el menú de lecciones para navegar libremente
              </Typography>
            </Box>
          </Box>
        </Fade>
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: 'center',
          pb: 3,
          px: 3,
        }}
      >
        <Button
          onClick={handleClose}
          variant="contained"
          size="large"
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: '#667eea',
            fontWeight: 600,
            px: 4,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            '&:hover': {
              backgroundColor: '#ffffff',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          ¡Entendido!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ModuleCompletionCelebration.propTypes = {
  /**
   * Whether the dialog is open
   */
  open: PropTypes.bool.isRequired,

  /**
   * Callback function when dialog is closed
   */
  onClose: PropTypes.func.isRequired,

  /**
   * Title of the completed module
   */
  moduleTitle: PropTypes.string,

  /**
   * Module ID (for tracking shown state)
   */
  moduleId: PropTypes.string.isRequired,

  /**
   * Total number of lessons in the module
   */
  totalLessons: PropTypes.number,
};

ModuleCompletionCelebration.defaultProps = {
  moduleTitle: 'Módulo',
  totalLessons: 0,
};

export default ModuleCompletionCelebration;
