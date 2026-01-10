/**
 * =============================================================================
 * AchievementNotification Component
 * =============================================================================
 * Celebratory notification component that displays when a user unlocks a new
 * achievement. Features animated entrance, confetti effect, sound, and
 * auto-dismiss functionality.
 * 
 * Features:
 * - Smooth slide-in animation
 * - Confetti celebration effect (optional)
 * - Sound effect on display (optional)
 * - Auto-dismiss after 5 seconds
 * - Manual dismiss with close button or click outside
 * - Responsive design for mobile and desktop
 * - Vibrant gradient styling with shadows
 * 
 * =============================================================================
 */

import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  Card,
  CardContent,
  Typography,
  IconButton,
  Avatar,
  Box,
  Chip,
  Slide,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import Confetti from 'react-confetti';

/**
 * Slide transition component for entrance animation
 */
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/**
 * AchievementNotification Component
 * 
 * Displays a celebratory notification when an achievement is unlocked.
 * Includes animation, confetti, sound, and auto-dismiss functionality.
 * 
 * @component
 * @example
 * <AchievementNotification
 *   achievement={{
 *     title: "Primera Lección",
 *     description: "Completaste tu primera lección",
 *     icon: "school",
 *     points: 10,
 *     rarity: "COMMON"
 *   }}
 *   show={true}
 *   onDismiss={() => setShow(false)}
 * />
 */
function AchievementNotification({ achievement, show, onDismiss }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [confettiActive, setConfettiActive] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const audioRef = useRef(null);
  const autoDismissTimeoutRef = useRef(null);

  // Update window size for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle achievement display
  useEffect(() => {
    if (show && achievement) {
      // Trigger confetti
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 3000); // 3 seconds

      // Play celebration sound (optional)
      try {
        // Create a simple celebration sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800; // Higher pitch = more celebratory
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        // Silently fail if audio is not supported or user hasn't interacted
        console.log('[AchievementNotification] Audio not available');
      }

      // Auto-dismiss after 5 seconds
      autoDismissTimeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 5000);
    }

    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
    };
  }, [show, achievement]);

  const handleDismiss = () => {
    if (autoDismissTimeoutRef.current) {
      clearTimeout(autoDismissTimeoutRef.current);
    }
    setConfettiActive(false);
    onDismiss();
  };

  if (!achievement || !show) return null;

  // Get rarity colors
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'COMMON':
        return theme.palette.info.main;
      case 'RARE':
        return theme.palette.secondary.main;
      case 'EPIC':
        return theme.palette.warning.main;
      default:
        return theme.palette.primary.main;
    }
  };

  const rarityColor = getRarityColor(achievement.rarity);

  return (
    <>
      {/* Confetti Effect */}
      {confettiActive && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      {/* Notification Dialog */}
      <Dialog
        open={show}
        onClose={handleDismiss}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'visible',
            background: `linear-gradient(135deg, ${rarityColor}15 0%, ${rarityColor}05 100%)`,
            boxShadow: `0 8px 32px ${rarityColor}40`,
          },
        }}
        fullScreen={isMobile}
      >
        <DialogContent sx={{ p: 0 }}>
          <Card
            sx={{
              background: 'transparent',
              boxShadow: 'none',
              position: 'relative',
            }}
          >
            {/* Close Button */}
            <IconButton
              onClick={handleDismiss}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1,
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
              aria-label="Cerrar notificación"
            >
              <CloseIcon />
            </IconButton>

            <CardContent sx={{ pt: 4, pb: 3, px: 3 }}>
              {/* Achievement Icon */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: rarityColor,
                    boxShadow: `0 4px 20px ${rarityColor}60`,
                  }}
                >
                  <TrophyIcon sx={{ fontSize: 50, color: 'white' }} />
                </Avatar>
              </Box>

              {/* Title */}
              <Typography
                variant="h5"
                component="h2"
                align="center"
                fontWeight="bold"
                gutterBottom
                sx={{
                  color: rarityColor,
                  mb: 1,
                }}
              >
                ¡Logro Desbloqueado!
              </Typography>

              {/* Achievement Title */}
              <Typography
                variant="h6"
                component="h3"
                align="center"
                fontWeight="600"
                gutterBottom
                sx={{ mb: 2 }}
              >
                {achievement.title}
              </Typography>

              {/* Description */}
              <Typography
                variant="body2"
                align="center"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                {achievement.description}
              </Typography>

              {/* Points Badge */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Chip
                  label={`+${achievement.points} puntos`}
                  color="primary"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    bgcolor: rarityColor,
                    color: 'white',
                  }}
                />
              </Box>

              {/* Rarity Badge (if EPIC) */}
              {achievement.rarity === 'EPIC' && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Chip
                    label="EPIC"
                    size="small"
                    sx={{
                      bgcolor: theme.palette.warning.main,
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}

AchievementNotification.propTypes = {
  /**
   * Achievement object with title, description, icon, points, rarity
   */
  achievement: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string,
    points: PropTypes.number.isRequired,
    rarity: PropTypes.oneOf(['COMMON', 'RARE', 'EPIC']),
    unlockedAt: PropTypes.string,
  }),
  /**
   * Whether to show the notification
   */
  show: PropTypes.bool.isRequired,
  /**
   * Callback function when notification is dismissed
   */
  onDismiss: PropTypes.func.isRequired,
};

export default AchievementNotification;

