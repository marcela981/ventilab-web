#!/usr/bin/env node

/**
 * Build Lessons Manifest Script
 * 
 * Reads all lesson JSON files from src/data/lessons/** and generates
 * a manifest file with lesson metadata organized by level.
 * 
 * For M03 (module-03-configuration), flattens the category-based structure
 * into individual virtual lessons.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const ROOT_DIR = join(__dirname, '..');
const LESSONS_DIR = join(ROOT_DIR, 'src', 'features', 'teaching', 'data', 'lessons');
const MANIFEST_PATH = join(ROOT_DIR, 'src', 'features', 'teaching', 'data', 'lessons.manifest.json');

// Module to level mapping (from curriculumData.js structure)
// This will be populated by reading curriculumData or can be extended
const MODULE_LEVEL_MAP = {
  'module-01-fundamentals': 'beginner',
  'module-02-parameters': 'intermediate',
  'module-02-modalidades-parametros': 'intermediate', // Alternative ID used in lesson JSONs
  'module-03-configuration': 'advanced',
};

/**
 * Get level from moduleId, with fallback to reading from curriculumData if needed
 */
function getLevelFromModuleId(moduleId) {
  // First check the static map
  if (MODULE_LEVEL_MAP[moduleId]) {
    return MODULE_LEVEL_MAP[moduleId];
  }
  
  // Fallback: try to read from curriculumData (if available)
  try {
    const curriculumDataPath = join(ROOT_DIR, 'src', 'features', 'teaching', 'data', 'curriculumData.js');
    // For now, use the static map. If needed, we can dynamically import curriculumData
    // but that's more complex due to ES modules.
  } catch (error) {
    // Ignore errors
  }
  
  // Default to beginner if unknown
  console.warn(`Unknown module level for ${moduleId}, defaulting to 'beginner'`);
  return 'beginner';
}

/**
 * Derive lessonId from filename
 * Converts "lesson-01-respiratory-mechanics.json" -> "lesson-01-respiratory-mechanics"
 * or "sdra-protocol.json" -> "sdra-protocol"
 */
function deriveLessonId(filename) {
  return filename.replace(/\.json$/, '');
}

/**
 * Get moduleId from file path
 */
function getModuleIdFromPath(filePath) {
  const relPath = relative(LESSONS_DIR, filePath);
  const parts = relPath.split(/[/\\]/);
  
  // Extract module ID from directory structure
  // e.g., "module-01-fundamentals/lesson-01.json" -> "module-01-fundamentals"
  if (parts.length > 0) {
    return parts[0];
  }
  return null;
}


/**
 * Read and parse a lesson JSON file
 */
