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
    { from: /@\/features\/ensenanza\/curriculum\/shared\/pages\/hooks/g, to: '@/features/ensenanza/curriculum/shared/conexion/hooks' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/pages\/FlashcardSystem/g, to: '@/features/ensenanza/curriculum/shared/modulos/FlashcardSystem' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/pages\/components\/TeachingLessonView/g, to: '@/features/ensenanza/curriculum/shared/leccion/TeachingLessonView' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/pages\/components\/TeachingTabs/g, to: '@/features/ensenanza/curriculum/shared/pages/TeachingTabs' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/pages\/components\/ProgressTabSkeleton/g, to: '@/features/ensenanza/dashboard/components/ProgressTabSkeleton' },
    
    { from: /@\/features\/ensenanza\/curriculum\/shared\/ai\/hooks/g, to: '@/features/ensenanza/curriculum/shared/conexion/hooks' },
    
    { from: /@\/features\/ensenanza\/curriculum\/shared\/modulos\/hooks/g, to: '@/features/ensenanza/curriculum/shared/conexion/hooks' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/modulos\/ModuleLessonsList/g, to: '@/features/ensenanza/curriculum/shared/modulos/ModuleLessonsList' }, // if wrong
    
    { from: /@\/features\/ensenanza\/curriculum\/shared\/leccion\/hooks/g, to: '@/features/ensenanza/curriculum/shared/conexion/hooks' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/leccion\/ai/g, to: '@/features/ensenanza/curriculum/shared/ai' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/leccion\/components\/LessonViewer/g, to: '@/features/ensenanza/curriculum/shared/leccion/LessonViewer' },
    
    { from: /@\/features\/ensenanza\/curriculum\/shared\/media\/content/g, to: '@/features/ensenanza/curriculum/shared/leccion/content' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/leccion\/sections\/content/g, to: '@/features/ensenanza/curriculum/shared/leccion/content' },
    
    { from: /@\/features\/ensenanza\/dashboard\/components\/hooks/g, to: '@/features/ensenanza/curriculum/shared/conexion/hooks' },
    { from: /@\/features\/ensenanza\/progreso\/components\/hooks/g, to: '@/features/ensenanza/curriculum/shared/conexion/hooks' },
    
    { from: /@\/features\/ensenanza\/dashboard\/FlashcardSystem/g, to: '@/features/ensenanza/curriculum/shared/modulos/FlashcardSystem' },
    
    { from: /@\/features\/ensenanza\/curriculum\/shared\/[^\/]+\/theme/g, to: '@/theme' },
    { from: /@\/features\/ensenanza\/theme/g, to: '@/theme' },
    
    { from: /@\/features\/ensenanza\/curriculum\/shared\/[^\/]+\/shared\/hooks/g, to: '@/shared/hooks' },
    
    // Also fix the case where index.js points to ./LessonViewer
    { from: /['"]\.\/LessonViewer['"]/g, to: "'@/features/ensenanza/curriculum/shared/leccion/LessonViewer'" },
    { from: /['"]\.\/LessonViewerWrapper['"]/g, to: "'@/features/ensenanza/curriculum/shared/leccion/LessonViewerWrapper'" },
    { from: /['"]\.\/LessonLoadingSkeleton['"]/g, to: "'@/features/ensenanza/curriculum/shared/leccion/LessonLoadingSkeleton'" },
    { from: /['"]\.\/LessonErrorState['"]/g, to: "'@/features/ensenanza/curriculum/shared/leccion/LessonErrorState'" },
    { from: /['"]\.\/TeachingLessonView['"]/g, to: "'@/features/ensenanza/curriculum/shared/leccion/TeachingLessonView'" },
    { from: /['"]\.\/ProgressTracker['"]/g, to: "'@/features/ensenanza/progreso/ProgressTracker'" },
    { from: /['"]\.\/TeachingModule['"]/g, to: "'@/features/ensenanza/curriculum/shared/pages/TeachingModule'" },
];

files.forEach(file => {
   let content = fs.readFileSync(file, 'utf8');
   let newContent = content;

   fixes.forEach(fix => {
       newContent = newContent.replace(fix.from, fix.to);
   });

   if (content !== newContent) {
       fs.writeFileSync(file, newContent, 'utf8');
       changedCount++;
   }
});

console.log(`Patched specific broken absolute aliases in ${changedCount} files.`);
