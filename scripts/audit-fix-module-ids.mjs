#!/usr/bin/env node

/**
 * =============================================================================
 * Module ID Audit and Fix Script
 * =============================================================================
 * This script audits all lesson JSON files in level 1 to ensure:
 * - Each card has a unique moduleId
 * - Each lesson belongs only to its card
 * - moduleId matches the folder name (if folder reflects module)
 * - No duplicate IDs or titles
 * - IDs are in kebab-case
 *
 * Usage:
 *   node scripts/audit-fix-module-ids.mjs          # Audit only (check mode)
 *   node scripts/audit-fix-module-ids.mjs --fix    # Audit and fix
 * =============================================================================
 */

import { readFileSync, writeFileSync, promises as fs } from 'fs';
import { join, dirname, relative, resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import process from 'process';
import fg from 'fast-glob';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Slugify: converts string to kebab-case
 * @param {string} s - Input string
 * @returns {string} Kebab-case string
 */
function slugify(s) {
  if (!s || typeof s !== 'string') return '';
  
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with -
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing dashes
}

/**
 * Extract module folder name from file path
 * @param {string} filePath - Absolute file path
 * @param {string} lessonsRoot - Root of lessons directory
 * @returns {string|null} Module folder name or null
 */
function extractModuleFolder(filePath, lessonsRoot) {
  const relativePath = relative(lessonsRoot, filePath);
  const parts = relativePath.split(/[/\\]/);
  
  // Skip filename, get parent folder
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  
  return null;
}

/**
 * Determine if folder reflects a module (should be used as moduleId)
 * @param {string} folderName - Folder name
 * @returns {boolean} True if folder should be used as moduleId
 */
function isModuleFolder(folderName) {
  if (!folderName) return false;
  
  // Known module folders that should have their own moduleId
  const moduleFolders = [
    'module-01-fundamentals',
    'respiratory-anatomy',
    'respiratory-physiology',
    'ventilation-principles'
  ];
  
  // Check if it's a known module folder or matches module pattern
  if (moduleFolders.includes(folderName)) {
    return true;
  }
  
  // Check if it matches module pattern (module-XX-*)
  if (/^module-\d{2}-/.test(folderName)) {
    return true;
  }
  
  // Check if it's a standalone module folder (not a subfolder like pathologies, weaning, etc.)
  // Subfolders like 'pathologies', 'weaning', 'protective-strategies' should not be used as moduleId
  const subfolders = ['pathologies', 'weaning', 'protective-strategies', 'protocols', 'troubleshooting'];
  if (subfolders.includes(folderName)) {
    return false;
  }
  
  // For other folders, if they look like module names (kebab-case, no numbers at start)
  return /^[a-z][a-z0-9-]+$/.test(folderName);
}

/**
 * Load JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Object} Parsed JSON object
 * @throws {Error} If file cannot be read or parsed
 */
function loadJsonFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON syntax: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Save JSON file with proper formatting
 * @param {string} filePath - Path to JSON file
 * @param {Object} data - Data to save
 */
function saveJsonFile(filePath, data) {
  const formatted = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(filePath, formatted, 'utf8');
}

/**
 * Generate ID from filename or title
 * @param {string} filePath - File path
 * @param {Object} lesson - Lesson object
 * @returns {string} Generated ID
 */
function generateId(filePath, lesson) {
  const filename = basename(filePath, '.json');
  
  // Try to extract ID from filename (e.g., lesson-01-respiratory-anatomy -> respiratory-anatomy)
  const filenameMatch = filename.match(/lesson-\d+-(.+)$/);
  if (filenameMatch) {
    return filenameMatch[1];
  }
  
  // Remove common prefixes
  let id = filename
    .replace(/^lesson-?/i, '')
    .replace(/^\d+-/, '');
  
  // If still no good ID, use title
  if (!id || id === filename) {
    id = lesson.title || filename;
  }
  
  return slugify(id);
}

/**
 * Fix lesson metadata
 * @param {Object} lesson - Lesson object
 * @param {string} filePath - File path
 * @param {string} expectedModuleId - Expected moduleId based on folder
 * @returns {Object} { fixed: boolean, changes: string[] }
 */
function fixLesson(lesson, filePath, expectedModuleId) {
  const originalJson = JSON.stringify(lesson, null, 2);
  const changes = [];
  let fixed = false;
  
  const filename = basename(filePath, '.json');
  
  // Fix id: ensure it exists and is in kebab-case
  if (!lesson.id || typeof lesson.id !== 'string') {
    // Use title or titulo to generate ID
    const titleForId = lesson.title || lesson.titulo || filename;
    lesson.id = generateId(filePath, { title: titleForId });
    changes.push(`Added missing id: "${lesson.id}"`);
    fixed = true;
  } else {
    const slugifiedId = slugify(lesson.id);
    if (lesson.id !== slugifiedId) {
      changes.push(`Fixed id: "${lesson.id}" -> "${slugifiedId}"`);
      lesson.id = slugifiedId;
      fixed = true;
    }
  }
  
  // Fix moduleId: normalize based on folder
  if (expectedModuleId) {
    if (!lesson.moduleId || lesson.moduleId !== expectedModuleId) {
      const oldModuleId = lesson.moduleId || '(missing)';
      changes.push(`Fixed moduleId: "${oldModuleId}" -> "${expectedModuleId}"`);
      lesson.moduleId = expectedModuleId;
      fixed = true;
    }
  } else if (!lesson.moduleId || typeof lesson.moduleId !== 'string') {
    // If no expected moduleId and missing, generate from folder
    const folderName = extractModuleFolder(filePath, join(__dirname, '..', 'src', 'data', 'lessons'));
    if (folderName && isModuleFolder(folderName)) {
      lesson.moduleId = folderName;
      changes.push(`Added moduleId from folder: "${lesson.moduleId}"`);
      fixed = true;
    }
  }
  
  // Ensure metadata object exists
  if (!lesson.metadata || typeof lesson.metadata !== 'object') {
    lesson.metadata = {};
    fixed = true;
  }
  
  // Update metadata.version if missing
  if (!lesson.metadata.version) {
    lesson.metadata.version = '1.0.0';
    changes.push('Added metadata.version: "1.0.0"');
    fixed = true;
  }
  
  // Update lastUpdated or updatedAt
  const now = new Date().toISOString();
  if (!lesson.metadata.lastUpdated && !lesson.metadata.updatedAt) {
    lesson.metadata.lastUpdated = now;
    changes.push(`Added metadata.lastUpdated: "${now}"`);
    fixed = true;
  } else if (fixed) {
    // If we made other fixes, update the timestamp
    if (lesson.metadata.lastUpdated) {
      lesson.metadata.lastUpdated = now;
    } else {
      lesson.metadata.updatedAt = now;
    }
    changes.push(`Updated metadata timestamp`);
  }
  
  // Ensure updatedAt exists for consistency
  if (!lesson.metadata.updatedAt && lesson.metadata.lastUpdated) {
    lesson.metadata.updatedAt = lesson.metadata.lastUpdated;
  }
  
  return { fixed, changes };
}

/**
 * Main audit function
 */
async function main() {
  const args = process.argv.slice(2);
  const autoFix = args.includes('--fix');
  
  // Find all lesson files
  const projectRoot = join(__dirname, '..');
  const lessonsRoot = join(projectRoot, 'src', 'data', 'lessons');
  const lessonsPattern = 'src/features/teaching/data/lessons/**/*.json';
  const lessonFiles = await fg(lessonsPattern, {
    cwd: projectRoot,
    ignore: ['**/node_modules/**', '**/schemas/**', '**/metadata.json'],
    absolute: true,
  });
  
  if (lessonFiles.length === 0) {
    console.warn(chalk.yellow('⚠️  No lesson files found'));
    process.exit(0);
  }
  
  console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                                                                            ║'));
  console.log(chalk.cyan('║              MODULE ID AUDIT AND FIX SCRIPT (LEVEL 1)                     ║'));
  console.log(chalk.cyan('║                                                                            ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════╝\n'));
  
  if (autoFix) {
    console.log(chalk.yellow('⚠️  Auto-fix mode enabled: will fix issues automatically\n'));
  } else {
    console.log(chalk.blue('ℹ️  Check mode: reporting issues only (use --fix to apply fixes)\n'));
  }
  
  // Build index: lessonId -> [{ moduleId, file, title }]
  const lessonIndex = new Map();
  const moduleIndex = new Map(); // moduleId -> [{ lessonId, file }]
  const titleIndex = new Map(); // title -> [{ lessonId, file }]
  
  const issues = [];
  const fixes = [];
  
  // First pass: load all lessons and build index
  for (const filePath of lessonFiles) {
    const relativePath = relative(process.cwd(), filePath);
    
    // Extract module folder
    const folderName = extractModuleFolder(filePath, lessonsRoot);
    const expectedModuleId = folderName && isModuleFolder(folderName) ? folderName : null;
    
    // Parse JSON
    let lesson;
    try {
      lesson = loadJsonFile(filePath);
    } catch (error) {
      issues.push({
        file: relativePath,
        type: 'parse',
        message: error.message
      });
      continue;
    }
    
    // Skip files that are arrays or not lesson objects
    if (Array.isArray(lesson)) {
      // Skip arrays (like visual elements lists)
      continue;
    }
    
    // Skip if it doesn't look like a lesson object
    // A lesson should have at least id/title and sections/content
    const hasLessonStructure = (
      (lesson.id || lesson.title) &&
      (lesson.sections || lesson.content || lesson.titulo || lesson.conceptos_teoricos)
    );
    
    if (!hasLessonStructure) {
      // Skip metadata files and other non-lesson JSON files
      continue;
    }
    
    // Get or generate ID
    const lessonId = lesson.id || generateId(filePath, lesson);
    const moduleId = lesson.moduleId || expectedModuleId || 'unknown';
    const title = lesson.title || lesson.titulo || '(no title)';
    
    // Check for missing or invalid ID
    if (!lesson.id) {
      issues.push({
        file: relativePath,
        type: 'missing-id',
        message: `Missing id field. Expected: "${lessonId}"`
      });
    } else if (lesson.id !== slugify(lesson.id)) {
      issues.push({
        file: relativePath,
        type: 'invalid-id-format',
        message: `ID is not in kebab-case: "${lesson.id}" -> "${slugify(lesson.id)}"`
      });
    }
    
    // Check moduleId mismatch
    if (expectedModuleId && lesson.moduleId !== expectedModuleId) {
      issues.push({
        file: relativePath,
        type: 'module-id-mismatch',
        message: `moduleId "${lesson.moduleId || '(missing)'}" does not match folder "${folderName}". Expected: "${expectedModuleId}"`
      });
    }
    
    // Special check: respiratory-anatomy, respiratory-physiology, ventilation-principles
    // should NOT have moduleId: "module-01-fundamentals"
    if (folderName === 'respiratory-anatomy' || folderName === 'respiratory-physiology' || folderName === 'ventilation-principles') {
      if (lesson.moduleId === 'module-01-fundamentals') {
        issues.push({
          file: relativePath,
          type: 'wrong-module-id',
          message: `Lesson in "${folderName}" folder has moduleId "module-01-fundamentals". Should be "${folderName}"`
        });
      }
    }
    
    // Build indices
    if (!lessonIndex.has(lessonId)) {
      lessonIndex.set(lessonId, []);
    }
    lessonIndex.get(lessonId).push({ moduleId, file: relativePath, title, folderName });
    
    if (!moduleIndex.has(moduleId)) {
      moduleIndex.set(moduleId, []);
    }
    moduleIndex.get(moduleId).push({ lessonId, file: relativePath, title });
    
    if (!titleIndex.has(title)) {
      titleIndex.set(title, []);
    }
    titleIndex.get(title).push({ lessonId, file: relativePath, moduleId });
  }
  
  // Second pass: detect duplicates and issues
  // Check for duplicate IDs
  for (const [lessonId, entries] of lessonIndex.entries()) {
    if (entries.length > 1) {
      const files = entries.map(e => e.file).join(', ');
      issues.push({
        type: 'duplicate-id',
        message: `Duplicate lesson ID "${lessonId}" found in: ${files}`
      });
    }
  }
  
  // Check for duplicate titles
  for (const [title, entries] of titleIndex.entries()) {
    if (title !== '(no title)' && entries.length > 1) {
      const files = entries.map(e => `${e.file} (${e.lessonId})`).join(', ');
      issues.push({
        type: 'duplicate-title',
        message: `Duplicate title "${title}" found in: ${files}`
      });
    }
  }
  
  // Check for lessons with wrong moduleId in level 1 folders
  for (const filePath of lessonFiles) {
    const relativePath = relative(process.cwd(), filePath);
    const folderName = extractModuleFolder(filePath, lessonsRoot);
    
    if (folderName === 'respiratory-anatomy' || folderName === 'respiratory-physiology' || folderName === 'ventilation-principles') {
      try {
        const lesson = loadJsonFile(filePath);
        
        // Skip arrays and non-lesson files
        if (Array.isArray(lesson)) continue;
        const hasLessonStructure = (
          (lesson.id || lesson.title || lesson.titulo) &&
          (lesson.sections || lesson.content || lesson.titulo || lesson.conceptos_teoricos)
        );
        if (!hasLessonStructure) continue;
        
        if (lesson.moduleId === 'module-01-fundamentals') {
          issues.push({
            file: relativePath,
            type: 'wrong-module-id',
            message: `Lesson in "${folderName}" has moduleId "module-01-fundamentals" instead of "${folderName}"`
          });
        }
      } catch (error) {
        // Already reported in first pass
      }
    }
  }
  
  // Apply fixes if requested
  if (autoFix) {
    for (const filePath of lessonFiles) {
      const relativePath = relative(process.cwd(), filePath);
      const folderName = extractModuleFolder(filePath, lessonsRoot);
      const expectedModuleId = folderName && isModuleFolder(folderName) ? folderName : null;
      
      try {
        const lesson = loadJsonFile(filePath);
        
        // Skip arrays and non-lesson files
        if (Array.isArray(lesson)) continue;
        const hasLessonStructure = (
          (lesson.id || lesson.title || lesson.titulo) &&
          (lesson.sections || lesson.content || lesson.titulo || lesson.conceptos_teoricos)
        );
        if (!hasLessonStructure) continue;
        
        const fixResult = fixLesson(lesson, filePath, expectedModuleId);
        
        if (fixResult.fixed) {
          saveJsonFile(filePath, lesson);
          fixes.push({
            file: relativePath,
            changes: fixResult.changes
          });
        }
      } catch (error) {
        // Skip files with parse errors
      }
    }
  }
  
  // Display results
  console.log();
  console.log(chalk.cyan('╔════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                            AUDIT SUMMARY                                  ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════╝'));
  console.log();
  
  console.log(chalk.blue(`ℹ️  Total files scanned: ${lessonFiles.length}`));
  console.log(chalk.blue(`ℹ️  Unique lesson IDs: ${lessonIndex.size}`));
  console.log(chalk.blue(`ℹ️  Unique modules: ${moduleIndex.size}`));
  
  // Display fixes applied
  if (fixes.length > 0) {
    console.log();
    console.log(chalk.green(`✅ Fixed ${fixes.length} file(s):`));
    for (const fix of fixes) {
      console.log(chalk.green(`   ${fix.file}:`));
      for (const change of fix.changes) {
        console.log(chalk.green(`     - ${change}`));
      }
    }
  }
  
  // Display issues
  if (issues.length > 0) {
    console.log();
    const issuesByType = new Map();
    for (const issue of issues) {
      const type = issue.type || 'unknown';
      if (!issuesByType.has(type)) {
        issuesByType.set(type, []);
      }
      issuesByType.get(type).push(issue);
    }
    
    const typeLabels = {
      'parse': 'Parse Errors',
      'missing-id': 'Missing IDs',
      'invalid-id-format': 'Invalid ID Format',
      'module-id-mismatch': 'Module ID Mismatch',
      'wrong-module-id': 'Wrong Module ID (Level 1)',
      'duplicate-id': 'Duplicate IDs',
      'duplicate-title': 'Duplicate Titles'
    };
    
    const typeColors = {
      'parse': 'red',
      'missing-id': 'yellow',
      'invalid-id-format': 'yellow',
      'module-id-mismatch': 'yellow',
      'wrong-module-id': 'red',
      'duplicate-id': 'red',
      'duplicate-title': 'yellow'
    };
    
    for (const [type, typeIssues] of issuesByType.entries()) {
      const label = typeLabels[type] || type;
      const color = typeColors[type] || 'red';
      const symbol = type === 'parse' || type === 'wrong-module-id' || type === 'duplicate-id' ? '❌' : '⚠️';
      
      console.log();
      console.log(chalk[color](`${symbol} ${label} (${typeIssues.length}):`));
      
      for (const issue of typeIssues) {
        if (issue.file) {
          console.log(chalk[color](`   ${issue.file}: ${issue.message}`));
        } else {
          console.log(chalk[color](`   ${issue.message}`));
        }
      }
    }
  }
  
  console.log();
  
  // Exit with error if there are critical issues
  const criticalIssues = issues.filter(i => 
    i.type === 'parse' || 
    i.type === 'wrong-module-id' || 
    i.type === 'duplicate-id'
  );
  
  if (criticalIssues.length > 0) {
    console.log(chalk.red(`❌ Audit failed with ${criticalIssues.length} critical issue(s)`));
    if (!autoFix) {
      console.log(chalk.yellow(`   Run with --fix to attempt automatic fixes`));
    }
    console.log();
    process.exit(1);
  } else if (issues.length > 0) {
    console.log(chalk.yellow(`⚠️  Audit completed with ${issues.length} non-critical issue(s)`));
    if (!autoFix) {
      console.log(chalk.yellow(`   Run with --fix to attempt automatic fixes`));
    }
    console.log();
    process.exit(0);
  } else {
    console.log(chalk.green(`✅ All lessons are valid!`));
    if (autoFix && fixes.length > 0) {
      console.log(chalk.green(`   Applied ${fixes.length} fix(es)`));
    }
    console.log();
    process.exit(0);
  }
}

// Run audit
main().catch(error => {
  console.error(chalk.red(`❌ Error executing audit: ${error.message}`));
  console.error(error);
  process.exit(1);
});

