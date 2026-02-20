#!/usr/bin/env node

/**
 * =============================================================================
 * Generate Missing Modules Script
 * =============================================================================
 * This script generates placeholder modules to complete the curriculum roadmap.
 * It creates modules with status "coming_soon" and isPlaceholder: true.
 *
 * Usage:
 *   node scripts/generate-missing-modules.mjs
 *
 * Expected total: 32 modules
 * Current modules: 13 (from curriculumData.js)
 * Missing modules: 19
 * =============================================================================
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize AJV
const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
addFormats(ajv);

// Helper functions
function logSuccess(message) {
  console.log(chalk.green('✅', message));
}

function logError(message) {
  console.log(chalk.red('❌', message));
}

function logWarning(message) {
  console.log(chalk.yellow('⚠️', message));
}

function logInfo(message) {
  console.log(chalk.blue('ℹ️', message));
}

/**
 * Load schema
 */
function loadSchema() {
  const schemaPath = resolve(__dirname, '../src/features/teaching/data/schemas/moduleSchema.json');
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  return JSON.parse(schemaContent);
}

/**
 * Extract current modules from curriculumData.js
 */
function getCurrentModules() {
  const curriculumDataPath = resolve(__dirname, '../src/features/teaching/data/curriculumData.js');
  const fileContent = readFileSync(curriculumDataPath, 'utf-8');
  
  // Find modules section
  const modulesStartMatch = fileContent.match(/modules:\s*\{/);
  if (!modulesStartMatch) {
    throw new Error('Could not find modules object in curriculumData.js');
  }
  
  // Extract module IDs by finding all module keys
  const moduleKeyPattern = /^\s*['"]([^'"]+)['"]:\s*\{/gm;
  const moduleMatches = [...fileContent.matchAll(moduleKeyPattern)];
  const moduleIds = [...new Set(moduleMatches.map(match => match[1]).filter(Boolean))];
  
  // Extract level information for each module
  const modules = [];
  moduleIds.forEach((moduleId, index) => {
    // Find the module definition block
    const modulePattern = new RegExp(`['"]${moduleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'm');
    const moduleMatch = fileContent.match(modulePattern);
    
    if (moduleMatch) {
      const moduleContent = moduleMatch[1];
      const levelMatch = moduleContent.match(/level:\s*['"](beginner|intermediate|advanced)['"]/);
      const orderMatch = moduleContent.match(/order:\s*(\d+)/);
      
      modules.push({
        id: moduleId,
        level: levelMatch ? levelMatch[1] : 'beginner',
        order: orderMatch ? parseInt(orderMatch[1], 10) : index + 1,
      });
    }
  });
  
  return modules;
}

/**
 * Generate placeholder modules
 */
function generatePlaceholderModules(currentModules, expectedTotal = 32) {
  const currentCount = currentModules.length;
  const missingCount = expectedTotal - currentCount;
  
  if (missingCount <= 0) {
    logWarning(`No missing modules. Current: ${currentCount}, Expected: ${expectedTotal}`);
    return [];
  }
  
  logInfo(`Current modules: ${currentCount}`);
  logInfo(`Expected total: ${expectedTotal}`);
  logInfo(`Generating ${missingCount} placeholder modules...\n`);
  
  // Count modules by level
  const levelCounts = {
    beginner: currentModules.filter(m => m.level === 'beginner').length,
    intermediate: currentModules.filter(m => m.level === 'intermediate').length,
    advanced: currentModules.filter(m => m.level === 'advanced').length,
  };
  
  // Find max order per level
  const maxOrderByLevel = {
    beginner: Math.max(...currentModules.filter(m => m.level === 'beginner').map(m => m.order), 0),
    intermediate: Math.max(...currentModules.filter(m => m.level === 'intermediate').map(m => m.order), 0),
    advanced: Math.max(...currentModules.filter(m => m.level === 'advanced').map(m => m.order), 0),
  };
  
  // Calculate target distribution (approximately balanced)
  // First, calculate ideal distribution per level
  const idealPerLevel = Math.ceil(expectedTotal / 3);
  const idealDistribution = {
    beginner: idealPerLevel - levelCounts.beginner,
    intermediate: idealPerLevel - levelCounts.intermediate,
    advanced: idealPerLevel - levelCounts.advanced,
  };
  
  // Ensure non-negative
  const targetDistribution = {
    beginner: Math.max(0, idealDistribution.beginner),
    intermediate: Math.max(0, idealDistribution.intermediate),
    advanced: Math.max(0, idealDistribution.advanced),
  };
  
  // Calculate current total target
  let totalTarget = targetDistribution.beginner + targetDistribution.intermediate + targetDistribution.advanced;
  
  // Adjust to match exactly missingCount
  if (totalTarget !== missingCount) {
    const diff = missingCount - totalTarget;
    const levels = ['beginner', 'intermediate', 'advanced'];
    
    // Distribute difference evenly
    if (diff > 0) {
      // Add modules
      for (let i = 0; i < diff; i++) {
        targetDistribution[levels[i % 3]]++;
      }
    } else {
      // Remove modules (shouldn't happen, but handle it)
      let toRemove = Math.abs(diff);
      for (let i = 0; i < toRemove && totalTarget > 0; i++) {
        const level = levels[i % 3];
        if (targetDistribution[level] > 0) {
          targetDistribution[level]--;
          totalTarget--;
        }
      }
    }
  }
  
  logInfo(`Target distribution:`);
  logInfo(`  Beginner: ${targetDistribution.beginner} (current: ${levelCounts.beginner})`);
  logInfo(`  Intermediate: ${targetDistribution.intermediate} (current: ${levelCounts.intermediate})`);
  logInfo(`  Advanced: ${targetDistribution.advanced} (current: ${levelCounts.advanced})\n`);
  
  // Generate modules
  const placeholderModules = [];
  const now = new Date().toISOString();
  
  // Generate by level
  ['beginner', 'intermediate', 'advanced'].forEach(level => {
    const count = targetDistribution[level];
    let order = maxOrderByLevel[level] + 1;
    
    for (let i = 0; i < count; i++) {
      const moduleNumber = currentCount + placeholderModules.length + 1;
      const moduleId = `module-${String(moduleNumber).padStart(2, '0')}-placeholder`;
      
      placeholderModules.push({
        id: moduleId,
        title: `Módulo ${moduleNumber} — Próximamente`,
        subtitle: 'Contenido en construcción',
        level: level,
        status: 'coming_soon',
        isPlaceholder: true,
        order: order++,
        duration: 0,
        estimatedTime: 'Próximamente',
        difficulty: level === 'beginner' ? 'básico' : level === 'intermediate' ? 'intermedio' : 'avanzado',
        prerequisites: [],
        learningObjectives: [],
        lessons: [],
        metadata: {
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  });
  
  return placeholderModules;
}

/**
 * Validate modules against schema
 */
function validateModules(modules, schema) {
  const validate = ajv.compile(schema);
  const errors = [];
  
  modules.forEach((module, index) => {
    const valid = validate(module);
    if (!valid) {
      errors.push({
        index,
        moduleId: module.id,
        errors: validate.errors,
      });
    }
  });
  
  return errors;
}

/**
 * Save generated modules to JSON and JS files
 */
function saveGeneratedModules(modules) {
  const outputDir = resolve(__dirname, '../src/features/teaching/data/curriculum');
  
  // Create directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const output = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalModules: modules.length,
    modules: modules,
  };
  
  // Save JSON file
  const jsonPath = resolve(outputDir, 'modules.generated.json');
  writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf-8');
  logSuccess(`Generated modules saved to: ${jsonPath}`);
  
  // Save JS file (for client-side import)
  const jsPath = resolve(outputDir, 'modules.generated.js');
  const jsContent = `/**
 * Generated Placeholder Modules
 * This file is auto-generated by scripts/generate-missing-modules.mjs
 * Do not edit manually. Regenerate using: npm run generate:modules
 */

export const generatedModulesData = ${JSON.stringify(output, null, 2)};

export default generatedModulesData;
`;
  writeFileSync(jsPath, jsContent, 'utf-8');
  logSuccess(`Generated modules JS saved to: ${jsPath}`);
  
  return jsonPath;
}

/**
 * Main function
 */
function main() {
  logInfo('Generating missing placeholder modules...\n');
  
  try {
    // Load schema
    logInfo('Loading module schema...');
    const schema = loadSchema();
    logSuccess('Schema loaded\n');
    
    // Get current modules
    logInfo('Reading current modules from curriculumData.js...');
    const currentModules = getCurrentModules();
    logSuccess(`Found ${currentModules.length} current modules\n`);
    
    // Generate placeholder modules
    const placeholderModules = generatePlaceholderModules(currentModules, 32);
    
    if (placeholderModules.length === 0) {
      logWarning('No placeholder modules to generate.');
      process.exit(0);
    }
    
    logInfo(`Generated ${placeholderModules.length} placeholder modules\n`);
    
    // Validate modules
    logInfo('Validating generated modules against schema...');
    const validationErrors = validateModules(placeholderModules, schema);
    
    if (validationErrors.length > 0) {
      logError('Validation failed!');
      validationErrors.forEach(({ moduleId, errors }) => {
        logError(`Module ${moduleId}:`);
        errors.forEach(err => {
          logError(`  - ${err.instancePath}: ${err.message}`);
        });
      });
      process.exit(1);
    }
    
    logSuccess('All modules validated successfully\n');
    
    // Save modules
    logInfo('Saving generated modules...');
    const outputPath = saveGeneratedModules(placeholderModules);
    
    // Summary
    logSuccess('\n✅ Generation complete!');
    logInfo(`Total modules: ${currentModules.length} (current) + ${placeholderModules.length} (generated) = ${currentModules.length + placeholderModules.length}`);
    logInfo(`Output file: ${outputPath}`);
    logInfo('\nNext steps:');
    logInfo('1. Review the generated modules in src/features/teaching/data/curriculum/modules.generated.json');
    logInfo('2. Update src/features/teaching/data/curriculum/index.js to merge base and generated modules');
    logInfo('3. Update curriculumData.js to use the merged modules');
    logInfo('4. Run validation: npm run validate:curriculum');
    
    process.exit(0);
  } catch (error) {
    logError(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run
main();

