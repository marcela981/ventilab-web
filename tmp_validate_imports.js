const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.match(/\.(js|jsx|ts|tsx)$/)) {
                results.push(file);
            }
        }
    });
    return results;
}

const baseDir = 'c:/Marcela/TESIS/ventilab-web';
const srcDir = path.join(baseDir, 'src');
const files = walk(path.join(srcDir, 'features/ensenanza'));
let brokenLinksMap = {};

files.forEach(file => {
   const content = fs.readFileSync(file, 'utf8');
   const importExportRegex = /(?:import|export)\s+.*from\s+['"]([^'"]+)['"]/g;
   
   let match;
   while ((match = importExportRegex.exec(content)) !== null) {
       const importPath = match[1];
       if (importPath.startsWith('.') || importPath.startsWith('@/')) {
           let absolutePath = '';
           if (importPath.startsWith('@/')) {
               absolutePath = path.join(srcDir, importPath.substring(2));
           } else {
               absolutePath = path.resolve(path.dirname(file), importPath);
           }
           
           // Check resolution: could be .js, .jsx, .ts, .tsx, .json, or a directory with index.js/ts
           const exts = ['', '.js', '.jsx', '.ts', '.tsx', '.json', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];
           let exists = false;
           for(const ext of exts) {
               if (fs.existsSync(absolutePath + ext)) {
                   exists = true;
                   break;
               }
           }
           
           if (!exists) {
               if (!brokenLinksMap[file]) brokenLinksMap[file] = [];
               brokenLinksMap[file].push(importPath);
           }
       }
   }
});

fs.writeFileSync('c:/Marcela/TESIS/ventilab-web/broken_imports.json', JSON.stringify(brokenLinksMap, null, 2));
console.log(`Validation complete. Found broken imports in ${Object.keys(brokenLinksMap).length} files.`);
