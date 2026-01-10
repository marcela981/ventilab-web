import React from 'react';
import { Box, Skeleton, Card, CardContent } from '@mui/material';

/**
 * ProgressSkeleton - Skeleton para el tab de progreso
 */
export const ProgressSkeleton: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width="40%" height={40} sx={{ mb: 3 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '8fr 4fr' }, gap: 3 }}>
        {/* Left column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
        
        {/* Right column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

/**
 * SkillTreeSkeleton - Skeleton para el árbol de habilidades
 */
export const SkillTreeSkeleton: React.FC = () => {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Skeleton variant="text" width="30%" height={28} sx={{ mb: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 3 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="circular" width={100} height={100} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * MilestonesSkeleton - Skeleton para hitos
 */
export const MilestonesSkeleton: React.FC = () => {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Skeleton variant="text" width="30%" height={28} sx={{ mb: 3 }} />
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

/**
 * AchievementsSkeleton - Skeleton para logros
 */
export const AchievementsSkeleton: React.FC = () => {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Skeleton variant="text" width="30%" height={28} sx={{ mb: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProgressSkeleton;

