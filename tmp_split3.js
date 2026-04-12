const fs = require('fs');
const path = require('path');

const curriculumPath = 'src/features/ensenanza/shared/data/curriculumData.js';
let code = fs.readFileSync(curriculumPath, 'utf8');

// Strip out imports completely.
code = code.replace(/import\s.*?;/g, '');

// Strip all exports completely
code = code.replace(/export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*/g, 'const $1 = ');
code = code.replace(/export\s+function\s+([a-zA-Z0-9_]+)/g, 'function $1');
code = code.replace(/export\s+default\s+/g, '');
code = code.replace(/const const curriculumData_temp =/g, 'const curriculumData =');

// Replace `lessonData: someVar` with `lessonData: null`
code = code.replace(/lessonData:\s+[a-zA-Z0-9_]+/g, 'lessonData: null');

// Replace dynamic expressions
code = code.replace(/([a-zA-Z0-9_]+)\.(title|description|estimatedTime|difficulty|order)\s*\|\|\s*/g, '');

code += '\nreturn curriculumData;\n';

try {
  const evaluate = new Function(code);
  const data = evaluate();
  
  const ensenanzaRespiratoria = {};
  const preRequisitos = {};

  for (const [key, module] of Object.entries(data.modules)) {
    if (module.lessons) {
      module.lessons = module.lessons.map(lesson => {
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || '',
          estimatedTime: lesson.estimatedTime || 30,
          difficulty: lesson.difficulty || 'beginner',
          order: lesson.order || 1,
          type: lesson.type || 'reading'
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

  const header = '/**\n * Módulos exportados - Estructura estática sin contenido pesado\n */\n\n';
  fs.writeFileSync(
    'src/features/ensenanza/curriculum/ensenanzaRespiratoria/modules.js',
    header + 'export const respiratoriaModules = ' + JSON.stringify(ensenanzaRespiratoria, null, 2) + ';\n',
    'utf8'
  );
  fs.writeFileSync(
    'src/features/ensenanza/curriculum/preRequisitos/modules.js',
    header + 'export const preRequisitosModules = ' + JSON.stringify(preRequisitos, null, 2) + ';\n',
    'utf8'
  );

  console.log('Successfully split the curriculum!');
} catch (e) {
  console.error(e);
}
