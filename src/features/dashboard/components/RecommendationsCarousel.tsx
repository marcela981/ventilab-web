import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Skeleton,
  Chip
} from '@mui/material';
import {
  PlayArrow,
  School,
  Science,
  Quiz,
  NavigateNext,
  NavigateBefore
} from '@mui/icons-material';
import { Recommendation } from '../types';

interface RecommendationsCarouselProps {
  items: Recommendation[];
  onOpen: (id: string) => void;
  loading?: boolean;
}

/**
 * RecommendationsCarousel - Carousel horizontal de recomendaciones
 * 
 * Muestra cards horizontales con scroll horizontal
 */
const RecommendationsCarousel: React.FC<RecommendationsCarouselProps> = ({
  items,
  onOpen,
  loading = false
}) => {
  const [scrollPosition, setScrollPosition] = React.useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case 'lesson':
        return <School sx={{ fontSize: 20 }} />;
      case 'module':
        return <School sx={{ fontSize: 20 }} />;
      case 'simulation':
        return <Science sx={{ fontSize: 20 }} />;
      case 'practice':
        return <Quiz sx={{ fontSize: 20 }} />;
      default:
        return <School sx={{ fontSize: 20 }} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'lesson':
        return 'Lección';
      case 'module':
        return 'Módulo';
      case 'simulation':
        return 'Simulación';
      case 'practice':
        return 'Práctica';
      default:
        return 'Contenido';
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newPosition =
        direction === 'left'
          ? scrollPosition - scrollAmount
          : scrollPosition + scrollAmount;
      scrollContainerRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      setScrollPosition(newPosition);
    }
  };

  if (loading) {
    return (
      <Card
        sx={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2
        }}
      >
        <CardContent>
          <Skeleton variant="text" width="30%" height={30} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, overflow: 'hidden' }}>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                width={280}
                height={180}
                sx={{ borderRadius: 1, flexShrink: 0 }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              mb: 2
            }}
          >
            Recomendaciones
          </Typography>
          <Typography variant="body2" sx={{ color: '#e8f4fd', textAlign: 'center', py: 3 }}>
            No hay recomendaciones disponibles
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              color: '#ffffff',
              fontWeight: 600
            }}
          >
            Recomendaciones para Ti
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              onClick={() => scroll('left')}
              disabled={scrollPosition <= 0}
              aria-label="Scroll izquierdo en recomendaciones"
              data-analytics-id="recommendations-scroll-left"
              sx={{
                minWidth: 40,
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                },
                '&.Mui-disabled': {
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              <NavigateBefore />
            </Button>
            <Button
              size="small"
              onClick={() => scroll('right')}
              aria-label="Scroll derecho en recomendaciones"
              data-analytics-id="recommendations-scroll-right"
              sx={{
                minWidth: 40,
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <NavigateNext />
            </Button>
          </Box>
        </Box>

        <Box
          ref={scrollContainerRef}
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            overflowY: 'hidden',
            pb: 2,
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
            '&::-webkit-scrollbar': {
              height: 8
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 4,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.5)'
              }
            }
          }}
        >
          {items.map((rec) => (
            <Card
              key={rec.id}
              sx={{
                minWidth: 280,
                maxWidth: 280,
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s ease-in-out',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  transform: 'translateY(-4px)'
                }
              }}
              onClick={() => {
                const analyticsId = `open-rec-${rec.id}`;
                if (typeof window !== 'undefined' && (window as any).analytics) {
                  (window as any).analytics.track('open-rec', { id: analyticsId });
                } else {
                  console.info('[Analytics] open-rec', { id: analyticsId });
                }
                onOpen(rec.id);
              }}
              aria-label={`Abrir recomendación: ${rec.title}`}
              data-analytics-id={`open-rec-${rec.id}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const analyticsId = `open-rec-${rec.id}`;
                  if (typeof window !== 'undefined' && (window as any).analytics) {
                    (window as any).analytics.track('open-rec', { id: analyticsId });
                  } else {
                    console.info('[Analytics] open-rec', { id: analyticsId });
                  }
                  onOpen(rec.id);
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  {getIcon(rec.type)}
                  <Chip
                    label={getTypeLabel(rec.type)}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(33, 150, 243, 0.2)',
                      color: '#ffffff',
                      border: '1px solid rgba(33, 150, 243, 0.5)',
                      fontSize: '0.7rem',
                      height: 22
                    }}
                  />
                </Box>

                <Typography
                  variant="subtitle1"
                  sx={{
                    color: '#ffffff',
                    fontWeight: 600,
                    mb: 1,
                    fontSize: '0.95rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {rec.title}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: '#e8f4fd',
                    mb: 2,
                    fontSize: '0.8rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {rec.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {rec.progress !== undefined && (
                    <Chip
                      label={`${rec.progress}%`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 152, 0, 0.2)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 152, 0, 0.5)',
                        fontSize: '0.7rem',
                        height: 22
                      }}
                    />
                  )}
                  {rec.estimatedTime && (
                    <Chip
                      label={`${rec.estimatedTime} min`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: '#e8f4fd',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        fontSize: '0.7rem',
                        height: 22
                      }}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default RecommendationsCarousel;

