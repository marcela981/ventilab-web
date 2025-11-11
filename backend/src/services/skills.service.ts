/**
 * Skills Service
 * Combines skills-map.json with lesson progress to determine unlocked skills
 */

import prisma from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SkillNode {
  id: string;
  label: string;
  description: string;
  category: string;
  dependsOn: string[];
  mastery: number; // 0-1
  relatedLessons: string[];
}

export interface SkillsMapEntry {
  id: string;
  label: string;
  description: string;
  category: string;
  dependsOn: string[];
  relatedLessons: string[];
}

// =============================================================================
// LOAD SKILLS MAP
// =============================================================================

/**
 * Load skills map from JSON file
 * Falls back to empty array if file doesn't exist
 */
function loadSkillsMap(): SkillsMapEntry[] {
  try {
    // Try frontend path first (for development)
    const frontendPath = path.join(process.cwd(), 'frontend', 'src', 'data', 'skills-map.json');
    if (fs.existsSync(frontendPath)) {
      const content = fs.readFileSync(frontendPath, 'utf-8');
      return JSON.parse(content);
    }

    // Try backend path
    const backendPath = path.join(process.cwd(), 'src', 'data', 'skills-map.json');
    if (fs.existsSync(backendPath)) {
      const content = fs.readFileSync(backendPath, 'utf-8');
      return JSON.parse(content);
    }

    console.warn('[SkillsService] skills-map.json not found, using empty array');
    return [];
  } catch (error) {
    console.error('[SkillsService] Error loading skills map:', error);
    return [];
  }
}

// =============================================================================
// SKILL UNLOCK LOGIC
// =============================================================================

/**
 * Check if a skill is unlocked based on dependencies and lesson progress
 * 
 * @param skill - Skill to check
 * @param unlockedSkillIds - Set of already unlocked skill IDs
 * @param lessonProgressMap - Map of lessonId -> progress (0-1)
 * @returns true if skill is unlocked
 */
function isSkillUnlocked(
  skill: SkillsMapEntry,
  unlockedSkillIds: Set<string>,
  lessonProgressMap: Map<string, number>
): boolean {
  // Check dependencies: ALL must be unlocked
  const allDependenciesUnlocked = skill.dependsOn.every(depId => unlockedSkillIds.has(depId));
  if (!allDependenciesUnlocked) {
    return false;
  }

  // Check related lessons: at least one must have ≥80% progress
  const hasRequiredProgress = skill.relatedLessons.some(lessonId => {
    const progress = lessonProgressMap.get(lessonId) || 0;
    return progress >= 0.8;
  });

  return hasRequiredProgress;
}

/**
 * Calculate mastery level for a skill based on related lessons
 * 
 * @param skill - Skill to calculate mastery for
 * @param lessonProgressMap - Map of lessonId -> progress (0-1)
 * @returns Mastery value (0-1)
 */
function calculateMastery(
  skill: SkillsMapEntry,
  lessonProgressMap: Map<string, number>
): number {
  if (skill.relatedLessons.length === 0) {
    return 0;
  }

  // Average progress across all related lessons
  const progresses = skill.relatedLessons.map(lessonId => {
    return lessonProgressMap.get(lessonId) || 0;
  });

  const averageProgress = progresses.reduce((sum, p) => sum + p, 0) / progresses.length;
  return Math.min(averageProgress, 1); // Clamp to 0-1
}

// =============================================================================
// MAIN SERVICE FUNCTIONS
// =============================================================================

/**
 * Get all skills with unlock status and mastery for a user
 * 
 * @param userId - User ID
 * @returns Array of SkillNode with mastery and unlock status
 */
export async function getUserSkills(userId: string): Promise<SkillNode[]> {
  const skillsMap = loadSkillsMap();
  
  if (skillsMap.length === 0) {
    return [];
  }

  // Get all lesson progress for this user
  const learningProgress = await prisma.learningProgress.findMany({
    where: { userId },
    include: {
      lessonProgress: {
        select: {
          lessonId: true,
          progress: true,
          completed: true
        }
      }
    }
  });

  // Build map of lessonId -> progress (0-1)
  const lessonProgressMap = new Map<string, number>();
  learningProgress.forEach(lp => {
    lp.lessonProgress.forEach(lpItem => {
      // Use progress field (0-1) or convert completed boolean to 1.0
      const progress = lpItem.completed ? 1.0 : lpItem.progress;
      lessonProgressMap.set(lpItem.lessonId, progress);
    });
  });

  // Determine unlocked skills iteratively (handles dependencies)
  const unlockedSkillIds = new Set<string>();
  let changed = true;

  // Iterate until no more skills are unlocked (handles dependency chains)
  while (changed) {
    changed = false;
    for (const skill of skillsMap) {
      if (unlockedSkillIds.has(skill.id)) {
        continue; // Already unlocked
      }

      if (isSkillUnlocked(skill, unlockedSkillIds, lessonProgressMap)) {
        unlockedSkillIds.add(skill.id);
        changed = true;
      }
    }
  }

  // Build result array with mastery
  const skills: SkillNode[] = skillsMap.map(skill => ({
    id: skill.id,
    label: skill.label,
    description: skill.description,
    category: skill.category,
    dependsOn: skill.dependsOn,
    mastery: calculateMastery(skill, lessonProgressMap),
    relatedLessons: skill.relatedLessons
  }));

  return skills;
}

/**
 * Get unlocked skill IDs for a user
 * 
 * @param userId - User ID
 * @returns Set of unlocked skill IDs
 */
export async function getUnlockedSkillIds(userId: string): Promise<string[]> {
  const skills = await getUserSkills(userId);
  
  // A skill is unlocked if mastery > 0 OR if it has no dependencies and related lessons exist
  const unlocked: string[] = [];
  
  for (const skill of skills) {
    // Check if skill should be considered unlocked
    // For now, we consider it unlocked if mastery > 0
    // The full logic is in getUserSkills, but we can also check here
    if (skill.mastery > 0) {
      unlocked.push(skill.id);
    }
  }

  return unlocked;
}

/**
 * Get recommended skills (skills that are almost unlocked, ≥60% progress)
 * 
 * @param userId - User ID
 * @param limit - Maximum number of recommendations (default: 3)
 * @returns Array of recommended SkillNode
 */
export async function getRecommendedSkills(
  userId: string,
  limit: number = 3
): Promise<SkillNode[]> {
  const skills = await getUserSkills(userId);
  const unlockedSkillIds = await getUnlockedSkillIds(userId);
  const unlockedSet = new Set(unlockedSkillIds);

  // Filter skills that are:
  // 1. Not yet unlocked
  // 2. Have mastery ≥ 0.6 (60%)
  // 3. Have all dependencies unlocked
  const recommended = skills
    .filter(skill => {
      if (unlockedSet.has(skill.id)) {
        return false; // Already unlocked
      }

      // Check if all dependencies are unlocked
      const allDepsUnlocked = skill.dependsOn.every(depId => unlockedSet.has(depId));
      if (!allDepsUnlocked) {
        return false; // Dependencies not met
      }

      // Check mastery threshold
      return skill.mastery >= 0.6;
    })
    .sort((a, b) => b.mastery - a.mastery) // Sort by mastery descending
    .slice(0, limit);

  return recommended;
}

