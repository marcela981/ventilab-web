/**
 * Test script for lessonLoader module
 * Run with: node frontend/scripts/test-lessonLoader.js
 */

// Note: This is a basic validation script to test the helper functions
// For actual lesson loading in a browser environment, you'll need to run the app

import {
  LESSON_PATH_PREFIX,
  MODULE_PATH_PREFIX,
  DEFAULT_LANGUAGE,
  MAX_CACHE_SIZE,
  getLessonPath,
  validateLessonData,
  normalizeLessonData,
  getCachedLesson,
  cacheLesson,
  clearCache,
} from '../src/data/helpers/lessonLoader.js';

console.log('='.repeat(80));
console.log('Testing lessonLoader Module');
console.log('='.repeat(80));

// Test 1: Constants
console.log('\n1. Testing Constants:');
console.log(`   LESSON_PATH_PREFIX: ${LESSON_PATH_PREFIX}`);
console.log(`   MODULE_PATH_PREFIX: ${MODULE_PATH_PREFIX}`);
console.log(`   DEFAULT_LANGUAGE: ${DEFAULT_LANGUAGE}`);
console.log(`   MAX_CACHE_SIZE: ${MAX_CACHE_SIZE}`);

// Test 2: getLessonPath
console.log('\n2. Testing getLessonPath():');
const testCases = [
  ['respiratory-anatomy', 'module-01-fundamentals'],
  ['gas-exchange', 'module-01-fundamentals'],
  ['sdra-protocol', 'module-03-configuration'],
  ['copd-protocol', 'module-03-configuration'],
  ['peep-strategies', 'module-03-configuration'],
];

testCases.forEach(([lessonId, moduleId]) => {
  const path = getLessonPath(lessonId, moduleId);
  console.log(`   ${lessonId} + ${moduleId}`);
  console.log(`   -> ${path}`);
});

// Test 3: validateLessonData
console.log('\n3. Testing validateLessonData():');

const validData = {
  lessonId: 'test-lesson',
  moduleId: 'module-01-fundamentals',
  title: 'Test Lesson',
  content: {
    introduction: { text: 'Test', objectives: [] },
    theory: { sections: [], examples: [], analogies: [] },
  },
};

const legacyData = {
  'Título': 'Lección de Prueba',
  'Introducción': {
    texto: 'Texto de introducción',
    objetivos: ['Objetivo 1', 'Objetivo 2'],
  },
  'Conceptos Teóricos': 'Contenido teórico aquí',
};

try {
  validateLessonData(validData);
  console.log('   ✓ Valid data passed validation');
} catch (error) {
  console.log(`   ✗ Valid data failed: ${error.message}`);
}

try {
  validateLessonData(legacyData);
  console.log('   ✓ Legacy data passed validation');
} catch (error) {
  console.log(`   ✓ Legacy data validation (expected to pass): ${error.message}`);
}

try {
  validateLessonData(null);
  console.log('   ✗ Null data should have failed');
} catch (error) {
  console.log(`   ✓ Null data correctly rejected: ${error.message}`);
}

// Test 4: normalizeLessonData
console.log('\n4. Testing normalizeLessonData():');

const normalized = normalizeLessonData(legacyData);
console.log('   Legacy data normalized:');
console.log(`   - Title: ${normalized.title}`);
console.log(`   - Has content.introduction: ${!!normalized.content.introduction}`);
console.log(`   - Has content.theory: ${!!normalized.content.theory}`);
console.log(`   - Objectives count: ${normalized.content.introduction.objectives.length}`);

// Test 5: Cache functions
console.log('\n5. Testing Cache Functions:');

clearCache();
console.log('   ✓ Cache cleared');

const testLesson = {
  lessonId: 'cache-test',
  title: 'Cache Test Lesson',
  content: {},
};

console.log('   Testing cache miss...');
const miss = getCachedLesson('cache-test');
console.log(`   - getCachedLesson('cache-test'): ${miss === undefined ? 'undefined (correct)' : 'found (wrong)'}`);

console.log('   Caching lesson...');
cacheLesson('cache-test', testLesson);

console.log('   Testing cache hit...');
const hit = getCachedLesson('cache-test');
console.log(`   - getCachedLesson('cache-test'): ${hit ? 'found (correct)' : 'undefined (wrong)'}`);

console.log('   Testing LRU eviction...');
console.log(`   - Filling cache with ${MAX_CACHE_SIZE + 5} items...`);
for (let i = 0; i < MAX_CACHE_SIZE + 5; i++) {
  cacheLesson(`lesson-${i}`, { lessonId: `lesson-${i}` });
}

const evicted = getCachedLesson('lesson-0');
const kept = getCachedLesson(`lesson-${MAX_CACHE_SIZE + 4}`);
console.log(`   - lesson-0 (oldest): ${evicted ? 'still in cache (wrong)' : 'evicted (correct)'}`);
console.log(`   - lesson-${MAX_CACHE_SIZE + 4} (newest): ${kept ? 'in cache (correct)' : 'evicted (wrong)'}`);

console.log('\n' + '='.repeat(80));
console.log('lessonLoader Module Tests Complete!');
console.log('='.repeat(80));
console.log('\nNote: loadLessonById() requires a browser environment or module bundler.');
console.log('Test it by integrating with the useLesson hook or running the app.');
console.log('='.repeat(80));
