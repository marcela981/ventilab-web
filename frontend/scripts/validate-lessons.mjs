#!/usr/bin/env node

/**
 * =============================================================================
 * Lesson JSON Validation Script (ESM)
 * =============================================================================
 * This script validates lesson JSON files against the lessonSchema.json
 * and detects duplicate IDs and similar titles.
 *
 * Usage:
 *   node scripts/validate-lessons.mjs
 *   node scripts/validate-lessons.mjs --fix
 *   node scripts/validate-lessons.mjs -f
 *
 * Options:
 *   --fix, -f    Attempt to fix safe metadata issues (moduleId inference, formatting)
 * =============================================================================
 */

import { readFileSync, writeFileSync, promises as fs } from 'fs';
import { join, dirname, relative, resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import process from 'process';
import fg from 'fast-glob';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize AJV
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
  validateSchema: false
});
addFormats(ajv);

// Stopwords en español básicas
const STOPWORDS_ES = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'en', 'un', 'una', 'unos', 'unas',
  'y', 'o', 'pero', 'si', 'no', 'a', 'al', 'para', 'por', 'con', 'sin',
  'sobre', 'entre', 'hasta', 'desde', 'durante', 'mediante', 'según',
  'm01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10',
  'modulo', 'módulo', 'nivel', 'leccion', 'lección', 'lesson'
]);

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
 * toTitle: converts kebab-case to Title Case
 * @param {string} slug - Kebab-case string
 * @returns {string} Title Case string
 */
function toTitle(slug) {
  if (!slug || typeof slug !== 'string') return '';
  
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * normalizeTitle: normalizes title for comparison
 * @param {string} s - Input title
 * @returns {string} Normalized title
 */
function normalizeTitle(s) {
  if (!s || typeof s !== 'string') return '';
  
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => word.length > 0 && !STOPWORDS_ES.has(word))
    .join(' ')
    .trim();
}

/**
 * Generate trigrams from a string
 * @param {string} s - Input string
 * @returns {Set<string>} Set of trigrams
 */
function getTrigrams(s) {
  const normalized = normalizeTitle(s);
  const trigrams = new Set();
  
  for (let i = 0; i <= normalized.length - 3; i++) {
    const trigram = normalized.substring(i, i + 3);
    if (trigram.trim().length > 0) {
      trigrams.add(trigram);
    }
  }
  
  // Add bigrams if string is too short
  if (trigrams.size === 0 && normalized.length >= 2) {
    for (let i = 0; i <= normalized.length - 2; i++) {
      const bigram = normalized.substring(i, i + 2);
      if (bigram.trim().length > 0) {
        trigrams.add(bigram);
      }
    }
  }
  
  return trigrams;
}

/**
 * Calculate Jaccard similarity between two strings using trigrams
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score (0-1)
 */
function similarity(a, b) {
  if (!a || !b) return 0;
  
  const trigramsA = getTrigrams(a);
  const trigramsB = getTrigrams(b);
  
  if (trigramsA.size === 0 && trigramsB.size === 0) return 1;
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;
  
  // Calculate intersection
  let intersection = 0;
  for (const trigram of trigramsA) {
    if (trigramsB.has(trigram)) {
      intersection++;
    }
  }
  
  // Calculate union
  const union = new Set([...trigramsA, ...trigramsB]);
  
  return intersection / union.size;
}

/**
 * Infer moduleId from file path
 * @param {string} filePath - Absolute file path
 * @returns {string} Inferred moduleId
 */
