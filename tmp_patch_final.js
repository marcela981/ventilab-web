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
    { from: /['"]\.\/ClinicalCase['"]/g, to: "'@/features/ensenanza/curriculum/shared/clinical/ClinicalCase'" },
    { from: /@\/features\/ensenanza\/curriculum\/hooks\/useAITutor/g, to: '@/features/ensenanza/curriculum/shared/conexion/hooks/useAITutor' },
    { from: /['"]\.\/hooks\/useTeachingModule['"]/g, to: "'@/features/ensenanza/curriculum/shared/conexion/hooks/useTeachingModule'" },
    
    // index.js in leccion
    { from: /['"]\.\/curriculum['"]/g, to: "'@/features/ensenanza/curriculum/shared/modulos'" },
    { from: /['"]\.\/TeachingTabs['"]/g, to: "'@/features/ensenanza/curriculum/shared/pages/TeachingTabs'" },
    { from: /['"]\.\/ProgressTabSkeleton['"]/g, to: "'@/features/ensenanza/dashboard/components/ProgressTabSkeleton'" },
    { from: /['"]\.\/media['"]/g, to: "'@/features/ensenanza/curriculum/shared/media'" },
    
    // LessonViewer
    { from: /@\/features\/ensenanza\/curriculum\/shared\/hooks\/useLesson/g, to: '@/features/ensenanza/curriculum/shared/conexion/hooks/useLesson' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/hooks\/useLessonPages/g, to: '@/features/ensenanza/curriculum/shared/conexion/hooks/useLessonPages' },
    { from: /['"]\.\/ai\/TutorAIPopup['"]/g, to: "'@/features/ensenanza/curriculum/shared/ai/TutorAIPopup'" },
    { from: /['"]\.\/ai\/AITopicExpander['"]/g, to: "'@/features/ensenanza/curriculum/shared/ai/AITopicExpander'" },
    
    // media index
    { from: /@\/features\/ensenanza\/curriculum\/shared\/content/g, to: '@/features/ensenanza/curriculum/shared/leccion/content' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/content\/MediaSkeleton/g, to: '@/features/ensenanza/curriculum/shared/leccion/content/MediaSkeleton' },
    { from: /@\/features\/ensenanza\/curriculum\/shared\/content\/MediaFallback/g, to: '@/features/ensenanza/curriculum/shared/leccion/content/MediaFallback' },
    
    { from: /@\/features\/ensenanza\/curriculum\/hooks\/useLessonAvailability/g, to: '@/features/ensenanza/curriculum/shared/conexion/hooks/useLessonAvailability' },
    
    // TeachingModule
    { from: /['"]\.\/hooks\/useModuleProgress['"]/g, to: "'@/features/ensenanza/curriculum/shared/conexion/hooks/useModuleProgress'" },
    { from: /['"]\.\/hooks\/useModuleAvailability['"]/g, to: "'@/features/ensenanza/curriculum/shared/conexion/hooks/useModuleAvailability'" },
    { from: /['"]\.\/FlashcardSystem['"]/g, to: "'@/features/ensenanza/curriculum/shared/modulos/FlashcardSystem'" },
    { from: /['"]\.\/components\/TeachingLessonView['"]/g, to: "'@/features/ensenanza/curriculum/shared/leccion/TeachingLessonView'" },
    { from: /['"]\.\/components\/TeachingTabs['"]/g, to: "'@/features/ensenanza/curriculum/shared/pages/TeachingTabs'" },
    { from: /['"]\.\/components\/ProgressTabSkeleton['"]/g, to: "'@/features/ensenanza/dashboard/components/ProgressTabSkeleton'" },
    { from: /@\/features\/ensenanza\/curriculum\/features\/dashboard\/DashboardTab/g, to: '@/features/ensenanza/dashboard/components/DashboardTab' }, // Assumes DashboardTab was moved here or exists there
    
    { from: /@\/features\/ensenanza\/FlashcardSystem/g, to: '@/features/ensenanza/curriculum/shared/modulos/FlashcardSystem' },
    { from: /['"]\.\/pages\/LessonViewerRouteAdapter['"]/g, to: "'@/features/ensenanza/curriculum/shared/pages/LessonViewerRouteAdapter'" },
    { from: /['"]\.\/components\/LessonViewer['"]/g, to: "'@/features/ensenanza/curriculum/shared/leccion/LessonViewer'" },
    { from: /@\/features\/ensenanza\/hooks\/useProgressTree/g, to: '@/features/ensenanza/curriculum/shared/conexion/hooks/useProgressTree' }
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

console.log(`Final patch applied to ${changedCount} files.`);
