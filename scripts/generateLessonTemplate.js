#!/usr/bin/env node

/**
 * =============================================================================
 * Interactive Lesson Template Generator for VentyLab
 * =============================================================================
 * Guides users through creating structured lesson JSON files.
 *
 * Usage: npm run generate-lesson
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');

// ANSI color codes
const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};

// Utility functions
const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);
const logSuccess = msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`);
const logError = msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`);
const logWarning = msg => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
const logInfo = msg => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`);
const logHeader = msg => {
  console.log(`\n${colors.bright}${colors.blue}${'═'.repeat(55)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  ${msg}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'═'.repeat(55)}${colors.reset}\n`);
};
const logSection = msg => console.log(`\n${colors.cyan}📋 ${msg}${colors.reset}\n`);

const onCancel = () => {
  logError('Operación cancelada por el usuario');
  process.exit(0);
};

/**
 * Prompt for basic lesson information
 */
async function promptBasicInfo() {
  logSection('Información Básica de la Lección');

  return await prompts([
    {
      type: 'text', name: 'id', message: '🎓 ID de la lección (ej: fundamentals-anatomy):',
      validate: v => v.length > 0 || 'El ID es requerido',
    },
    {
      type: 'text', name: 'title', message: '📖 Título de la lección:',
      validate: v => v.length > 0 || 'El título es requerido',
    },
    {
      type: 'text', name: 'module', message: '📚 ID del módulo (ej: module-01-fundamentals):',
      validate: v => v.length > 0 || 'El módulo es requerido',
    },
    {
      type: 'text', name: 'description', message: '📝 Descripción breve:',
      validate: v => v.length > 0 || 'La descripción es requerida',
    },
    {
      type: 'number', name: 'estimatedTime', message: '⏱️  Tiempo estimado (minutos):',
      initial: 30, validate: v => v > 0 || 'Debe ser mayor a 0',
    },
    {
      type: 'select', name: 'difficulty', message: '📊 Nivel de dificultad:',
      choices: [
        { title: 'Básico', value: 'basic' },
        { title: 'Intermedio', value: 'intermediate' },
        { title: 'Avanzado', value: 'advanced' },
      ],
    },
    {
      type: 'select', name: 'bloomLevel', message: '🎯 Nivel de Bloom:',
      choices: [
        { title: 'Recordar', value: 'remember' },
        { title: 'Comprender', value: 'understand' },
        { title: 'Aplicar', value: 'apply' },
        { title: 'Analizar', value: 'analyze' },
        { title: 'Evaluar', value: 'evaluate' },
        { title: 'Crear', value: 'create' },
      ],
    },
  ], { onCancel });
}

/**
 * Generic prompt for adding multiple items
 */
async function promptMultipleItems(section, itemName, emoji, askFirst = null) {
  logSection(section);

  if (askFirst) {
    const { shouldAdd } = await prompts({
      type: 'confirm', name: 'shouldAdd', message: askFirst, initial: false,
    }, { onCancel });
    if (!shouldAdd) return [];
  }

  const items = [];
  let addMore = true;

  while (addMore) {
    const { item } = await prompts({
      type: 'text', name: 'item',
      message: `${emoji} ${itemName} ${items.length + 1} (o Enter):`,
    }, { onCancel });

    if (item?.trim()) {
      items.push(item.trim());
      logSuccess(`Agregado: "${item}"`);
    } else {
      addMore = false;
    }
  }

  return items;
}

/**
 * Prompt for lesson sections
 */
async function promptSections() {
  logSection('Secciones de Contenido');

  const { numSections } = await prompts({
    type: 'number', name: 'numSections', message: '📄 ¿Cuántas secciones desea crear?',
    initial: 3, validate: v => v > 0 || 'Debe haber al menos 1 sección',
  }, { onCancel });

  const sections = [];

  for (let i = 0; i < numSections; i++) {
    log(`\n${colors.magenta}--- Sección ${i + 1} de ${numSections} ---${colors.reset}`);

    const sectionData = await prompts([
      {
        type: 'text', name: 'title', message: '📌 Título de la sección:',
        validate: v => v.length > 0 || 'El título es requerido',
      },
      {
        type: 'select', name: 'type', message: '🔖 Tipo de sección:',
        choices: [
          { title: 'Texto', value: 'text' },
          { title: 'Video', value: 'video' },
          { title: 'Imagen', value: 'image' },
          { title: 'Interactivo', value: 'interactive' },
          { title: 'Código', value: 'code' },
        ],
      },
      {
        type: 'confirm', name: 'includeExample', message: '💡 ¿Incluir contenido de ejemplo?',
        initial: true,
      },
    ], { onCancel });

    let content = {};
    if (sectionData.includeExample) {
      const examples = {
        text: { text: 'Contenido de texto aquí...' },
        video: { url: 'https://example.com/video.mp4', duration: 300 },
        image: { url: '/images/lesson-image.png', alt: 'Descripción de la imagen' },
        interactive: { componentId: 'InteractiveComponent', props: {} },
        code: { code: '// Código de ejemplo\nconsole.log("Hello World");', language: 'javascript' },
      };
      content = examples[sectionData.type] || {};
    }

    sections.push({ title: sectionData.title, type: sectionData.type, content });
    logSuccess(`Sección "${sectionData.title}" agregada`);
  }

  return sections;
}

