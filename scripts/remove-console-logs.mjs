/**
 * Script: Remove debug console.log statements
 * Phase 1 Cleanup
 * 
 * Removes console.log() calls that are NOT:
 * - Inside comments (// or /* or *)
 * - Inside debug.ts (the controlled debug utility)
 * - Inside JSDoc examples
 * - In passwordValidator.js (JSDoc examples)
 * - In authService.js (JSDoc examples)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', 'src');
const pagesDir = path.resolve(__dirname, '..', 'pages');

// Files to skip (debug utilities, JSDoc-heavy files)
const SKIP_FILES = [
  'debug.ts',           // Controlled debug utility
  'passwordValidator.js', // All console.logs are in JSDoc
  'authService.js',     // All console.logs are in JSDoc
];

let totalFilesModified = 0;
let totalLinesRemoved = 0;

function findFiles(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      results.push(...findFiles(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

function removeConsoleLogs(filePath) {
  const basename = path.basename(filePath);
  if (SKIP_FILES.includes(basename)) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('console.log')) return;

  const lines = content.split('\n');
  const newLines = [];
  let linesRemoved = 0;
  let inMultiLineConsole = false;
  let braceDepth = 0;
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track block comments
    if (trimmed.startsWith('/*') || trimmed.startsWith('/**')) {
      inBlockComment = true;
    }
    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      newLines.push(line);
      continue;
    }

    // If we're in a multi-line console.log
    if (inMultiLineConsole) {
      for (const ch of line) {
        if (ch === '(') braceDepth++;
        if (ch === ')') braceDepth--;
      }
      linesRemoved++;
      if (braceDepth <= 0) {
        inMultiLineConsole = false;
        braceDepth = 0;
      }
      continue;
    }

    // Skip lines that are comments with console.log examples
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      newLines.push(line);
      continue;
    }

    // Check if this line has a console.log
    if (trimmed.match(/console\.log\s*\(/)) {
      // Count parens to see if it's multi-line
      let depth = 0;
      for (const ch of line) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
      }
      if (depth > 0) {
        // Multi-line console.log
        inMultiLineConsole = true;
        braceDepth = depth;
      }
      linesRemoved++;
      continue;
    }

    newLines.push(line);
  }

  if (linesRemoved > 0) {
    // Clean up multiple blank lines
    let result = newLines.join('\n').replace(/\n{3,}/g, '\n\n');
    fs.writeFileSync(filePath, result, 'utf-8');
    const relPath = path.relative(path.resolve(__dirname, '..'), filePath);
    console.log(`  ✅ ${relPath} (${linesRemoved} lines removed)`);
    totalFilesModified++;
    totalLinesRemoved += linesRemoved;
  }
}

console.log('🧹 Removing debug console.log statements from frontend...\n');

const files = [
  ...findFiles(srcDir, ['.jsx', '.js', '.tsx', '.ts']),
  ...findFiles(pagesDir, ['.jsx', '.js', '.tsx', '.ts']),
];

console.log(`Found ${files.length} source files to scan.\n`);

for (const file of files) {
  removeConsoleLogs(file);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Summary:`);
console.log(`   Files modified:    ${totalFilesModified}`);
console.log(`   Lines removed:     ${totalLinesRemoved}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
