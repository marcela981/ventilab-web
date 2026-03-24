const fs = require('fs');
const path = require('path');

const curriculumPath = 'src/features/ensenanza/shared/data/curriculumData.js';
let code = fs.readFileSync(curriculumPath, 'utf8');

// Strip out imports completely.
code = code.replace(/import\s.*?;/g, '');

// Convert export const curriculumData = { to const curriculumData = {
code = code.replace(/export\s+const\s+curriculumData\s+=/, 'const curriculumData =');

// Append an export module.exports = curriculumData;
code += '\nmodule.exports = curriculumData;\n';

// Eliminate the objects from the import: "module01Inversion" etc.
// Replace `lessonData: someVar` with `lessonData: null`
code = code.replace(/lessonData:\s+[a-zA-Z0-9_]+/g, 'lessonData: null');

// Replace any dynamically assigned title/description from imports
// e.g. `title: module01Inversion.title || 'La Inversion...'`
code = code.replace(/([a-zA-Z0-9_]+)\.(title|description|estimatedTime|difficulty|order)\s*\|\|\s*/g, '');

const tempFile = 'temp_eval.js';
fs.writeFileSync(tempFile, code, 'utf8');

try {
  const data = require('./' + tempFile);
  
  const ensenanzaRespiratoria = {};
  const preRequisitos = {};

  for (const [key, module] of Object.entries(data.modules)) {
    // Strip heavy lesson data completely, we just need the structural function/metadata
    if (module.lessons) {
      module.lessons = module.lessons.map(lesson => {
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          estimatedTime: lesson.estimatedTime,
          difficulty: lesson.difficulty,
          order: lesson.order,
          type: lesson.type
        };
      });
    }

    if (module.level === 'prerequisitos') {
      preRequisitos[key] = module;
    } else {
      ensenanzaRespiratoria[key] = module;
    }
  }

  // Ensure directories exist
  fs.mkdirSync('src/features/ensenanza/curriculum/ensenanzaRespiratoria', { recursive: true });
  fs.mkdirSync('src/features/ensenanza/curriculum/preRequisitos', { recursive: true });

  // Write files
  const header = '/**\n * Módulos exportados para Prisma / Lógica\n */\n\n';
  fs.writeFileSync('src/features/ensenanza/curriculum/ensenanzaRespiratoria/modules.js', header + 'export const respiratoriaModules = ' + JSON.stringify(ensenanzaRespiratoria, null, 2) + ';\n', 'utf8');
  fs.writeFileSync('src/features/ensenanza/curriculum/preRequisitos/modules.js', header + 'export const preRequisitosModules = ' + JSON.stringify(preRequisitos, null, 2) + ';\n', 'utf8');

  console.log('Successfully split the curriculum!');
} catch (e) {
  console.error(e);
} finally {
  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
}
