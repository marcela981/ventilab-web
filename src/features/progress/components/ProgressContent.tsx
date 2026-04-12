import React, { useCallback } from 'react';
import { useRouter } from 'next/router';
import { Box, Alert, Fade, Chip } from '@mui/material';
import { CloudOff } from '@mui/icons-material';
import SkillTree from './SkillTree';
import Milestones from './Milestones';
import Achievements from './Achievements';
import { XpLevelCard } from './XpLevelCard';
import { StreakCard } from './StreakCard';
import { CalendarCard } from './CalendarCard';
import { trackEvent } from '../utils/analytics';

interface ProgressContentProps {
  snapshot: any;
  overview: any;
  skills: any;
  milestones: any;
  achievements: any;
  mounted: boolean;
  isLocalSource: boolean;
  isAuthenticated: boolean;
  onRetry: () => void;
}

/**
 * ProgressContent - Renders the main progress dashboard grid.
 * Receives all data as props; ProgressTab owns data-fetching and
 * conditional rendering (loading / error / empty states).
 */
const ProgressContent: React.FC<ProgressContentProps> = ({
  snapshot,
  overview,
  skills,
  milestones,
  achievements,
  mounted,
  isLocalSource,
  isAuthenticated,
  onRetry,
}) => {
  const router = useRouter();

  const handleSkillClick = useCallback((skillId: string) => {
    trackEvent('skill_clicked', { skillId });
  }, []);

  const handleMilestoneCTA = useCallback((milestoneId: string) => {
    trackEvent('milestone_cta_clicked', { milestoneId });
  }, []);

  const handleAchievementFilterChange = useCallback((filter: string) => {
    trackEvent('achievement_filter_changed', { filter });
  }, []);

  const navigateToLesson = useCallback((moduleId: string, lessonId: string) => {
    router.push(`/teaching/module/${moduleId}/lesson/${lessonId}`);
  }, [router]);

  return (
    <Fade in={mounted} timeout={600}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '1400px', mx: 'auto' }}>

        {isLocalSource && (
          <Alert
            severity="info"
            icon={<CloudOff />}
            sx={{ mb: 3 }}
            action={
              <Chip label="Sincronizar" size="small" onClick={onRetry} sx={{ cursor: 'pointer' }} />
            }
          >
            Mostrando progreso local.{' '}
            {isAuthenticated
              ? 'Sincroniza para guardar en la nube.'
              : 'Inicia sesión para guardar en la nube.'}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '8fr 4fr' },
            gap: 3,
          }}
        >
          {/* Left Column: Skill Tree & Milestones */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ maxHeight: 'clamp(280px, 40vh, 520px)', overflow: 'auto' }}>
              <SkillTree
                skills={skills?.skills || []}
                unlockedSkillIds={skills?.unlockedSkillIds || []}
                onSkillClick={handleSkillClick}
                onNavigateToLesson={navigateToLesson}
              />
            </Box>
            <Milestones
              milestones={milestones?.milestones || []}
              onCTA={handleMilestoneCTA}
            />
          </Box>

          {/* Right Column: XP, Streak, Calendar, Achievements */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {overview && (
              <XpLevelCard
                xpTotal={overview.xpTotal}
                level={overview.level}
                nextLevelXp={overview.nextLevelXp}
                completedLessons={overview.completedLessons}
                totalLessons={overview.totalLessons}
              />
            )}
            {overview && (
              <StreakCard
                streakDays={overview.streakDays}
                isActive={overview.streakDays > 0}
                lastSessionDate={snapshot.lastSyncAt}
              />
            )}
            {overview?.calendar && (
              <CalendarCard calendar={overview.calendar} />
            )}
            <Box sx={{ maxHeight: 'clamp(300px, 50vh, 600px)', overflow: 'auto' }}>
              <Achievements
                achievements={achievements?.achievements || []}
                medals={achievements?.medals || []}
                onFilterChange={handleAchievementFilterChange}
              />
            </Box>
          </Box>
        </Box>

      </Box>
    </Fade>
  );
};

export default ProgressContent;