/**
 * Prompt for quiz questions
 */
async function promptQuiz() {
  logSection('Preguntas de Evaluación');

  const { includeQuiz } = await prompts({
    type: 'confirm', name: 'includeQuiz', message: '❓ ¿Incluir quiz?', initial: true,
  }, { onCancel });

  if (!includeQuiz) return [];

  const questions = [];
  let addMore = true;

  while (addMore) {
    log(`\n${colors.magenta}--- Pregunta ${questions.length + 1} ---${colors.reset}`);

    const qData = await prompts([
      {
        type: 'select', name: 'type', message: '📝 Tipo:',
        choices: [
          { title: 'Opción Múltiple', value: 'multiple-choice' },
          { title: 'Verdadero/Falso', value: 'true-false' },
          { title: 'Respuesta Corta', value: 'short-answer' },
        ],
      },
      { type: 'text', name: 'question', message: '❓ Pregunta:', validate: v => v.length > 0 || 'Requerida' },
    ], { onCancel });

    let options = [], correctAnswer;

    if (qData.type === 'multiple-choice') {
      log('\n📋 Opciones (mínimo 2):');
      for (let i = 0; i < 4; i++) {
        const { option } = await prompts({ type: 'text', name: 'option', message: `   ${i + 1}:` }, { onCancel });
        if (option?.trim()) options.push(option.trim());
        else if (i >= 2) break;
      }
      const { correct } = await prompts({
        type: 'select', name: 'correct', message: '✅ Correcta:',
        choices: options.map((opt, idx) => ({ title: opt, value: idx })),
      }, { onCancel });
      correctAnswer = correct;
    } else if (qData.type === 'true-false') {
      const { correct } = await prompts({
        type: 'select', name: 'correct', message: '✅ Correcta:',
        choices: [{ title: 'Verdadero', value: true }, { title: 'Falso', value: false }],
      }, { onCancel });
      correctAnswer = correct;
    } else {
      const { answer } = await prompts({ type: 'text', name: 'answer', message: '✅ Correcta:' }, { onCancel });
      correctAnswer = answer;
    }

    const { explanation } = await prompts({ type: 'text', name: 'explanation', message: '💬 Explicación:' }, { onCancel });

    questions.push({
      type: qData.type,
      question: qData.question,
      options: options.length > 0 ? options : undefined,
      correctAnswer,
      explanation: explanation || undefined,
    });

    logSuccess('Pregunta agregada');
    const { continueAdding } = await prompts({
      type: 'confirm', name: 'continueAdding', message: '➕ ¿Otra?', initial: false,
    }, { onCancel });
    addMore = continueAdding;
  }

  return questions;
}

/**
 * Prompt for references
 */
async function promptReferences() {
  logSection('Referencias Bibliográficas');

  const { includeReferences } = await prompts({
    type: 'confirm', name: 'includeReferences', message: '📚 ¿Incluir referencias?',
    initial: false,
  }, { onCancel });

  if (!includeReferences) return [];

  const references = [];
  let addMore = true;

  while (addMore) {
    const ref = await prompts([
      { type: 'text', name: 'title', message: `📖 Título ${references.length + 1}:` },
      { type: 'text', name: 'authors', message: '✍️  Autores (coma):' },
      { type: 'text', name: 'url', message: '🔗 URL (opcional):' },
    ], { onCancel });

    if (ref.title) {
      references.push({
        title: ref.title,
        authors: ref.authors ? ref.authors.split(',').map(a => a.trim()) : [],
        url: ref.url || undefined,
      });
      logSuccess('Referencia agregada');
      const { continueAdding } = await prompts({
        type: 'confirm', name: 'continueAdding', message: '➕ ¿Otra?', initial: false,
      }, { onCancel });
      addMore = continueAdding;
    } else {
      addMore = false;
    }
  }

  return references;
}

/**
 * Generate metadata
 */
function generateMetadata() {
  const now = new Date().toISOString();
  return { version: '1.0.0', language: 'es', authors: ['VentyLab Team'], createdAt: now, lastModified: now };
}

/**
 * Display lesson summary and validate
 */
