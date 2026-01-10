#!/usr/bin/env node

/**
 * =============================================================================
 * Curriculum Validation Script (ESM)
 * =============================================================================
 * This script validates that module counts in metadata match the actual
 * module data. It ensures no hardcoded values are present and that the
 * system remains data-driven.
 *
 * Usage:
 *   node scripts/validate-curriculum.mjs
 *
 * Exit codes:
 *   0 - Validation passed (no hardcoded values or counts match)
 *   1 - Validation failed (hardcoded values found or counts mismatch)
 * =============================================================================
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper functions for colored output
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
 * Parse curriculumData.js file to extract module count and check for hardcoded values
 * This approach reads the file directly and uses regex to find patterns
 */
function parseCurriculumData() {
  const curriculumDataPath = resolve(__dirname, '../src/data/curriculumData.js');
  const fileContent = readFileSync(curriculumDataPath, 'utf-8');
  
  // Count modules by finding module key definitions
  // Pattern: 'module-id': { or "module-id": {
  // First, find the modules: { ... } block
  const modulesStartMatch = fileContent.match(/modules:\s*\{/);
  if (!modulesStartMatch) {
    throw new Error('Could not find modules object in curriculumData.js');
  }
  
  // Find the matching closing brace by counting braces
  let braceCount = 0;
  let modulesStart = modulesStartMatch.index + modulesStartMatch[0].length - 1;
  let modulesEnd = modulesStart;
  let inString = false;
  let stringChar = null;
  
  for (let i = modulesStart; i < fileContent.length; i++) {
    const char = fileContent[i];
    const prevChar = i > 0 ? fileContent[i - 1] : '';
    
    // Handle string literals
    if (!inString && (char === '"' || char === "'") && prevChar !== '\\') {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      stringChar = null;
    }
    
    // Count braces only when not in string
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          modulesEnd = i;
          break;
        }
      }
    }
  }
  
  // Extract only the modules section
  const modulesSection = fileContent.substring(modulesStart, modulesEnd);
  
  // Match module keys within the modules section
  // Pattern: 'key': { or "key": {
  const moduleKeyPattern = /(?:^|,|\n)\s*['"]([^'"]+)['"]:\s*\{/gm;
  const moduleMatches = [...modulesSection.matchAll(moduleKeyPattern)];
  
  // Extract all module IDs
  const allModuleIds = moduleMatches.map(match => match[1]).filter(Boolean);
  
  // Filter out duplicate/compatibility modules (same logic as index.js)
  // These modules are kept for backward compatibility but shouldn't be counted in the total
  // Based on curriculum structure analysis:
  // - 'respiratory-anatomy': duplicate/compatibility wrapper for module-01-fundamentals
  // - 'respiratory-physiology': may also be part of fundamentals or duplicate
  // Adjust this list based on actual curriculum structure
  const excludedIds = ['respiratory-anatomy', 'respiratory-physiology']; // Modules to exclude from count
  
  const uniqueModuleIds = allModuleIds.filter(id => !excludedIds.includes(id));
  const actualCount = uniqueModuleIds.length;
  
  // Extract module IDs for reporting
  const moduleIds = uniqueModuleIds;
  
  // Check for hardcoded totalModules in metadata
  // Pattern: totalModules: number (not in a comment)
  // Look specifically in the metadata section
  const metadataSection = fileContent.match(/metadata:\s*\{([\s\S]*?)\n\s*\}/);
  let activeMetadataMatches = [];
  
  if (metadataSection) {
    const metadataContent = metadataSection[1];
    const metadataHardcodePattern = /(?:^|\n)\s*totalModules:\s*(\d+)/gm;
    const metadataMatches = [...metadataContent.matchAll(metadataHardcodePattern)];
    
    // Filter out commented lines
    activeMetadataMatches = metadataMatches.filter(match => {
      const relativeIndex = match.index;
      const lineStart = metadataContent.lastIndexOf('\n', relativeIndex);
      const line = metadataContent.substring(lineStart + 1, relativeIndex + match[0].length);
      return !line.trim().startsWith('//');
    });
  }
  
  // Check for hardcoded totalModules in levels array
  // Pattern: totalModules: number within levels array (not commented)
  const levelsSectionMatch = fileContent.match(/levels:\s*\[([\s\S]*?)\]\s*,/);
  let levelHardcodeMatches = [];
  
  if (levelsSectionMatch) {
    const levelsContent = levelsSectionMatch[1];
    const levelHardcodePattern = /(?:^|\n)\s*totalModules:\s*(\d+)/gm;
    const matches = [...levelsContent.matchAll(levelHardcodePattern)];
    
    // Filter out commented lines
    levelHardcodeMatches = matches.filter(match => {
      const relativeIndex = match.index;
      const lineStart = levelsContent.lastIndexOf('\n', relativeIndex);
      const line = levelsContent.substring(
        lineStart === -1 ? 0 : lineStart + 1, 
        relativeIndex + match[0].length
      );
      // Check if the line starts with // (ignoring whitespace)
      const trimmedLine = line.trim();
      return !trimmedLine.startsWith('//') && !trimmedLine.match(/^\s*\/\//);
    });
  }
  
  return {
    actualCount,
    moduleIds,
    metadataHardcoded: activeMetadataMatches.map(m => ({
      value: parseInt(m[1], 10),
      index: m.index,
    })),
    levelsHardcoded: levelHardcodeMatches.map(m => ({
      value: parseInt(m[1], 10),
    })),
  };
}

/**
 * Count modules by level
 */
function countModulesByLevel(fileContent, moduleIds) {
  const levels = [
    { id: 'beginner', count: 0 },
    { id: 'intermediate', count: 0 },
    { id: 'advanced', count: 0 },
  ];
  
  // For each module ID, find its level definition
  moduleIds.forEach(moduleId => {
    // Find the module definition block
    const modulePattern = new RegExp(`['"]${moduleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'm');
    const moduleMatch = fileContent.match(modulePattern);
    
    if (moduleMatch) {
      const moduleContent = moduleMatch[1];
      // Find level: 'beginner' | 'intermediate' | 'advanced'
      const levelMatch = moduleContent.match(/level:\s*['"](beginner|intermediate|advanced)['"]/);
      if (levelMatch) {
        const levelId = levelMatch[1];
        const level = levels.find(l => l.id === levelId);
        if (level) {
          level.count++;
        }
      }
    }
  });
  
  return levels;
}

/**
 * Load and validate metadata file if it exists
 */
function loadMetadataFile() {
  try {
    const metadataPath = resolve(__dirname, '../src/data/curriculum/meta.json');
    const metadataContent = readFileSync(metadataPath, 'utf-8');
    return JSON.parse(metadataContent);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist, that's okay
    }
    throw error;
  }
}

/**
 * Main validation function
 */
async function validateCurriculum() {
  logInfo('Validating curriculum consistency...\n');
  
  let parsedData;
  try {
    parsedData = parseCurriculumData();
  } catch (error) {
    logError(`Failed to parse curriculumData.js: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
  
  const { actualCount, moduleIds, metadataHardcoded, levelsHardcoded } = parsedData;
  
  logInfo(`Actual module count: ${actualCount}`);
  if (moduleIds.length > 0) {
    logInfo(`Module IDs: ${moduleIds.slice(0, 5).join(', ')}${moduleIds.length > 5 ? ` ... (+${moduleIds.length - 5} more)` : ''}`);
  }
  
  // Check for hardcoded values
  const hasHardcodedMetadata = metadataHardcoded.length > 0;
  const hasHardcodedLevels = levelsHardcoded.length > 0;
  
  if (hasHardcodedMetadata || hasHardcodedLevels) {
    logError('\n❌ VALIDATION FAILED: Hardcoded values detected!\n');
    
    if (hasHardcodedMetadata) {
      metadataHardcoded.forEach(hardcode => {
        logError(`NC-001: Hardcoded totalModules found in metadata: ${hardcode.value}`);
      });
    }
    
    if (hasHardcodedLevels) {
      levelsHardcoded.forEach(hardcode => {
        logError(`NC-001: Hardcoded totalModules found in levels array: ${hardcode.value}`);
      });
    }
    
    logError(`\nActual count: ${actualCount}`);
    logError('\nSolution: Remove hardcoded values and use selectors.js for dynamic calculation.');
    logError('  - Remove totalModules from curriculumData.metadata');
    logError('  - Remove totalModules from curriculumData.levels[]');
    logError('  - Use getModulesCount() from data/curriculum/selectors.js instead\n');
    
    process.exit(1);
  }
  
  // Check metadata file if it exists
  const metadata = loadMetadataFile();
  if (metadata) {
    if (typeof metadata.declaredTotal === 'number') {
      logInfo(`Declared total in meta.json: ${metadata.declaredTotal}`);
      
      if (metadata.declaredTotal !== actualCount) {
        logError('\n❌ VALIDATION FAILED: Count mismatch!\n');
        logError(`NC-001: declaredTotal=${metadata.declaredTotal} difiere de actualCount=${actualCount}.`);
        logError('Corrige metadatos o crea módulos faltantes.\n');
        process.exit(1);
      }
      
      logSuccess(`Counts match: declaredTotal=${metadata.declaredTotal}, actualCount=${actualCount}`);
    }
    
    // Check strategy
    if (metadata.strategy) {
      logInfo(`Strategy: ${metadata.strategy}`);
      if (metadata.strategy === 'data-driven') {
        logInfo('Using data-driven strategy: Only real modules are counted (no placeholders)');
      } else if (metadata.strategy === 'roadmap') {
        logInfo('Using roadmap strategy: Real modules + placeholders are counted');
      }
    }
  }
  
  // Count by level for reporting
  try {
    const curriculumDataPath = resolve(__dirname, '../src/data/curriculumData.js');
    const fileContent = readFileSync(curriculumDataPath, 'utf-8');
    const levelCounts = countModulesByLevel(fileContent, moduleIds);
    
    logInfo('\nModules by level:');
    levelCounts.forEach(level => {
      logInfo(`  ${level.id}: ${level.count} modules`);
    });
  } catch (error) {
    // Non-critical, just skip level counting
    logWarning(`Could not count modules by level: ${error.message}`);
  }
  
  // All checks passed
  logSuccess('\n✅ VALIDATION PASSED');
  logSuccess('OK: El total de módulos se infiere de los datos. No hay hardcode.');
  logInfo(`Total modules: ${actualCount} (calculated dynamically)`);
  
  process.exit(0);
}

// Run validation
validateCurriculum().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