function readLessonJSON(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Process a regular lesson file (not M03)
 */
function processRegularLesson(filePath) {
  const lessonData = readLessonJSON(filePath);
  if (!lessonData) return null;
  
  // Use moduleId from JSON file, fallback to directory name
  const moduleId = lessonData.moduleId || getModuleIdFromPath(filePath);
  if (!moduleId) return null;
  
  // Use lessonId from JSON file, fallback to filename
  const lessonId = lessonData.id || deriveLessonId(filePath.split(/[/\\]/).pop());
  const sections = lessonData.sections || [];
  const sectionsCount = sections.length;
  
  // Get metadata
  const metadata = lessonData.metadata || {};
  const allowEmpty = metadata.allowEmpty === true;
  
  // Filter: only include if sections.length > 0 OR metadata.allowEmpty === true
  if (sectionsCount === 0 && !allowEmpty) {
    return null; // Skip empty lessons
  }
  
  return {
    moduleId,
    lessonId,
    sectionsCount,
    allowEmpty,
  };
}

/**
 * Process M03 virtual lessons from subdirectories
 */
function processM03Lessons() {
  const M03_DIR = join(LESSONS_DIR, 'module-03-configuration');
  const virtualLessons = [];
  
  // Categories to process (excluding index.js and metadata.json)
  const categories = ['pathologies', 'protective-strategies', 'weaning'];
  
  categories.forEach(category => {
    const categoryDir = join(M03_DIR, category);
    if (!existsSync(categoryDir)) {
      return;
    }
    
    // Find all JSON files in this category directory
    const pattern = join(categoryDir, '*.json').replace(/\\/g, '/');
    const files = fg.sync(pattern);
    
    files.forEach(filePath => {
      const lessonData = readLessonJSON(filePath);
      if (!lessonData || !lessonData.title) {
        return; // Skip if no title (likely not a lesson)
      }
      
      const filename = filePath.split(/[/\\]/).pop();
      const lessonId = deriveLessonId(filename);
      const sections = lessonData.sections || [];
      const sectionsCount = sections.length;
      
      // Get metadata
      const metadata = lessonData.metadata || {};
      const allowEmpty = metadata.allowEmpty === true;
      
      // Filter: only include if sections.length > 0 OR metadata.allowEmpty === true
      if (sectionsCount === 0 && !allowEmpty) {
        return; // Skip empty lessons
      }
      
      virtualLessons.push({
        moduleId: 'module-03-configuration',
        lessonId,
        sectionsCount,
        allowEmpty,
      });
    });
  });
  
  return virtualLessons;
}

/**
 * Build the manifest
 */
function buildManifest() {
  console.log('Building lessons manifest...');
  
  // Find all lesson JSON files (excluding index.js, metadata.json, and M03 subdirectories)
  const pattern = join(LESSONS_DIR, '**', '*.json').replace(/\\/g, '/');
  const allFiles = fg.sync(pattern, {
    ignore: [
      '**/index.js',
      '**/metadata.json',
      '**/module-03-configuration/**/*.json', // Process M03 separately
    ],
  });
  
  const lessons = [];
  
  // Process regular lessons
  allFiles.forEach(filePath => {
    // Skip M03 (processed separately)
    const pathModuleId = getModuleIdFromPath(filePath);
    if (pathModuleId === 'module-03-configuration') {
      return;
    }
    
    const lesson = processRegularLesson(filePath);
    if (lesson) {
      lessons.push(lesson);
    }
  });
  
  // Process M03 virtual lessons
  const m03Lessons = processM03Lessons();
  lessons.push(...m03Lessons);
  
  // Group by level
  const lessonsByLevel = {
    beginner: [],
    intermediate: [],
    advanced: [],
  };
  
  lessons.forEach(lesson => {
    const level = getLevelFromModuleId(lesson.moduleId);
    if (lessonsByLevel[level]) {
      lessonsByLevel[level].push(lesson);
    }
  });
  
  // Calculate totals per level
  const levelsData = ['beginner', 'intermediate', 'advanced'].map(levelId => {
    const levelLessons = lessonsByLevel[levelId] || [];
    
    // Filter completable lessons (exclude allowEmpty from totals)
    const completableLessons = levelLessons.filter(lesson => !lesson.allowEmpty);
    
    // Calculate total pages (sections) for completable lessons
    const totalPages = completableLessons.reduce((sum, lesson) => sum + lesson.sectionsCount, 0);
    
    return {
      levelId,
      totalLessons: completableLessons.length,
      totalPages,
    };
  });
  
  // Build manifest structure
  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    levels: levelsData,
    lessons: lessons.map(lesson => ({
      moduleId: lesson.moduleId,
      lessonId: lesson.lessonId,
      sectionsCount: lesson.sectionsCount,
    })),
  };
  
  // Write manifest file
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  
  console.log(`✅ Manifest generated at ${MANIFEST_PATH}`);
  console.log(`   - Total lessons: ${lessons.length}`);
  console.log(`   - Beginner: ${levelsData[0].totalLessons} lessons, ${levelsData[0].totalPages} pages`);
  console.log(`   - Intermediate: ${levelsData[1].totalLessons} lessons, ${levelsData[1].totalPages} pages`);
  console.log(`   - Advanced: ${levelsData[2].totalLessons} lessons, ${levelsData[2].totalPages} pages`);
}

// Run the script
try {
  buildManifest();
  process.exit(0);
} catch (error) {
  console.error('Error building manifest:', error);
  process.exit(1);
}

