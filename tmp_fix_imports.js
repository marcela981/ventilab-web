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
            if (file.match(/\.(js|jsx|ts|tsx|md)$/)) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('c:/Marcela/TESIS/ventilab-web/src');
let changedCount = 0;

const replacements = [
    // Handle root files first
    { from: /features\/ensenanza\/ProgressTracker/g, to: 'features/ensenanza/progreso/ProgressTracker' },
    { from: /features\/ensenanza\/FlashcardDashboardPage/g, to: 'features/ensenanza/dashboard/FlashcardDashboardPage' },
    { from: /features\/ensenanza\/FlashcardSystem/g, to: 'features/ensenanza/curriculum/shared/modulos/FlashcardSystem' },
    { from: /features\/ensenanza\/ContentGeneratorPanel/g, to: 'features/ensenanza/curriculum/shared/ai/ContentGeneratorPanel' },
    { from: /features\/ensenanza\/TeachingModule/g, to: 'features/ensenanza/curriculum/shared/pages/TeachingModule' },

    // Handle deep components first
    { from: /features\/ensenanza\/components\/progress/g, to: 'features/ensenanza/progreso/components' },
    { from: /features\/ensenanza\/components\/dashboard/g, to: 'features/ensenanza/dashboard/components' },
    { from: /features\/ensenanza\/components\/ai/g, to: 'features/ensenanza/curriculum/shared/ai' },
    { from: /features\/ensenanza\/components\/curriculum/g, to: 'features/ensenanza/curriculum/shared/modulos' },
    { from: /features\/ensenanza\/components\/evaluation/g, to: 'features/ensenanza/curriculum/shared/evaluation' },
    { from: /features\/ensenanza\/components\/clinical/g, to: 'features/ensenanza/curriculum/shared/clinical' },
    { from: /features\/ensenanza\/components\/media/g, to: 'features/ensenanza/curriculum/shared/media' },
    { from: /features\/ensenanza\/components\/navigation/g, to: 'features/ensenanza/curriculum/shared/navigation' },
    { from: /features\/ensenanza\/components\/sections/g, to: 'features/ensenanza/curriculum/shared/leccion/sections' },
    
    // Now handle generic roots
    { from: /features\/ensenanza\/components/g, to: 'features/ensenanza/curriculum/shared/leccion' },
    { from: /features\/ensenanza\/contexts/g, to: 'features/ensenanza/curriculum/shared/contexts' },
    { from: /features\/ensenanza\/data/g, to: 'features/ensenanza/curriculum/shared/data' },
    { from: /features\/ensenanza\/utils/g, to: 'features/ensenanza/curriculum/shared/utils' },
    { from: /features\/ensenanza\/hooks/g, to: 'features/ensenanza/curriculum/shared/conexion/hooks' },
    { from: /features\/ensenanza\/services/g, to: 'features/ensenanza/curriculum/shared/conexion/services' },
    { from: /features\/ensenanza\/pages/g, to: 'features/ensenanza/curriculum/shared/pages' }
];

files.forEach(file => {
   let content = fs.readFileSync(file, 'utf8');
   let newContent = content;
   
   replacements.forEach(rep => {
       newContent = newContent.replace(rep.from, rep.to);
   });

   // Handle relative imports too (within ensenanza logic mapping is harder, but let's try to just replace absolute paths if we can)
   // Because they might use relative like '../../hooks'
   // Given the extensive restructuring, many relative paths might be broken. We will rely on TS/Vite errors to fix them or update alias.
   
   if (content !== newContent) {
       fs.writeFileSync(file, newContent, 'utf8');
       changedCount++;
   }
});

console.log(`Updated ${changedCount} files with new subfolder paths.`);