function inferModuleId(filePath) {
  // Try to match patterns like module-01, M01, module-01-fundamentals, etc.
  const modulePattern = /(?:module-|M)(\d{2})/i;
  const match = filePath.match(modulePattern);
  
  if (match) {
    const num = match[1];
    return `module-${num}`;
  }
  
  // Try to match just digits in path
  const digitMatch = filePath.match(/(\d{2})/);
  if (digitMatch) {
    const num = digitMatch[1];
    return `module-${num}`;
  }
  
  // Fallback
  return 'M00';
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
 * Fix safe metadata issues (only metadata/structure, no clinical content)
 * @param {Object} lesson - Lesson object
 * @param {string} filePath - File path
 * @returns {Object} { fixed: boolean, originalJson: string }
 */
function fixMetadata(lesson, filePath) {
  const originalJson = JSON.stringify(lesson, null, 2) + '\n';
  let fixed = false;
  
  const filename = basename(filePath, '.json');
  
  // Fix id: generate from title or filename if missing/invalid
  if (!lesson.id || typeof lesson.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.id)) {
    const sourceForId = lesson.title || filename;
    lesson.id = slugify(sourceForId);
    fixed = true;
  }
  
  // Fix title: generate from id if missing/empty
  if (!lesson.title || typeof lesson.title !== 'string' || lesson.title.trim() === '') {
    lesson.title = toTitle(lesson.id || slugify(filename));
    fixed = true;
  }
  
  // Fix moduleId: infer from filePath if missing/empty
  if (!lesson.moduleId || typeof lesson.moduleId !== 'string' || lesson.moduleId.trim() === '') {
    lesson.moduleId = inferModuleId(filePath);
    fixed = true;
  }
  
  // Ensure metadata object exists
  if (!lesson.metadata || typeof lesson.metadata !== 'object') {
    lesson.metadata = {};
    fixed = true;
  }
  
  // Fix metadata.description: add placeholder if missing/empty
  if (!lesson.metadata.description || typeof lesson.metadata.description !== 'string' || lesson.metadata.description.trim() === '') {
    lesson.metadata.description = 'Descripción pendiente de curaduría (metadatos).';
    fixed = true;
  }
  
  // Update metadata.updatedAt timestamp if missing or if we made other fixes
  if (!lesson.metadata.updatedAt && !lesson.metadata.lastUpdated) {
    lesson.metadata.updatedAt = new Date().toISOString();
    fixed = true;
  } else if (fixed) {
    // If we fixed other things, update the timestamp
    lesson.metadata.updatedAt = new Date().toISOString();
  }
  
  // Ensure required arrays exist (empty arrays, no content generation)
  if (!Array.isArray(lesson.sections)) {
    lesson.sections = [];
    fixed = true;
  }
  
  if (!lesson.quiz || (typeof lesson.quiz !== 'object' && !Array.isArray(lesson.quiz))) {
    lesson.quiz = [];
    fixed = true;
  }
  
  if (!lesson.resources || (typeof lesson.resources !== 'object' && !Array.isArray(lesson.resources))) {
    lesson.resources = [];
    fixed = true;
  }
  
  // Compare before/after to determine if file should be saved
  const newJson = JSON.stringify(lesson, null, 2) + '\n';
  const hasChanges = originalJson !== newJson;
  
  return {
    fixed: hasChanges,
    originalJson,
    newJson
  };
}

/**
 * Main validation function
 */
