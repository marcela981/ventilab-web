#!/usr/bin/env node
/**
 * =============================================================================
 * Lesson Migration Script - VentyLab
 * =============================================================================
 *
 * Automatically migrates lesson files from legacy format to the new schema.
 * Provides backup, validation, and detailed reporting.
 *
 * Usage:
 *   node frontend/scripts/migrateLessons.js [options]
 *
 * Options:
 *   --dry-run          Simulate migration without making changes
 *   --no-backup        Skip creating backups (not recommended)
 *   --no-validate      Skip validation after migration
 *   --module <id>      Migrate only specific module
 *   --force            Overwrite even if already in new format
 *   --help             Show this help message
 *
 * Examples:
 *   node frontend/scripts/migrateLessons.js --dry-run
 *   node frontend/scripts/migrateLessons.js --module module-01-fundamentals
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Configuration
// =============================================================================

const LESSONS_BASE_PATH = path.join(__dirname, '../src/data/lessons');
const BACKUP_DIR = path.join(__dirname, '../src/data/lessons/.backup');
const LOG_DIR = path.join(__dirname, '../logs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// =============================================================================
// Utility Functions
// =============================================================================

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function createProgressBar(current, total, width = 40) {
  const percentage = Math.floor((current / total) * 100);
  const filled = Math.floor((current / total) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage}% (${current}/${total})`;
}

// =============================================================================
// File System Operations
// =============================================================================

/**
 * Scans for all lesson JSON files in the lessons directory
 * @param {string} basePath - Base directory to scan
 * @param {string|null} moduleFilter - Optional module ID to filter
 * @returns {Array<string>} Array of file paths
 */
function scanLessonFiles(basePath, moduleFilter = null) {
  const files = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip backup directories
      if (entry.name === '.backup') continue;

      if (entry.isDirectory()) {
        // If module filter is set, skip other modules
        if (moduleFilter && entry.name.startsWith('module-') && entry.name !== moduleFilter) {
          continue;
        }
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'metadata.json') {
        files.push(fullPath);
      }
    }
  }

  try {
    scanDir(basePath);
  } catch (error) {
    logError(`Error scanning directory: ${error.message}`);
  }

  return files;
}

/**
 * Creates a backup of a file
 * @param {string} filePath - Path to file to backup
 * @returns {string|null} Path to backup file or null if failed
 */
function backupFile(filePath) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const relativePath = path.relative(LESSONS_BASE_PATH, filePath);
    const backupPath = path.join(BACKUP_DIR, timestamp, relativePath);

    // Create backup directory
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });

    // Copy file
    fs.copyFileSync(filePath, backupPath);

    return backupPath;
  } catch (error) {
    logError(`Failed to backup ${filePath}: ${error.message}`);
    return null;
  }
}

// =============================================================================
// Format Detection
// =============================================================================

/**
 * Detects lesson format
 * @param {Object} data - Lesson data
 * @returns {string} Format type
 */
function detectFormat(data) {
  // Target format: lessonId, moduleId, content.introduction, content.theory
  if (data.lessonId && data.moduleId && data.content?.introduction && data.content?.theory) {
    return 'target';
  }

  // Legacy format 1: Spanish field names with capitals
  if (data['Introducción'] || data['Conceptos Teóricos'] || data['Título']) {
    return 'legacy-spanish-caps';
  }

  // Legacy format 2: Spanish field names with snake_case
  if (data.titulo || data.introduccion || data.objetivos_de_aprendizaje || data.conceptos_teoricos) {
    return 'legacy-spanish-snake';
  }

  // Structured format 1: Has 'id', 'moduleId', 'sections'
  if (data.id && data.moduleId && Array.isArray(data.sections)) {
    return 'structured-sections';
  }

  // Structured format 2: Has 'title', 'sections' (no moduleId or id)
  if (data.title && Array.isArray(data.sections) && !data.id && !data.moduleId) {
    return 'structured-basic';
  }

  // Partial match: Has content but not complete structure
  if (data.content && typeof data.content === 'object') {
    return 'partial-new';
  }

  return 'unknown';
}

// =============================================================================
// Data Transformation Functions
// =============================================================================

/**
 * Extracts learning objectives from text
 * @param {string} text - Text containing objectives
 * @returns {Array<string>} Array of objectives
 */
