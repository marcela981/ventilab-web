/**
 * Script: Remove PropTypes from all JSX/JS files
 * Phase 1 Cleanup — YAGNI
 * 
 * Removes:
 * 1. `import PropTypes from 'prop-types';` lines
 * 2. `ComponentName.propTypes = { ... };` blocks (handles multi-line)
 * 3. `ComponentName.defaultProps = { ... };` blocks (also dead weight with defaults in destructuring)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', 'src');
const pagesDir = path.resolve(__dirname, '..', 'pages');

let totalFilesModified = 0;
let totalImportsRemoved = 0;
let totalPropTypesBlocksRemoved = 0;
let totalDefaultPropsBlocksRemoved = 0;

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

function removeProptypesFromFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  let importsRemoved = 0;
  let propTypesBlocksRemoved = 0;
  let defaultPropsBlocksRemoved = 0;

  // 1. Remove import PropTypes from 'prop-types'
  const importRegex = /^import\s+PropTypes\s+from\s+['"]prop-types['"];?\s*\n?/gm;
  const importMatches = content.match(importRegex);
  if (importMatches) {
    importsRemoved = importMatches.length;
    content = content.replace(importRegex, '');
  }

  // Also handle: import { ... } from 'prop-types'
  const namedImportRegex = /^import\s+\{[^}]*\}\s+from\s+['"]prop-types['"];?\s*\n?/gm;
  const namedMatches = content.match(namedImportRegex);
  if (namedMatches) {
    importsRemoved += namedMatches.length;
    content = content.replace(namedImportRegex, '');
  }

  // 2. Remove .propTypes = { ... }; blocks (multi-line)
  // This regex handles nested braces up to 3 levels deep
  const propTypesBlockRegex = /\n?\w+\.propTypes\s*=\s*\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\};?\s*\n?/g;
  const ptMatches = content.match(propTypesBlockRegex);
  if (ptMatches) {
    propTypesBlocksRemoved = ptMatches.length;
    content = content.replace(propTypesBlockRegex, '\n');
  }

  // 3. Remove .defaultProps = { ... }; blocks (multi-line)
  const defaultPropsBlockRegex = /\n?\w+\.defaultProps\s*=\s*\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\};?\s*\n?/g;
  const dpMatches = content.match(defaultPropsBlockRegex);
  if (dpMatches) {
    defaultPropsBlocksRemoved = dpMatches.length;
    content = content.replace(defaultPropsBlockRegex, '\n');
  }

  // Clean up multiple consecutive blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    const relPath = path.relative(path.resolve(__dirname, '..'), filePath);
    console.log(`  ✅ ${relPath} (imports: ${importsRemoved}, propTypes: ${propTypesBlocksRemoved}, defaultProps: ${defaultPropsBlocksRemoved})`);
    totalFilesModified++;
    totalImportsRemoved += importsRemoved;
    totalPropTypesBlocksRemoved += propTypesBlocksRemoved;
    totalDefaultPropsBlocksRemoved += defaultPropsBlocksRemoved;
  }
}

console.log('🧹 Removing PropTypes from project...\n');

const files = [
  ...findFiles(srcDir, ['.jsx', '.js', '.tsx', '.ts']),
  ...findFiles(pagesDir, ['.jsx', '.js', '.tsx', '.ts']),
];

console.log(`Found ${files.length} source files to scan.\n`);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('PropTypes') || content.includes('propTypes') || content.includes('defaultProps')) {
    removeProptypesFromFile(file);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Summary:`);
console.log(`   Files modified:         ${totalFilesModified}`);
console.log(`   Imports removed:        ${totalImportsRemoved}`);
console.log(`   .propTypes blocks:      ${totalPropTypesBlocksRemoved}`);
console.log(`   .defaultProps blocks:   ${totalDefaultPropsBlocksRemoved}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
