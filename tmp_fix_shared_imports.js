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

const files = walk('c:/Marcela/TESIS/ventilab-web/src/features/ensenanza');
let changedCount = 0;

const fixes = [
    { from: /@\/features\/ensenanza\/curriculum\/shared\/data/g, to: '@/features/ensenanza/shared/data' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/contexts/g, to: '@/features/ensenanza/shared/contexts' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/utils/g, to: '@/features/ensenanza/shared/utils' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/conexion\/hooks/g, to: '@/features/ensenanza/shared/hooks' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/conexion\/services/g, to: '@/features/ensenanza/shared/services' },
    { from: /@\/features\/ensenanza\/progreso/g, to: '@/features/ensenanza/shared/progreso' },
    { from: /@\/features\/ensenanza\/dashboard/g, to: '@/features/ensenanza/shared/dashboard' },
    
    // Everything else in curriculum/shared (which are components: ai, leccion, modulos, etc.) moves to shared/components/
    { from: /@\/features\/ensenanza\/curriculum\/shared\/([^"']+)/g, to: '@/features/ensenanza/shared/components/$1' }
];

files.forEach(file => {
   let content = fs.readFileSync(file, 'utf8');
   let newContent = content;

   // Process in order
   fixes.forEach(fix => {
       newContent = newContent.replace(fix.from, fix.to);
   });

   if (content !== newContent) {
       fs.writeFileSync(file, newContent, 'utf8');
       changedCount++;
   }
});

console.log(`Shared root patch applied to ${changedCount} files.`);
