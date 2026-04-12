/**
 * CompletionConfetti - Celebration animation when lesson is completed
 * 
 * Shows confetti animation and success message for 3 seconds.
 */

import React, { useEffect, useState, useRef } from 'react';
import Confetti from 'react-confetti';
import {
  Box,
  Typography,
  Paper,
  Fade,
  Zoom,
  useTheme,
  alpha,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface CompletionConfettiProps {
  show: boolean;
  onComplete: () => void;
  message?: string;
  duration?: number; // Duration in milliseconds
}

/**
 * Confetti celebration component for lesson completion
 */
const CompletionConfetti: React.FC<CompletionConfettiProps> = ({
  show,
  onComplete,
  message = '¡Lección completada! ✅',
  duration = 3000,
}) => {
  const theme = useTheme();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showMessage, setShowMessage] = useState(false);
  const [isConfettiActive, setIsConfettiActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get window dimensions
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Handle show/hide animation
  useEffect(() => {
    if (show) {
      // Start confetti and show message
      setIsConfettiActive(true);
      setShowMessage(true);

      // Stop confetti after duration
      timerRef.current = setTimeout(() => {
        setIsConfettiActive(false);
        setShowMessage(false);
        
        // Call onComplete callback
        setTimeout(() => {
          onComplete();
        }, 500); // Wait for fade out animation
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [show, duration, onComplete]);

  if (!show) {
    return null;
  }

  return (
    <>
      {/* Confetti */}
      {isConfettiActive && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          numberOfPieces={200}
          recycle={false}
          gravity={0.3}
          colors={[
            theme.palette.primary.main,
            theme.palette.secondary.main,
            theme.palette.success.main,
            '#FFD700', // Gold
            '#FF6B6B', // Coral
            '#4ECDC4', // Turquoise
          ]}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Success message overlay */}
      <Fade in={showMessage} timeout={500}>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            pointerEvents: 'none',
            px: 2,
          }}
        >
          <Zoom in={showMessage} timeout={400}>
            <Paper
              elevation={8}
              sx={{
                px: { xs: 3, sm: 4 },
                py: { xs: 2.5, sm: 3 },
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.background.paper, 0.98),
                backdropFilter: 'blur(8px)',
                border: `2px solid ${theme.palette.success.main}`,
                boxShadow: `0 8px 32px ${alpha(theme.palette.success.main, 0.3)}`,
                maxWidth: '500px',
                textAlign: 'center',
              }}
            >
              {/* Success icon */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <CheckCircleIcon
                  sx={{
                    fontSize: { xs: 48, sm: 56 },
                    color: theme.palette.success.main,
                    filter: `drop-shadow(0 4px 8px ${alpha(theme.palette.success.main, 0.3)})`,
                  }}
                />
              </Box>

              {/* Message */}
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  mb: 1,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                }}
              >
                {message}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                Excelente trabajo 🎉
              </Typography>
            </Paper>
          </Zoom>
        </Box>
      </Fade>
    </>
  );
};

export default CompletionConfetti;
