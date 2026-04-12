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
const files = walk(path.join(baseDir, 'src/features/ensenanza'));
let changedCount = 0;

files.forEach(file => {
   let content = fs.readFileSync(file, 'utf8');
   let newContent = content;

   const importRegex = /((?:import|export)[^'"]+)['"]([^'"]*\.\.\/[^'"]*)['"]/g;
   
   newContent = newContent.replace(importRegex, (match, prefix, relPath) => {
       const currentDir = path.dirname(file);
       const absoluteResolved = path.resolve(currentDir, relPath);
       
       const srcDir = path.join(baseDir, 'src');
       if (absoluteResolved.startsWith(srcDir)) {
           const relativeToSrc = path.relative(srcDir, absoluteResolved);
           const newImportPath = '@/' + relativeToSrc.replace(/\\/g, '/');
           return `${prefix}'${newImportPath}'`;
       }
       return match;
   });
   
   if (content !== newContent) {
       fs.writeFileSync(file, newContent, 'utf8');
       changedCount++;
   }
});

console.log(`Resolved relative imports to absolute alias across ${changedCount} files.`);
