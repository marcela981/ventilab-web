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
const targetFolder = path.join(baseDir, 'src/features/ensenanza/shared/components/leccion/content');
const files = walk(targetFolder);
let changedCount = 0;

files.forEach(file => {
   let content = fs.readFileSync(file, 'utf8');
   let newContent = content;

   // 1. teaching -> ensenanza
   newContent = newContent.replace(/features\/teaching/g, 'features/ensenanza');
   newContent = newContent.replace(/teachingModuleTheme/g, 'teachingModuleTheme');

   // 2. ensenanza/components -> ensenanza/shared/components
   newContent = newContent.replace(/@\/features\/ensenanza\/components/g, '@/features/ensenanza/shared/components');
   
   // 3. relative imports to absolute
   const importRegex = /((?:import|export)[^'"]+)['"]([^'"]*\.\.\/[^'"]*)['"]/g;
   newContent = newContent.replace(importRegex, (match, prefix, relPath) => {
       const currentDir = path.dirname(file);
       const absoluteResolved = path.resolve(currentDir, relPath);
       
       const srcDir = path.join(baseDir, 'src');
       if (absoluteResolved.startsWith(srcDir)) {
           const relativeToSrc = path.relative(srcDir, absoluteResolved);
           // Fix standard mapping for what we moved to shared/
           let newImportPath = relativeToSrc.replace(/\\/g, '/');
           // the original relative path would resolve to `src/features/ensenanza/components/` but we just moved
           // EVERYTHING from `components` to `shared/components`. So we fix it:
           newImportPath = newImportPath.replace(/^features\/ensenanza\/components/, 'features/ensenanza/shared/components');
           newImportPath = newImportPath.replace(/^features\/ensenanza\/hooks/, 'features/ensenanza/shared/hooks');
           newImportPath = newImportPath.replace(/^features\/ensenanza\/utils/, 'features/ensenanza/shared/utils');
           newImportPath = newImportPath.replace(/^features\/ensenanza\/data/, 'features/ensenanza/shared/data');
           
           return `${prefix}'@/${newImportPath}'`;
       }
       return match;
   });
   
   if (content !== newContent) {
       fs.writeFileSync(file, newContent, 'utf8');
       changedCount++;
   }
});

console.log(`Content patch applied to ${changedCount} files.`);
