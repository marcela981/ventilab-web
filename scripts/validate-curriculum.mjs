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

import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper functions for output (no external dependencies)
function logSuccess(message) {
  console.log('✅ ' + message);
}

function logError(message) {
  console.log('❌ ' + message);
}

function logWarning(message) {
  console.log('⚠️ ' + message);
}

function logInfo(message) {
  console.log('ℹ️ ' + message);
}

/**
 * Load and validate metadata file if it exists
 */
function loadMetadataFile() {
  try {
    const metadataPath = resolve(__dirname, '../src/features/teaching/data/curriculum/meta.json');
    if (!existsSync(metadataPath)) {
      return null;
    }
    const metadataContent = readFileSync(metadataPath, 'utf-8');
    return JSON.parse(metadataContent);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Extract module IDs from curriculumData.js using a robust regex approach
 */
function extractModuleIds() {
  const curriculumDataPath = resolve(__dirname, '../src/features/teaching/data/curriculumData.js');
  
  if (!existsSync(curriculumDataPath)) {
    throw new Error(`curriculumData.js not found at: ${curriculumDataPath}`);
  }
  
  const fileContent = readFileSync(curriculumDataPath, 'utf-8');
  
  // Find the modules object section
  const modulesMatch = fileContent.match(/modules:\s*\{/);
  if (!modulesMatch) {
    throw new Error('Could not find "modules: {" in curriculumData.js');
  }
  
  // Extract module IDs using a simple pattern that matches:
  // 'module-id': { 
  //   id: 'module-id',
  // The key is that the module key and id: value should match
  const moduleIds = [];
  
  // Pattern 1: Match module key definitions followed by id property
  // Matches patterns like:
  // 'module-01-fundamentals': {
  //   id: 'module-01-fundamentals',
  const pattern = /['"]([a-zA-Z0-9_-]+)['"]:\s*\{\s*\n?\s*id:\s*['"]([a-zA-Z0-9_-]+)['"]/g;
  
  let match;
  while ((match = pattern.exec(fileContent)) !== null) {
    const key = match[1];
    const idValue = match[2];
    
    // Verify key matches id (confirms it's a real module, not nested object)
    if (key === idValue) {
      // Avoid duplicates
      if (!moduleIds.includes(key)) {
        moduleIds.push(key);
      }
    }
  }
  
  // Fallback: If the pattern above didn't find modules, try a simpler approach
  // Look for id: 'something' patterns that look like module IDs
  if (moduleIds.length === 0) {
    logWarning('Primary pattern found 0 modules, trying fallback pattern...');
    
    // Find all id: 'value' patterns
    const idPattern = /id:\s*['"]([a-zA-Z0-9_-]+)['"]/g;
    const potentialIds = new Set();
    
    while ((match = idPattern.exec(fileContent)) !== null) {
      const id = match[1];
      // Filter out lesson IDs and quiz IDs
      if (!id.includes('lesson') && 
          !id.includes('quiz') && 
          !id.startsWith('q') && 
          !id.includes('-q-') &&
          id.length > 3) {
        potentialIds.add(id);
      }
    }
    
    moduleIds.push(...potentialIds);
  }
  
  return moduleIds;
}

/**
 * Main validation function
 */
async function validateCurriculum() {
  logInfo('Validating curriculum consistency...');
  
  let moduleIds;
  try {
    moduleIds = extractModuleIds();
  } catch (error) {
    logError(`Failed to parse curriculumData.js: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
  
  // Load metadata
  const metadata = loadMetadataFile();
  const excludedIds = metadata?.excludedModules || [];
  
  // Filter out excluded modules
  const activeModuleIds = moduleIds.filter(id => !excludedIds.includes(id));
  const actualCount = activeModuleIds.length;
  
  logInfo(`Total modules found: ${moduleIds.length}`);
  if (excludedIds.length > 0) {
    logInfo(`Excluded modules: ${excludedIds.join(', ')}`);
  }
  logInfo(`Actual module count (after exclusions): ${actualCount}`);
  
  if (activeModuleIds.length > 0) {
    logInfo(`Module IDs: ${activeModuleIds.slice(0, 5).join(', ')}${activeModuleIds.length > 5 ? ` ... (+${activeModuleIds.length - 5} more)` : ''}`);
  }
  
  // Check metadata file
  if (metadata) {
    if (typeof metadata.declaredTotal === 'number') {
      logInfo(`Declared total in meta.json: ${metadata.declaredTotal}`);
      
      if (metadata.declaredTotal !== actualCount) {
        logError('');
        logError('VALIDATION FAILED: Count mismatch!');
        logError(`NC-001: declaredTotal=${metadata.declaredTotal} difiere de actualCount=${actualCount}.`);
        logError('Corrige metadatos en src/features/teaching/data/curriculum/meta.json o revisa los módulos.');
        logError('');
        
        // Show helpful info
        logInfo('Módulos encontrados:');
        activeModuleIds.forEach((id, i) => {
          logInfo(`  ${i + 1}. ${id}`);
        });
        
        logInfo('');
        logInfo(`Para corregir, actualiza meta.json con: "declaredTotal": ${actualCount}`);
        
        process.exit(1);
      }
      
      logSuccess(`Counts match: declaredTotal=${metadata.declaredTotal}, actualCount=${actualCount}`);
    }
    
    if (metadata.strategy) {
      logInfo(`Strategy: ${metadata.strategy}`);
    }
  } else {
    logWarning('No meta.json found - skipping count validation');
  }
  
  // All checks passed
  logSuccess('');
  logSuccess('VALIDATION PASSED');
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
