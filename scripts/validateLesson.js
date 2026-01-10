#!/usr/bin/env node

/**
 * =============================================================================
 * Lesson JSON Validation Script
 * =============================================================================
 * This script validates lesson JSON files against the lessonSchema.json
 * according to HU-004 specification.
 *
 * Usage:
 *   node scripts/validateLesson.js path/to/lesson.json
 *   node scripts/validateLesson.js "frontend/src/data/lessons"
 *   node scripts/validateLesson.js lesson1.json lesson2.json --strict
 *
 * Options:
 *   --strict    Convert warnings to errors
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions for colored output
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

/**
 * Loads and validates a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Object|null} Parsed JSON object or null if invalid
 */
function loadJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON syntax: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validates ISO 8601 date format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid ISO 8601 format
 */
function isValidISO8601(dateString) {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return iso8601Regex.test(dateString);
}

/**
 * Validates that section orders are consecutive
 * @param {Array} sections - Array of section objects
 * @returns {Array} Array of error messages (empty if valid)
 */
function validateSectionOrder(sections) {
  const errors = [];
  if (!Array.isArray(sections) || sections.length === 0) {
    return errors;
  }

  const orders = sections.map(s => s.order).sort((a, b) => a - b);
  const expectedOrder = Array.from({ length: sections.length }, (_, i) => i + 1);

  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== expectedOrder[i]) {
      errors.push(
        `Section orders are not consecutive. Expected order ${expectedOrder[i]}, found ${orders[i]}`
      );
      break;
    }
  }

  return errors;
}

/**
 * Checks for duplicate IDs in sections
 * @param {Array} sections - Array of section objects
 * @returns {Array} Array of error messages (empty if valid)
 */
function validateUniqueSectionIds(sections) {
  const errors = [];
  if (!Array.isArray(sections)) {
    return errors;
  }

  const ids = sections.map(s => s.id).filter(Boolean);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

  if (duplicates.length > 0) {
    const uniqueDuplicates = [...new Set(duplicates)];
    errors.push(
      `Duplicate section IDs found: ${uniqueDuplicates.join(', ')}`
    );
  }

  return errors;
}

/**
 * Checks for duplicate question IDs in quiz
 * @param {Object} quiz - Quiz object with questions array
 * @returns {Array} Array of error messages (empty if valid)
 */
function validateUniqueQuestionIds(quiz) {
  const errors = [];
  if (!quiz || !Array.isArray(quiz.questions)) {
    return errors;
  }

  const ids = quiz.questions.map(q => q.id).filter(Boolean);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

  if (duplicates.length > 0) {
    const uniqueDuplicates = [...new Set(duplicates)];
    errors.push(
      `Duplicate question IDs found: ${uniqueDuplicates.join(', ')}`
    );
  }

  return errors;
}

/**
 * Validates prerequisites point to existing lesson IDs
 * @param {Object} lesson - Lesson object to validate
 * @param {Set<string>} allLessonIds - Set of all valid lesson IDs
 * @returns {Array} Array of error messages (empty if valid)
 */
function validatePrerequisites(lesson, allLessonIds) {
  const errors = [];
  if (!Array.isArray(lesson.prerequisites)) {
    return errors;
  }

  for (const prereqId of lesson.prerequisites) {
    if (!allLessonIds.has(prereqId)) {
      errors.push(
        `Prerequisite '${prereqId}' does not exist (referenced by lesson '${lesson.id}')`
      );
    }
  }

  return errors;
}

/**
 * Generates warnings for suspicious values
 * @param {Object} lesson - Lesson object to validate
 * @returns {Array} Array of warning messages
 */
function generateWarnings(lesson) {
  const warnings = [];

  // Check estimatedTime
  if (lesson.estimatedTime > 120) {
    warnings.push(
      `Estimated time (${lesson.estimatedTime} minutes) exceeds recommended maximum of 120 minutes`
    );
  }

  if (lesson.estimatedTime < 5) {
    warnings.push(
      `Estimated time (${lesson.estimatedTime} minutes) is very short (minimum recommended: 5 minutes)`
    );
  }

  // Check learning objectives
  if (!lesson.learningObjectives || lesson.learningObjectives.length === 0) {
    warnings.push('No learning objectives defined');
  } else if (lesson.learningObjectives.length < 3) {
    warnings.push(
      `Only ${lesson.learningObjectives.length} learning objective(s) defined (recommended: 3-5)`
    );
  }

  // Check sections
  if (!lesson.sections || lesson.sections.length === 0) {
    warnings.push('No sections defined');
  } else if (lesson.sections.length < 3) {
    warnings.push(
      `Only ${lesson.sections.length} section(s) defined (recommended: 3-7)`
    );
  }

  // Check quiz questions
  if (!lesson.quiz || !lesson.quiz.questions || lesson.quiz.questions.length === 0) {
    warnings.push('No quiz questions defined');
  } else if (lesson.quiz.questions.length < 3) {
    warnings.push(
      `Only ${lesson.quiz.questions.length} quiz question(s) defined (recommended: 5-10)`
    );
  }

  // Check references
  if (!lesson.resources || !lesson.resources.references || lesson.resources.references.length === 0) {
    warnings.push('No references defined');
  }

  // Check metadata
  if (!lesson.metadata || !lesson.metadata.reviewedBy || lesson.metadata.reviewedBy.length === 0) {
    warnings.push('No reviewers defined in metadata');
  }

  return warnings;
}