function displaySummary(lessonData) {
  logHeader('📋 Resumen de la Lección');
  [
    ['ID', lessonData.id], ['Título', lessonData.title], ['Módulo', lessonData.module],
    ['Descripción', lessonData.description], ['Tiempo', `${lessonData.estimatedTime} min`],
    ['Dificultad', lessonData.difficulty], ['Bloom', lessonData.bloomLevel],
    ['Objetivos', lessonData.objectives.length], ['Prerrequisitos', lessonData.prerequisites.length],
    ['Secciones', lessonData.sections.length], ['Quiz', lessonData.quiz?.questions?.length || 0],
    ['Referencias', lessonData.references.length],
  ].forEach(([l, v]) => log(`${colors.bright}${l}:${colors.reset} ${v}`, 'cyan'));
  console.log('');
}

function validateBeforeSave(lessonData) {
  const errors = [
    !lessonData.id && 'ID es requerido',
    !lessonData.title && 'Título es requerido',
    !lessonData.module && 'Módulo es requerido',
    !lessonData.sections?.length && 'Debe haber al menos una sección',
  ].filter(Boolean);

  if (errors.length) {
    logError('Errores de validación:');
    errors.forEach(err => log(`  • ${err}`, 'red'));
    return false;
  }
  return true;
}

/**
 * Save lesson to file
 */
async function saveLesson(lessonData, modulePath) {
  try {
    if (!fs.existsSync(modulePath)) {
      fs.mkdirSync(modulePath, { recursive: true });
      logSuccess(`Directorio creado: ${modulePath}`);
    }

    const fileName = `${lessonData.id}.json`;
    const filePath = path.join(modulePath, fileName);

    if (fs.existsSync(filePath)) {
      const { overwrite } = await prompts({
        type: 'confirm', name: 'overwrite',
        message: `⚠️  El archivo ${fileName} ya existe. ¿Sobrescribir?`, initial: false,
      }, { onCancel });

      if (!overwrite) {
        logWarning('Operación cancelada. Archivo no sobrescrito.');
        return null;
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(lessonData, null, 2), 'utf-8');
    return filePath;
  } catch (error) {
    logError(`Error al guardar: ${error.message}`);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    logHeader('🎓 Generador de Plantillas de Lecciones - VentyLab');

    const basicInfo = await promptBasicInfo();
    const objectives = await promptMultipleItems('Objetivos de Aprendizaje', 'Objetivo', '🎯');
    const prerequisites = await promptMultipleItems('Prerrequisitos', 'Prerrequisito (ID)', '📋', '📚 ¿Tiene prerrequisitos?');
    const sections = await promptSections();
    const quizQuestions = await promptQuiz();
    const references = await promptReferences();
    const metadata = generateMetadata();

    const lessonData = {
      id: basicInfo.id,
      title: basicInfo.title,
      module: basicInfo.module,
      description: basicInfo.description,
      objectives: objectives.length > 0 ? objectives : undefined,
      prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
      estimatedTime: basicInfo.estimatedTime,
      difficulty: basicInfo.difficulty,
      bloomLevel: basicInfo.bloomLevel,
      sections,
      quiz: quizQuestions.length > 0 ? { questions: quizQuestions } : undefined,
      references: references.length > 0 ? references : undefined,
      metadata,
    };

    displaySummary(lessonData);

    const { confirmSave } = await prompts({
      type: 'confirm', name: 'confirmSave', message: '💾 ¿Guardar esta lección?',
      initial: true,
    }, { onCancel });

    if (!confirmSave) {
      logWarning('Operación cancelada.');
      process.exit(0);
    }

    if (!validateBeforeSave(lessonData)) {
      logError('La lección no pasó la validación.');
      process.exit(1);
    }

    const lessonsDir = path.join(__dirname, '..', 'src', 'data', 'lessons');
    const modulePath = path.join(lessonsDir, basicInfo.module);
    const savedPath = await saveLesson(lessonData, modulePath);

    if (savedPath) {
      logSuccess('\n🎉 ¡Lección creada exitosamente!');
      logInfo(`Ubicación: ${savedPath}`);

      console.log(`\n${colors.bright}${colors.cyan}📝 Siguientes pasos:${colors.reset}`);
      log('  1. Revisar y editar el archivo generado', 'cyan');
      log('  2. Ejecutar validación: npm run validate:lessons', 'cyan');
      log('  3. Agregar contenido específico a las secciones', 'cyan');
      log('  4. Verificar rutas de recursos', 'cyan');

      console.log('');
      logSuccess('¡Gracias por usar el generador! 🚀');
    } else {
      logError('No se pudo guardar la lección.');
      process.exit(1);
    }

  } catch (error) {
    logError(`Error inesperado: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