function extractObjectives(text) {
  if (!text) return [];

  // Look for bullet points, numbered lists, etc.
  const lines = text.split('\n');
  const objectives = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines that start with bullets, numbers, or dashes
    if (/^[-*•\d]+[.)]\s+/.test(trimmed)) {
      objectives.push(trimmed.replace(/^[-*•\d]+[.)]\s+/, ''));
    }
  }

  return objectives;
}

/**
 * Infers Bloom's taxonomy level from content
 * @param {Object} content - Lesson content
 * @returns {string} Bloom level
 */
function inferBloomLevel(content) {
  const text = JSON.stringify(content).toLowerCase();

  if (text.includes('crear') || text.includes('diseñar') || text.includes('desarrollar')) {
    return 'crear';
  } else if (text.includes('evaluar') || text.includes('justificar') || text.includes('criticar')) {
    return 'evaluar';
  } else if (text.includes('analizar') || text.includes('comparar') || text.includes('diferenciar')) {
    return 'analizar';
  } else if (text.includes('aplicar') || text.includes('demostrar') || text.includes('implementar')) {
    return 'aplicar';
  } else if (text.includes('comprender') || text.includes('explicar') || text.includes('interpretar')) {
    return 'comprender';
  } else {
    return 'recordar';
  }
}

/**
 * Infers difficulty level from content
 * @param {Object} content - Lesson content
 * @returns {string} Difficulty level
 */
function inferDifficulty(content) {
  const text = JSON.stringify(content).toLowerCase();
  const length = text.length;

  // Simple heuristic based on content length and complexity indicators
  const complexWords = ['avanzado', 'complejo', 'crítico', 'especializado'];
  const basicWords = ['básico', 'fundamental', 'introducción', 'simple'];

  const hasComplex = complexWords.some(word => text.includes(word));
  const hasBasic = basicWords.some(word => text.includes(word));

  if (hasBasic || length < 3000) return 'básico';
  if (hasComplex || length > 8000) return 'avanzado';
  return 'intermedio';
}

/**
 * Normalizes references to structured format
 * @param {Array} references - References in various formats
 * @returns {Array<Object>} Normalized references
 */
function normalizeReferences(references) {
  if (!Array.isArray(references)) return [];

  return references.map((ref, index) => {
    if (typeof ref === 'string') {
      // Parse string reference
      return {
        authors: '',
        year: new Date().getFullYear(),
        title: ref,
        journal: '',
        source: '',
        volume: '',
        pages: '',
        doi: '',
        url: '',
        citationStyle: 'Vancouver',
      };
    } else if (typeof ref === 'object') {
      // Ensure all required fields
      return {
        authors: ref.authors || ref.autor || '',
        year: ref.year || ref.año || new Date().getFullYear(),
        title: ref.title || ref.título || ref.titulo || '',
        journal: ref.journal || ref.revista || '',
        source: ref.source || ref.fuente || '',
        volume: ref.volume || ref.volumen || '',
        pages: ref.pages || ref.páginas || ref.paginas || '',
        doi: ref.doi || '',
        url: ref.url || '',
        citationStyle: ref.citationStyle || 'Vancouver',
      };
    }
    return ref;
  });
}

/**
 * Normalizes assessment questions to uniform format
 * @param {Array} questions - Questions in various formats
 * @returns {Array<Object>} Normalized questions
 */
function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions.map((q, index) => {
    const questionId = q.questionId || `q-${index + 1}`;

    // Map Spanish field names to English
    let type = q.type || q.tipo || 'multiple-choice';
    if (type === 'Opción múltiple') type = 'multiple-choice';
    if (type === 'Verdadero/Falso') type = 'true-false';

    return {
      questionId,
      questionText: q.questionText || q.pregunta || q.texto || '',
      type,
      options: q.options || q.opciones || [],
      correctAnswer: q.correctAnswer || q.respuesta_correcta || q.respuestaCorrecta || '',
      explanation: q.explanation || q.explicacion || q.explicación || '',
      bloomLevel: q.bloomLevel || inferBloomLevel({ text: q.questionText || q.pregunta || '' }),
      difficulty: q.difficulty || 'intermedio',
    };
  });
}