/**
 * Validates a lesson file against the schema and performs additional checks
 * @param {string} filePath - Path to the lesson JSON file
 * @param {Object} schema - AJV schema validator instance
 * @param {Set<string>} allLessonIds - Set of all valid lesson IDs for prerequisite validation
 * @param {boolean} strict - Whether to convert warnings to errors
 * @returns {Object} Validation result with valid, errors, and warnings arrays
 */
function validateLessonFile(filePath, schema, allLessonIds, strict = false) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
  };

  let lesson;
  try {
    lesson = loadJsonFile(filePath);
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to load JSON: ${error.message}`);
    return result;
  }

  // Validate against JSON Schema using AJV
  const valid = schema(lesson);
  if (!valid) {
    result.valid = false;
    const schemaErrors = schema.errors || [];
    for (const error of schemaErrors) {
      const path = error.instancePath || error.schemaPath || 'root';
      result.errors.push(
        `Schema validation error at ${path}: ${error.message}`
      );
    }
  }

  // Validate ISO 8601 date format
  if (lesson.metadata && lesson.metadata.lastUpdated) {
    if (!isValidISO8601(lesson.metadata.lastUpdated)) {
      result.valid = false;
      result.errors.push(
        `Invalid ISO 8601 date format in metadata.lastUpdated: ${lesson.metadata.lastUpdated}`
      );
    }
  }

  // Validate section order
  const sectionOrderErrors = validateSectionOrder(lesson.sections);
  result.errors.push(...sectionOrderErrors);
  if (sectionOrderErrors.length > 0) {
    result.valid = false;
  }

  // Validate unique section IDs
  const sectionIdErrors = validateUniqueSectionIds(lesson.sections);
  result.errors.push(...sectionIdErrors);
  if (sectionIdErrors.length > 0) {
    result.valid = false;
  }

  // Validate unique question IDs
  const questionIdErrors = validateUniqueQuestionIds(lesson.quiz);
  result.errors.push(...questionIdErrors);
  if (questionIdErrors.length > 0) {
    result.valid = false;
  }

  // Validate prerequisites (only if we have all lesson IDs)
  if (allLessonIds && allLessonIds.size > 0) {
    const prereqErrors = validatePrerequisites(lesson, allLessonIds);
    result.errors.push(...prereqErrors);
    if (prereqErrors.length > 0) {
      result.valid = false;
    }
  }

  // Generate warnings
  const warnings = generateWarnings(lesson);
  result.warnings = warnings;

  // In strict mode, convert warnings to errors
  if (strict && warnings.length > 0) {
    result.errors.push(...warnings.map(w => `WARNING (strict mode): ${w}`));
    result.valid = false;
    result.warnings = [];
  }

  return result;
}

/**
 * Recursively finds all JSON files in a directory
 * @param {string} dir - Directory to search
 * @param {Array} fileList - Accumulator for file paths
 * @returns {Array} Array of file paths
 */
function findJsonFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip schemas and node_modules directories
      if (file !== 'schemas' && file !== 'node_modules') {
        findJsonFiles(filePath, fileList);
      }
    } else if (file.endsWith('.json')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Collects all lesson IDs from lesson files in the lessons directory
 * @param {string} lessonsDir - Path to the lessons directory
 * @returns {Set<string>} Set of all lesson IDs
 */
function collectLessonIds(lessonsDir) {
  const lessonIds = new Set();
  try {
    const files = findJsonFiles(lessonsDir);

    for (const file of files) {
      try {
        const lesson = loadJsonFile(file);
        if (lesson && lesson.id) {
          lessonIds.add(lesson.id);
        }
      } catch (error) {
        // Skip invalid files, they'll be caught during validation
      }
    }
  } catch (error) {
    // If search fails, return empty set
  }

  return lessonIds;
}

/**
 * Main validation function
 */
function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const strictMode = args.includes('--strict');
  const fileArgs = args.filter(arg => arg !== '--strict');

  if (fileArgs.length === 0) {
    logError('No files specified');
    console.log('\nUsage:');
    console.log('  node scripts/validateLesson.js <file1> [file2] ... [--strict]');
    console.log('  node scripts/validateLesson.js "frontend/src/data/lessons/**/*.json" [--strict]');
    process.exit(1);
  }

  // Load schema
  const schemaPath = path.join(__dirname, '..', 'src', 'data', 'schemas', 'lessonSchema.json');
  if (!fs.existsSync(schemaPath)) {
    logError(`Schema file not found: ${schemaPath}`);
    process.exit(1);
  }

  let schemaValidator;
  try {
    // Try to use AJV
    const Ajv = require('ajv');
    const ajv = new Ajv({ allErrors: true, verbose: true });
    const schema = loadJsonFile(schemaPath);
    schemaValidator = ajv.compile(schema);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      logError('AJV library not found. Install it with: npm install ajv');
      console.log('\nOr add it to package.json:');
      console.log('  "devDependencies": {');
      console.log('    "ajv": "^8.12.0"');
      console.log('  }');
      process.exit(1);
    }
    throw error;
  }

  // Collect all lesson IDs for prerequisite validation
  const lessonsDir = path.join(__dirname, '..', 'src', 'data', 'lessons');
  const allLessonIds = collectLessonIds(lessonsDir);

  // Expand glob patterns and collect files
  const filesToValidate = [];
  for (const arg of fileArgs) {
    if (arg.includes('*') || arg.includes('**')) {
      // Simple glob pattern support
      const baseDir = path.dirname(arg.replace(/\*\*/g, '').replace(/\/\*/g, ''));
      const resolvedBase = path.resolve(baseDir);
      
      if (fs.existsSync(resolvedBase) && fs.statSync(resolvedBase).isDirectory()) {
        const files = findJsonFiles(resolvedBase);
        filesToValidate.push(...files);
      } else {
        logWarning(`Pattern directory not found: ${baseDir}`);
      }
    } else {
      // Direct file path
      const fullPath = path.resolve(arg);
      if (fs.existsSync(fullPath)) {
        filesToValidate.push(fullPath);
      } else {
        logWarning(`File not found: ${arg}`);
      }
    }
  }

  if (filesToValidate.length === 0) {
    logError('No valid files to validate');
    process.exit(1);
  }

  // Display header
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                                            ║', 'cyan');
  log('║              VENTYLAB LESSON VALIDATION SCRIPT (HU-004)                   ║', 'cyan');
  log('║                                                                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log();

  if (strictMode) {
    logWarning('Strict mode enabled: warnings will be treated as errors');
    console.log();
  }

  // Validate each file
  const results = {
    total: filesToValidate.length,
    passed: 0,
    failed: 0,
    totalErrors: 0,
    totalWarnings: 0,
  };

  for (const filePath of filesToValidate) {
    const relativePath = path.relative(process.cwd(), filePath);
    logInfo(`Validating: ${relativePath}`);

    const validation = validateLessonFile(filePath, schemaValidator, allLessonIds, strictMode);

    if (validation.valid) {
      logSuccess(`✓ ${relativePath}`);
      results.passed++;
    } else {
      logError(`✗ ${relativePath}`);
      results.failed++;
    }

    // Display errors
    if (validation.errors.length > 0) {
      for (const error of validation.errors) {
        logError(`  ${error}`);
      }
      results.totalErrors += validation.errors.length;
    }

    // Display warnings
    if (validation.warnings.length > 0) {
      for (const warning of validation.warnings) {
        logWarning(`  ${warning}`);
      }
      results.totalWarnings += validation.warnings.length;
    }

    console.log();
  }

  // Display summary
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                            VALIDATION SUMMARY                              ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log();

  logInfo(`Total files validated: ${results.total}`);
  logSuccess(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}`);
  } else {
    log(`Failed: ${results.failed}`, 'green');
  }
  if (results.totalErrors > 0) {
    logError(`Total errors: ${results.totalErrors}`);
  } else {
    log(`Total errors: ${results.totalErrors}`, 'green');
  }
  if (results.totalWarnings > 0) {
    logWarning(`Total warnings: ${results.totalWarnings}`);
  } else {
    log(`Total warnings: ${results.totalWarnings}`, 'green');
  }

  console.log();

  // Exit code
  const exitCode = results.failed > 0 || results.totalErrors > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Run validation
try {
  main();
} catch (error) {
  logError(`Error executing validation: ${error.message}`);
  console.error(error);
  process.exit(1);
}

