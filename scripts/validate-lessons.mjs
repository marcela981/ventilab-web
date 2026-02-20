#!/usr/bin/env node

/**
 * =============================================================================
 * Lesson JSON Validation Script (ESM)
 * =============================================================================
 * This script validates lesson JSON files against the lessonSchema.json
 * and performs additional validations:
 * 1. Schema validation using Ajv
 * 2. Verifies sections.order is consecutive 1..N without gaps/duplicates
 * 3. Reports page count per lesson (number of sections)
 * 4. Fails if page count is 0
 * 5. Semantic linter (non-blocking):
 *    - Allows common titles marked as templates (metadata.sectionTemplate=true)
 *    - Warns if two sections with the same title have identical content (hash)
 *      in different lessons
 *    - Suggests renaming when there are unmarked template collisions
 *    - Prints warnings and summary by level (metadata.level)
 * 6. Fails in CI if validation fails (semantic warnings don't block)
 *
 * Usage:
 *   node scripts/validate-lessons.mjs
 * =============================================================================
 */

import { readFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
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
 * Validate sections order is consecutive 1..N without gaps/duplicates
 * @param {Array} sections - Array of section objects
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
function validateSectionsOrder(sections) {
  const errors = [];
  
  if (!Array.isArray(sections) || sections.length === 0) {
    return { valid: false, errors: ['Sections array is empty or invalid'] };
  }
  
  // Extract orders and check for duplicates
  const orders = sections
    .map((section, index) => {
      if (!section || typeof section !== 'object') {
        errors.push(`Section at index ${index} is not a valid object`);
        return null;
      }
      if (typeof section.order !== 'number') {
        errors.push(`Section "${section.id || index}" has invalid order: ${section.order} (must be a number)`);
        return null;
      }
      return section.order;
    })
    .filter(order => order !== null);
  
  // Check for duplicates
  const orderSet = new Set();
  const duplicates = new Set();
  orders.forEach((order, index) => {
    if (orderSet.has(order)) {
      duplicates.add(order);
      errors.push(`Duplicate order ${order} found in sections`);
    }
    orderSet.add(order);
  });
  
  // Check for consecutive sequence starting from 1
  const sortedOrders = [...orders].sort((a, b) => a - b);
  const minOrder = Math.min(...sortedOrders);
  const maxOrder = Math.max(...sortedOrders);
  
  if (minOrder !== 1) {
    errors.push(`Sections order must start from 1, but found minimum order: ${minOrder}`);
  }
  
  // Check for gaps
  for (let expected = 1; expected <= maxOrder; expected++) {
    if (!orderSet.has(expected)) {
      errors.push(`Missing order ${expected} in sections (found orders: ${sortedOrders.join(', ')})`);
    }
  }
  
  // Check for orders beyond the expected range
  if (maxOrder > sections.length) {
    errors.push(`Maximum order ${maxOrder} exceeds number of sections ${sections.length}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Count pages (sections) in a lesson
 * @param {Object} lesson - Lesson object
 * @returns {number} Number of pages (sections)
 */
function countPages(lesson) {
  if (!lesson.sections || !Array.isArray(lesson.sections)) {
    return 0;
  }
  return lesson.sections.length;
}

/**
 * Calculate hash of section content body (excluding metadata.sectionTemplate)
 * @param {Object} section - Section object
 * @returns {string} SHA-256 hash of the section content
 */
function hashSectionContent(section) {
  // Create a copy of the section without metadata that shouldn't affect content comparison
  const contentBody = {
    id: section.id,
    title: section.title,
    type: section.type,
    content: section.content,
    media: section.media,
    order: section.order
  };
  
  // Remove metadata.sectionTemplate from consideration for hash
  // but include all other metadata that might affect content
  if (section.metadata) {
    const metadataCopy = { ...section.metadata };
    delete metadataCopy.sectionTemplate;
    if (Object.keys(metadataCopy).length > 0) {
      contentBody.metadata = metadataCopy;
    }
  }
  
  // Sort keys recursively and serialize to JSON for consistent hashing
  function sortKeys(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(sortKeys);
    }
    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = sortKeys(obj[key]);
    });
    return sorted;
  }
  
  const sortedBody = sortKeys(contentBody);
  const serialized = JSON.stringify(sortedBody);
  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Semantic linter: detects duplicate section titles with identical content
 * @param {Array} lessons - Array of { file, lesson } objects
 * @returns {Object} { warnings: Array, summaryByLevel: Map }
 */
function semanticLinter(lessons) {
  const warnings = [];
  const sectionsByTitle = new Map(); // title -> Array of { file, lessonId, section, hash, level }
  const summaryByLevel = new Map(); // level -> { total: number, templates: number, collisions: number, suggestions: number }
  
  // Collect all sections grouped by title
  for (const { file, lesson } of lessons) {
    if (!lesson.sections || !Array.isArray(lesson.sections)) {
      continue;
    }
    
    const level = lesson.metadata?.level || 'unknown';
    const lessonId = lesson.id || 'unknown';
    
    for (const section of lesson.sections) {
      if (!section.title) {
        continue;
      }
      
      const hash = hashSectionContent(section);
      const isTemplate = section.metadata?.sectionTemplate === true;
      
      if (!sectionsByTitle.has(section.title)) {
        sectionsByTitle.set(section.title, []);
      }
      
      sectionsByTitle.get(section.title).push({
        file,
        lessonId,
        section,
        hash,
        level,
        isTemplate
      });
    }
  }
  
  // Analyze sections with same title
  for (const [title, sections] of sectionsByTitle.entries()) {
    if (sections.length < 2) {
      continue; // No collision if only one section with this title
    }
    
    // Group by hash to find identical content
    const sectionsByHash = new Map();
    for (const sectionData of sections) {
      if (!sectionsByHash.has(sectionData.hash)) {
        sectionsByHash.set(sectionData.hash, []);
      }
      sectionsByHash.get(sectionData.hash).push(sectionData);
    }
    
    // Check for collisions
    const templates = sections.filter(s => s.isTemplate);
    const nonTemplates = sections.filter(s => !s.isTemplate);
    
    // Warn about identical content in different lessons (if not all are templates)
    for (const [hash, hashSections] of sectionsByHash.entries()) {
      if (hashSections.length < 2) {
        continue; // No duplicate content
      }
      
      const hashTemplates = hashSections.filter(s => s.isTemplate);
      const hashNonTemplates = hashSections.filter(s => !s.isTemplate);
      
      // If all are templates, that's fine
      if (hashTemplates.length === hashSections.length) {
        continue;
      }
      
      // If some are templates and some are not, or all are non-templates, warn
      if (hashNonTemplates.length > 0) {
        const lessonFiles = hashSections.map(s => `${s.lessonId} (${s.file})`).join(', ');
        
        // Check if they're in different lessons
        const uniqueLessons = new Set(hashSections.map(s => s.lessonId));
        if (uniqueLessons.size > 1) {
          warnings.push({
            type: 'duplicate-content',
            title,
            message: `Sección "${title}" tiene contenido idéntico (mismo hash) en ${hashSections.length} instancia(s) en lecciones distintas: ${lessonFiles}`,
            sections: hashSections,
            isTemplate: hashTemplates.length > 0
          });
        }
      }
    }
    
    // Check for title collisions (same title, different content)
    if (sectionsByHash.size > 1 && nonTemplates.length > 0) {
      // Multiple different content with same title and not all are templates
      const uniqueLessons = new Set(sections.map(s => s.lessonId));
      if (uniqueLessons.size > 1) {
        // Suggest renaming if not all are templates
        const nonTemplateSections = sections.filter(s => !s.isTemplate);
        if (nonTemplateSections.length > 1) {
          warnings.push({
            type: 'title-collision',
            title,
            message: `Sección "${title}" aparece en ${sections.length} instancia(s) con contenido diferente. Considera renombrar si no es una plantilla.`,
            sections: nonTemplateSections,
            isTemplate: false
          });
        }
      }
    }
    
    // Note: We'll count sections globally after processing all titles to avoid duplicates
  }
  
  // Count all sections by level (globally, counting each section once)
  const allProcessedSections = new Set();
  for (const { file, lesson } of lessons) {
    if (!lesson.sections || !Array.isArray(lesson.sections)) {
      continue;
    }
    
    const level = lesson.metadata?.level || 'unknown';
    
    for (const section of lesson.sections) {
      if (!section.title) {
        continue;
      }
      
      const sectionKey = `${file}:${lesson.id || 'unknown'}:${section.id}`;
      if (!allProcessedSections.has(sectionKey)) {
        if (!summaryByLevel.has(level)) {
          summaryByLevel.set(level, {
            total: 0,
            templates: 0,
            collisions: 0,
            suggestions: 0
          });
        }
        
        const summary = summaryByLevel.get(level);
        summary.total++;
        allProcessedSections.add(sectionKey);
        
        if (section.metadata?.sectionTemplate === true) {
          summary.templates++;
        }
      }
    }
  }
  
  // Count collisions and suggestions by level (count each unique warning once per level it affects)
  for (const warning of warnings) {
    const levelsInWarning = new Set(warning.sections.map(s => s.level));
    for (const level of levelsInWarning) {
      if (!summaryByLevel.has(level)) {
        summaryByLevel.set(level, {
          total: 0,
          templates: 0,
          collisions: 0,
          suggestions: 0
        });
      }
      
      const summary = summaryByLevel.get(level);
      if (warning.type === 'duplicate-content') {
        summary.collisions++;
      } else if (warning.type === 'title-collision') {
        summary.suggestions++;
      }
    }
  }
  
  return { warnings, summaryByLevel };
}

/**
 * Main validation function
 */
async function main() {
  // Load schema
  const schemaPath = join(__dirname, '..', 'src', 'features', 'teaching', 'data', 'schemas', 'lessonSchema.json');
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
  const lessonsPattern = 'src/features/teaching/data/lessons/**/*.json';
  const lessonFiles = await fg(lessonsPattern, {
    cwd: projectRoot,
    ignore: ['**/node_modules/**', '**/schemas/**', '**/metadata.json', '**/index.js'],
    absolute: true,
  });
  
  if (lessonFiles.length === 0) {
    console.warn(chalk.yellow('⚠️  No lesson files found'));
    process.exit(0);
  }
  
  console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                                                                            ║'));
  console.log(chalk.cyan('║              VENTYLAB LESSON VALIDATION SCRIPT                              ║'));
  console.log(chalk.cyan('║                                                                            ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════╝\n'));
  
  // Validation issues
  const issues = [];
  const pageCounts = [];
  const validLessons = []; // Store valid lessons for semantic linting
  
  // Validate each file
  for (const filePath of lessonFiles) {
    const relativePath = relative(projectRoot, filePath);
    
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
    
    // Schema validation
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
    
    // Count pages (sections)
    const pageCount = countPages(lesson);
    pageCounts.push({
      file: relativePath,
      lessonId: lesson.id || 'unknown',
      moduleId: lesson.moduleId || 'unknown',
      pages: pageCount
    });
    
    // Validate sections order (only if sections exist)
    let hasOrderErrors = false;
    if (lesson.sections && Array.isArray(lesson.sections) && lesson.sections.length > 0) {
      const orderValidation = validateSectionsOrder(lesson.sections);
      if (!orderValidation.valid) {
        hasOrderErrors = true;
        for (const error of orderValidation.errors) {
          issues.push({
            file: relativePath,
            type: 'sections-order',
            message: error
          });
        }
      }
    } else if (pageCount === 0) {
      // Fail if no sections (0 pages)
      issues.push({
        file: relativePath,
        type: 'zero-pages',
        message: `Lesson has 0 pages (no sections found). Lessons must have at least one section.`
      });
    }
    
    // Store lesson for semantic linting if it passed basic validation
    if (!hasOrderErrors && pageCount > 0 && valid) {
      validLessons.push({
        file: relativePath,
        lesson
      });
    }
  }
  
  // Display page counts
  console.log(chalk.blue('\n📊 Page Counts by Lesson:'));
  console.log(chalk.blue('─────────────────────────────────────────────────────────────────────────────\n'));
  
  // Group by module
  const byModule = new Map();
  for (const count of pageCounts) {
    const moduleId = count.moduleId;
    if (!byModule.has(moduleId)) {
      byModule.set(moduleId, []);
    }
    byModule.get(moduleId).push(count);
  }
  
  // Display grouped by module
  for (const [moduleId, lessons] of byModule.entries()) {
    console.log(chalk.cyan(`  ${moduleId}:`));
    for (const count of lessons) {
      const status = count.pages === 0 ? chalk.red('❌') : chalk.green('✓');
      const pageDisplay = count.pages === 0 
        ? chalk.red(`${count.pages}`) 
        : chalk.green(`${count.pages}`);
      console.log(`    ${status} ${chalk.yellow(count.lessonId)}: ${pageDisplay} páginas`);
    }
    console.log();
  }
  
  // Run semantic linter on valid lessons
  let semanticWarnings = [];
  let semanticSummaryByLevel = new Map();
  
  if (validLessons.length > 0) {
    console.log(chalk.blue('\n🔍 Running semantic linter...'));
    const semanticResult = semanticLinter(validLessons);
    semanticWarnings = semanticResult.warnings;
    semanticSummaryByLevel = semanticResult.summaryByLevel;
  }
  
  // Display semantic linting warnings (non-blocking)
  if (semanticWarnings.length > 0) {
    console.log(chalk.yellow('\n╔════════════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.yellow('║                    SEMANTIC LINTER WARNINGS (Non-blocking)                  ║'));
    console.log(chalk.yellow('╚════════════════════════════════════════════════════════════════════════════╝\n'));
    
    // Group warnings by type
    const duplicateContentWarnings = semanticWarnings.filter(w => w.type === 'duplicate-content');
    const titleCollisionWarnings = semanticWarnings.filter(w => w.type === 'title-collision');
    
    if (duplicateContentWarnings.length > 0) {
      console.log(chalk.yellow(`⚠️  Contenido duplicado (${duplicateContentWarnings.length} advertencia(s)):`));
      console.log();
      
      for (const warning of duplicateContentWarnings) {
        console.log(chalk.yellow(`   📄 Sección: "${warning.title}"`));
        if (warning.isTemplate) {
          console.log(chalk.blue(`      ℹ️  Algunas instancias están marcadas como plantilla (metadata.sectionTemplate=true)`));
        }
        console.log(chalk.yellow(`      ${warning.message}`));
        
        // Show unique lessons affected
        const uniqueLessons = [...new Set(warning.sections.map(s => s.lessonId))];
        console.log(chalk.gray(`      Lecciones afectadas: ${uniqueLessons.join(', ')}`));
        console.log();
      }
    }
    
    if (titleCollisionWarnings.length > 0) {
      console.log(chalk.yellow(`💡 Sugerencias de renombre (${titleCollisionWarnings.length} advertencia(s)):`));
      console.log();
      
      for (const warning of titleCollisionWarnings) {
        console.log(chalk.yellow(`   📄 Sección: "${warning.title}"`));
        console.log(chalk.yellow(`      ${warning.message}`));
        
        // Show suggestions for renaming
        const uniqueLessons = [...new Set(warning.sections.map(s => s.lessonId))];
        console.log(chalk.gray(`      Lecciones afectadas: ${uniqueLessons.join(', ')}`));
        console.log(chalk.blue(`      💡 Sugerencia: Si estas secciones tienen contenido diferente, considera renombrarlas para mayor claridad. Si son plantillas, marca con metadata.sectionTemplate=true`));
        console.log();
      }
    }
  } else {
    console.log(chalk.green('✅ No semantic linting warnings found'));
  }
  
  // Display semantic summary by level
  if (semanticSummaryByLevel.size > 0) {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║                    SEMANTIC LINTER SUMMARY BY LEVEL                        ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════╝\n'));
    
    // Sort levels for consistent display
    const sortedLevels = [...semanticSummaryByLevel.entries()].sort((a, b) => {
      // Put 'unknown' last
      if (a[0] === 'unknown') return 1;
      if (b[0] === 'unknown') return -1;
      return a[0].localeCompare(b[0]);
    });
    
    for (const [level, summary] of sortedLevels) {
      const levelDisplay = level === 'unknown' ? chalk.gray(level) : chalk.cyan(level);
      console.log(chalk.blue(`  Nivel: ${levelDisplay}`));
      console.log(chalk.gray(`    Total de secciones analizadas: ${summary.total}`));
      console.log(chalk.green(`    Plantillas (metadata.sectionTemplate=true): ${summary.templates}`));
      if (summary.collisions > 0) {
        console.log(chalk.yellow(`    Colisiones de contenido: ${summary.collisions}`));
      }
      if (summary.suggestions > 0) {
        console.log(chalk.yellow(`    Sugerencias de renombre: ${summary.suggestions}`));
      }
      console.log();
    }
  }
  
  // Display results
  console.log(chalk.cyan('╔════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                            VALIDATION SUMMARY                              ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════╝\n'));
  
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
      'sections-order': 'Sections Order Validation Errors',
      'zero-pages': 'Zero Pages Errors'
    };
    
    const typeColors = {
      'parse': 'red',
      'schema': 'red',
      'sections-order': 'yellow',
      'zero-pages': 'red'
    };
    
    for (const [type, typeIssues] of issuesByType.entries()) {
      const label = typeLabels[type] || type;
      const color = typeColors[type] || 'red';
      const symbol = type === 'parse' || type === 'schema' || type === 'zero-pages' ? '❌' : '⚠️';
      
      console.log();
      console.log(chalk[color](`${symbol} ${label} (${typeIssues.length}):`));
      
      for (const issue of typeIssues) {
        console.log(chalk[color](`   ${issue.file}: ${issue.message}`));
      }
    }
  }
  
  console.log();
  
  // Fail if there are any blocking issues (semantic warnings don't block)
  if (issues.length > 0) {
    console.log(chalk.red(`❌ Validation failed with ${issues.length} issue(s)`));
    if (semanticWarnings.length > 0) {
      console.log(chalk.yellow(`⚠️  Additionally, ${semanticWarnings.length} semantic linting warning(s) found (non-blocking)`));
    }
    console.log();
    process.exit(1);
  } else {
    if (semanticWarnings.length > 0) {
      console.log(chalk.green(`✅ All lessons are valid!`));
      console.log(chalk.yellow(`⚠️  However, ${semanticWarnings.length} semantic linting warning(s) found (non-blocking)`));
    } else {
      console.log(chalk.green(`✅ All lessons are valid!`));
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
