const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
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
let changed = 0;
files.forEach(file => {
   let content = fs.readFileSync(file, 'utf8');
   if (content.includes('features/teaching')) {
       // Also handle specific Teaching components names if needed, but for now just paths.
       let newContent = content.replace(/features\/teaching/g, 'features/ensenanza');
       fs.writeFileSync(file, newContent, 'utf8');
       changed++;
   }
});
console.log(`Updated ${changed} files.`);