async function main() {
  const args = process.argv.slice(2);
  const autoFix = args.includes('--fix') || args.includes('-f');
  
  // Load schema
  const schemaPath = join(__dirname, '..', 'src', 'data', 'schemas', 'lessonSchema.json');
  let schema;
  try {
    schema = loadJsonFile(schemaPath);
  } catch (error) {
    console.error(chalk.red(`❌ Schema file not found or invalid: ${schemaPath}`));
    console.error(chalk.red(`   Error: ${error.message}`));
    process.exit(1);
  }
  
  // Compile schema validator
  let schemaValidator;
  try {
    schemaValidator = ajv.compile(schema);
  } catch (error) {
    console.error(chalk.red(`❌ Failed to compile schema: ${error.message}`));
    process.exit(1);
  }
  
  // Find all lesson files
  const projectRoot = join(__dirname, '..');
  const lessonsPattern = 'src/data/lessons/**/*.json';
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
  console.log(chalk.cyan('║              VENTYLAB LESSON VALIDATION SCRIPT (HU-004)                   ║'));
  console.log(chalk.cyan('║                                                                            ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════╝\n'));
  
  if (autoFix) {
    console.log(chalk.yellow('⚠️  Auto-fix mode enabled: attempting to fix safe metadata issues\n'));
  }
  
  // Validation issues
  const issues = [];
  const idSet = new Map(); // id -> first file that used it
  const titleIndex = new Map(); // normalizeTitle(title) -> [{title: string, file: string}]
  
  // Validate each file
  for (const filePath of lessonFiles) {
    const relativePath = relative(process.cwd(), filePath);
    
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
    
    // Apply fixes if requested (before validation)
    if (autoFix) {
      const fixResult = fixMetadata(lesson, filePath);
      if (fixResult.fixed) {
        saveJsonFile(filePath, lesson);
        console.log(chalk.green(`  ✓ Fixed metadata in: ${relativePath}`));
      }
    }
    
    // Schema validation (after fixes, if any)
    const valid = schemaValidator(lesson);
    if (!valid) {
      const errors = schemaValidator.errors || [];
      for (const error of errors) {
        const path = error.instancePath || error.schemaPath || 'root';
        issues.push({
          file: relativePath,
          type: 'schema',
          message: `Schema validation error at ${path}: ${error.message}`
        });
      }
    }
    
    // Check for duplicate IDs (exact match)
    if (lesson.id && typeof lesson.id === 'string') {
      if (idSet.has(lesson.id)) {
        const existingFile = idSet.get(lesson.id);
        issues.push({
          file: relativePath,
          type: 'duplicate-id',
          message: `Duplicate ID '${lesson.id}': ${basename(relativePath)} conflicts with ${basename(existingFile)} (${existingFile})`
        });
      } else {
        idSet.set(lesson.id, relativePath);
      }
    }
    
    // Check for duplicate and similar titles
    if (lesson.title && typeof lesson.title === 'string') {
      const normalized = normalizeTitle(lesson.title);
      if (normalized) {
        // Check for exact duplicate (normalized title already exists)
        if (titleIndex.has(normalized)) {
          const existingEntries = titleIndex.get(normalized);
          for (const existing of existingEntries) {
            if (existing.file !== relativePath) {
              issues.push({
                file: relativePath,
                type: 'duplicate-title',
                message: `Duplicate title: "${lesson.title}" in ${basename(relativePath)} is semantically identical to "${existing.title}" in ${basename(existing.file)} (${existing.file})`
              });
            }
          }
        }
        
        // Check for similar titles (semantic similarity >= 0.92)
        // Compare against all previously seen titles
        for (const [existingNormalized, existingEntries] of titleIndex.entries()) {
          // Skip exact matches (already handled by duplicate-title)
          if (normalized === existingNormalized) {
            continue;
          }
          
          const sim = similarity(normalized, existingNormalized);
          if (sim >= 0.92) {
            // Report similarity for each existing entry (different files only)
            for (const existing of existingEntries) {
              if (existing.file !== relativePath) {
                issues.push({
                  file: relativePath,
                  type: 'similar-title',
                  message: `Similar title: "${lesson.title}" in ${basename(relativePath)} is semantically similar (${(sim * 100).toFixed(2)}%) to "${existing.title}" in ${basename(existing.file)} (${existing.file})`
                });
              }
            }
          }
        }
        
        // Add current title to index
        if (!titleIndex.has(normalized)) {
          titleIndex.set(normalized, []);
        }
        titleIndex.get(normalized).push({
          title: lesson.title,
          file: relativePath
        });
      }
    }
  }
  
  // Display results
  console.log();
  console.log(chalk.cyan('╔════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                            VALIDATION SUMMARY                              ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════╝'));
  console.log();
  
  console.log(chalk.blue(`ℹ️  Total files validated: ${lessonFiles.length}`));
  
  // Group issues by type
  const issuesByType = new Map();
  for (const issue of issues) {
    if (!issuesByType.has(issue.type)) {
      issuesByType.set(issue.type, []);
    }
    issuesByType.get(issue.type).push(issue);
  }
  
  // Display issues grouped by type (if any)
  if (issues.length > 0) {
    const typeLabels = {
      'parse': 'Parse Errors',
      'schema': 'Schema Validation Errors',
      'duplicate-id': 'Duplicate IDs',
      'duplicate-title': 'Duplicate Titles',
      'similar-title': 'Similar Titles'
    };
    
    const typeColors = {
      'parse': 'red',
      'schema': 'red',
      'duplicate-id': 'yellow',
      'duplicate-title': 'yellow',
      'similar-title': 'yellow'
    };
    
    for (const [type, typeIssues] of issuesByType.entries()) {
      const label = typeLabels[type] || type;
      const color = typeColors[type] || 'red';
      const symbol = type === 'parse' || type === 'schema' ? '❌' : '⚠️';
      
      console.log();
      console.log(chalk[color](`${symbol} ${label} (${typeIssues.length}):`));
      
      for (const issue of typeIssues) {
        console.log(chalk[color](`   ${issue.file}: ${issue.message}`));
      }
    }
  }
  
  console.log();
  
  // Important: Even with --fix, if there are still errors after fixing, fail
  if (issues.length > 0) {
    console.log(chalk.red(`❌ Validation failed with ${issues.length} issue(s)`));
    if (autoFix) {
      console.log(chalk.yellow(`   (Some issues remain after auto-fix - manual intervention required)`));
    }
    console.log();
    process.exit(1);
  } else {
    console.log(chalk.green(`✅ All lessons are valid!`));
    if (autoFix) {
      console.log(chalk.green(`   (Auto-fix applied successfully)`));
    }
    console.log();
    process.exit(0);
  }
}

// Run validation
main().catch(error => {
  console.error(chalk.red(`❌ Error executing validation: ${error.message}`));
  console.error(error);
  process.exit(1);
});