/**
 * Transforms legacy data to new format
 * @param {Object} legacyData - Legacy lesson data
 * @param {string} filePath - File path for metadata
 * @returns {Object} Transformed data in new format
 */
function transformLegacyData(legacyData, filePath) {
  // Extract IDs from file path
  const fileName = path.basename(filePath, '.json');
  const moduleFolder = path.basename(path.dirname(filePath));

  // Attempt to extract lesson ID from filename
  const lessonIdMatch = fileName.match(/lesson-\d+-(.+)/);
  const lessonId = lessonIdMatch ? lessonIdMatch[1] : fileName;

  const moduleId = moduleFolder.startsWith('module-') ? moduleFolder : 'unknown-module';

  // Transform introduction (handle both capital and snake_case Spanish formats)
  const introduction = {
    text: legacyData['Introducción']?.texto ||
          legacyData['Introducción']?.text ||
          legacyData.introduccion ||
          legacyData.introduction?.text || '',
    objectives: legacyData['Introducción']?.objetivos ||
                legacyData['Introducción']?.objectives ||
                legacyData.objetivos_de_aprendizaje ||
                legacyData.introduction?.objectives ||
                extractObjectives(legacyData['Introducción']?.texto || legacyData.introduccion || '') || [],
  };

  // Transform theory (handle both capital and snake_case Spanish formats)
  const theory = {
    sections: legacyData.content?.theory?.sections ||
              (legacyData['Conceptos Teóricos'] ? [{
                title: 'Conceptos Teóricos',
                content: legacyData['Conceptos Teóricos'],
              }] : legacyData.conceptos_teoricos ? [{
                title: 'Conceptos Teóricos',
                content: legacyData.conceptos_teoricos,
              }] : []),
    examples: legacyData.content?.theory?.examples ||
              legacyData.ejemplos ||
              legacyData.examples || [],
    analogies: legacyData.content?.theory?.analogies ||
               legacyData.analogías ||
               legacyData.analogias || [],
  };

  // Transform visual elements (handle both capital and snake_case Spanish formats)
  const visualElements = (legacyData['Elementos Visuales'] ||
                          legacyData.elementos_visuales_requeridos ||
                          legacyData.content?.visualElements ||
                          []).map((el, idx) => ({
    id: el.id || `visual-${idx + 1}`,
    type: el.tipo || el.type || 'imagen',
    title: el.title || el.título || el.titulo || '',
    description: el.descripcion || el.description || '',
    objective: el.objetivo || el.objective || '',
    placement: el.placement || 'inline',
    technicalSpecs: el.technicalSpecs || el.especificacionesTecnicas || {},
  }));

  // Transform practical cases (handle both capital and snake_case Spanish formats)
  const practicalCases = (legacyData['Casos Prácticos'] ||
                          legacyData.casos_practicos ||
                          legacyData.content?.practicalCases ||
                          []).map((caso, idx) => ({
    caseId: caso.caseId || `case-${idx + 1}`,
    title: caso.title || caso.título || caso.titulo || `Caso Clínico ${idx + 1}`,
    patientData: caso.patientData || caso.datosPaciente || {},
    clinicalScenario: caso.clinicalScenario || caso.caso || caso.escenario || '',
    questions: Array.isArray(caso.questions || caso.preguntas)
      ? (caso.questions || caso.preguntas).map((p, qIdx) => ({
          questionText: typeof p === 'string' ? p : (p.texto || p.questionText || ''),
          type: p.type || p.tipo || 'open-ended',
          expectedAnswer: p.expectedAnswer || p.respuestaEsperada || '',
          explanation: p.explanation || p.explicacion || '',
        }))
      : [],
  }));

  // Build complete lesson object (handle both capital and snake_case Spanish formats)
  const transformed = {
    lessonId,
    moduleId,
    title: legacyData.title || legacyData['Título'] || legacyData.titulo || 'Untitled Lesson',
    lastUpdated: legacyData.lastUpdated || new Date().toISOString(),
    authors: legacyData.authors || legacyData.autores || [],
    reviewers: legacyData.reviewers || legacyData.revisores || [],
    metadata: {
      migrated: true,
      migrationDate: new Date().toISOString(),
      originalFormat: 'legacy',
    },
    content: {
      introduction,
      theory,
      visualElements,
      practicalCases,
      keyPoints: legacyData.content?.keyPoints ||
                 legacyData['Puntos Clave'] ||
                 legacyData.puntoClave || [],
      assessment: {
        questions: normalizeQuestions(
          legacyData.content?.assessment?.questions ||
          legacyData['Autoevaluación'] ||
          legacyData.autoevaluacion || []
        ),
      },
      references: normalizeReferences(
        legacyData.content?.references ||
        legacyData['Referencias Bibliográficas'] ||
        legacyData.referencias || []
      ),
    },
  };

  return transformed;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates migrated data against schema
 * @param {Object} data - Data to validate
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
function validateMigratedData(data) {
  const errors = [];

  // Required top-level fields
  if (!data.lessonId) errors.push('Missing required field: lessonId');
  if (!data.moduleId) errors.push('Missing required field: moduleId');
  if (!data.title) errors.push('Missing required field: title');
  if (!data.content) errors.push('Missing required field: content');

  // Content structure
  if (data.content) {
    if (!data.content.introduction) {
      errors.push('Missing required field: content.introduction');
    } else {
      if (!data.content.introduction.text && !data.content.introduction.objectives?.length) {
        errors.push('content.introduction must have text or objectives');
      }
    }

    if (!data.content.theory) {
      errors.push('Missing required field: content.theory');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Migration Logic
// =============================================================================

/**
 * Migrates a single lesson file
 * @param {string} filePath - Path to lesson file
 * @param {Object} options - Migration options
 * @returns {Object} Migration result
 */
async function migrateLesson(filePath, options) {
  const result = {
    file: path.relative(LESSONS_BASE_PATH, filePath),
    status: 'pending',
    format: 'unknown',
    errors: [],
    warnings: [],
  };

  try {
    // Read file
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Detect format
    result.format = detectFormat(data);

    // Skip if already in target format (unless force flag)
    if (result.format === 'target' && !options.force) {
      result.status = 'skipped';
      result.warnings.push('Already in target format');
      return result;
    }

    // Handle different formats
    let transformed;

    if (result.format === 'legacy-spanish-caps' || result.format === 'legacy-spanish-snake') {
      // Transform legacy Spanish formats
      transformed = transformLegacyData(data, filePath);
    } else if (result.format === 'structured-sections' || result.format === 'structured-basic') {
      // Current structured formats - inform but don't migrate yet
      result.status = 'info';
      result.warnings.push(
        `File uses ${result.format} format. Migration for this format is not yet implemented. ` +
        `This is a valid structured format but different from the target schema.`
      );
      return result;
    } else if (result.format === 'partial-new') {
      // Has content but incomplete - try to complete it
      transformed = transformLegacyData(data, filePath);
      result.warnings.push('Partial format detected, attempting completion');
    } else if (result.format === 'target') {
      // Already target format, re-process if force flag
      transformed = data;
    } else {
      // Unknown format
      result.status = 'failed';
      result.errors.push(
        `Unknown format. File structure doesn't match any recognized pattern. ` +
        `Please verify the JSON structure.`
      );
      return result;
    }

    // Validate
    if (options.validate) {
      const validation = validateMigratedData(transformed);
      if (!validation.valid) {
        result.status = 'failed';
        result.errors.push(...validation.errors);
        return result;
      }
    }

    // Backup original
    if (options.backup && !options.dryRun) {
      const backupPath = backupFile(filePath);
      if (backupPath) {
        result.backupPath = path.relative(LESSONS_BASE_PATH, backupPath);
      } else {
        result.warnings.push('Backup failed');
      }
    }

    // Write transformed file
    if (!options.dryRun) {
      fs.writeFileSync(
        filePath,
        JSON.stringify(transformed, null, 2) + '\n',
        'utf8'
      );
    }

    result.status = 'success';
    result.transformedData = transformed;

  } catch (error) {
    result.status = 'failed';
    result.errors.push(error.message);
  }

  return result;
}

// =============================================================================
// Reporting
// =============================================================================

/**
 * Generates migration report
 * @param {Array<Object>} results - Array of migration results
 * @param {Object} options - Migration options
 * @returns {string} Report text
 */
function generateReport(results, options) {
  const stats = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    info: results.filter(r => r.status === 'info').length,
  };

  // Count formats
  const formats = {};
  results.forEach(r => {
    formats[r.format] = (formats[r.format] || 0) + 1;
  });

  const report = [];
  report.push('='.repeat(80));
  report.push('LESSON MIGRATION REPORT');
  report.push('='.repeat(80));
  report.push('');
  report.push(`Date: ${new Date().toISOString()}`);
  report.push(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  report.push(`Module Filter: ${options.moduleFilter || 'All'}`);
  report.push('');
  report.push('STATISTICS:');
  report.push(`  Total files processed: ${stats.total}`);
  report.push(`  ✓ Migrated successfully: ${stats.success}`);
  report.push(`  ✗ Failed: ${stats.failed}`);
  report.push(`  ○ Skipped (already in target format): ${stats.skipped}`);
  report.push(`  ℹ Info (different format, not migrated): ${stats.info}`);
  report.push('');
  report.push('FORMATS DETECTED:');
  Object.entries(formats).forEach(([format, count]) => {
    report.push(`  ${format}: ${count} files`);
  });
  report.push('');

  if (stats.failed > 0) {
    report.push('FAILED FILES:');
    results.filter(r => r.status === 'failed').forEach(r => {
      report.push(`  ${r.file}`);
      r.errors.forEach(err => report.push(`    - ${err}`));
    });
    report.push('');
  }

  if (results.some(r => r.warnings.length > 0)) {
    report.push('WARNINGS:');
    results.forEach(r => {
      if (r.warnings.length > 0) {
        report.push(`  ${r.file}`);
        r.warnings.forEach(warn => report.push(`    - ${warn}`));
      }
    });
    report.push('');
  }

  report.push('='.repeat(80));

  return report.join('\n');
}

// =============================================================================
// Main Execution
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse options
  const options = {
    dryRun: args.includes('--dry-run'),
    backup: !args.includes('--no-backup'),
    validate: !args.includes('--no-validate'),
    force: args.includes('--force'),
    moduleFilter: null,
  };

  // Check for module filter
  const moduleIndex = args.indexOf('--module');
  if (moduleIndex !== -1 && args[moduleIndex + 1]) {
    options.moduleFilter = args[moduleIndex + 1];
  }

  // Show help
  if (args.includes('--help')) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 21).join('\n'));
    return;
  }

  // Header
  log('\n' + '='.repeat(80), 'bright');
  log('  LESSON MIGRATION TOOL', 'bright');
  log('='.repeat(80) + '\n', 'bright');

  if (options.dryRun) {
    logWarning('DRY RUN MODE - No files will be modified\n');
  }

  // Scan files
  logInfo('Scanning lesson files...');
  const files = scanLessonFiles(LESSONS_BASE_PATH, options.moduleFilter);
  log(`Found ${files.length} lesson files\n`, 'cyan');

  if (files.length === 0) {
    logWarning('No files to process');
    return;
  }

  // Process files
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = path.relative(LESSONS_BASE_PATH, file);

    // Show progress
    process.stdout.write('\r' + createProgressBar(i, files.length));

    const result = await migrateLesson(file, options);
    results.push(result);
  }

  // Clear progress bar
  process.stdout.write('\r' + ' '.repeat(80) + '\r');

  // Show results
  log('\n');
  results.forEach(result => {
    const icon = result.status === 'success' ? '✓' :
                 result.status === 'failed' ? '✗' :
                 result.status === 'info' ? 'ℹ' : '○';
    const color = result.status === 'success' ? 'green' :
                  result.status === 'failed' ? 'red' :
                  result.status === 'info' ? 'cyan' : 'gray';

    log(`${icon} ${result.file} [${result.format}]`, color);

    if (result.errors.length > 0) {
      result.errors.forEach(err => log(`  ↳ ${err}`, 'red'));
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => log(`  ⚠ ${warn}`, 'yellow'));
    }
  });

  // Generate report
  const report = generateReport(results, options);
  console.log('\n' + report);

  // Save log file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOG_DIR, `migration-${timestamp}.log`);

  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(logFile, report, 'utf8');

  logSuccess(`\nDetailed log saved to: ${logFile}`);

  // Exit with appropriate code
  const hasFailures = results.some(r => r.status === 'failed');
  process.exit(hasFailures ? 1 : 0);
}

// Run main function
main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
