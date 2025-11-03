/**
 * Script de Ejemplo: Generación de Lecciones desde curriculumData
 * 
 * Este script muestra cómo extraer información del curriculumData.js
 * y generar lecciones estructuradas usando el content-generator.
 * 
 * NOTA: Este es un ejemplo educativo. En producción, se llamaría
 * a través de la API REST.
 */

import {
  generateLessonContent,
  generatePhysiologyFoundations,
  generateVentilationPrinciples,
  generateVentilatorConfiguration,
  ContextData
} from '../src/services/content-generator.service';

// ============================================================================
// EJEMPLO 1: Simular datos del curriculumData (Anatomía Respiratoria)
// ============================================================================

const anatomyContext: ContextData = {
  topic: 'Anatomía del Sistema Respiratorio',
  level: 'Beginner',
  learningObjectives: [
    'Identificar las estructuras anatómicas del sistema respiratorio',
    'Comprender la función de cada componente anatómico',
    'Relacionar anatomía con fisiología respiratoria'
  ],
  keyPoints: [
    'Vías aéreas superiores e inferiores',
    'Pulmones y pleura',
    'Músculos respiratorios'
  ],
  text: 'El sistema respiratorio se compone de las vías aéreas superiores (nariz, faringe, laringe) e inferiores (tráquea, bronquios, bronquiolos), así como los pulmones donde ocurre el intercambio gaseoso.',
  diagrams: ['/images/upper-airways.jpg', '/images/lung-mechanics.png'],
  references: ['West, J.B. (2012). Respiratory Physiology: The Essentials']
};

console.log('='.repeat(80));
console.log('EJEMPLO 1: Anatomía del Sistema Respiratorio');
console.log('='.repeat(80));

const anatomyLesson = generateLessonContent(anatomyContext);
console.log(JSON.stringify(anatomyLesson, null, 2));

// ============================================================================
// EJEMPLO 2: Ventilación Controlada por Volumen (VCV)
// ============================================================================

const vcvContext: ContextData = {
  topic: 'Ventilación Controlada por Volumen (VCV)',
  level: 'Intermediate',
  learningObjectives: [
    'Comprender el funcionamiento de VCV',
    'Configurar parámetros en VCV',
    'Identificar ventajas y desventajas de VCV'
  ],
  keyPoints: [
    'Volumen constante',
    'Presión variable',
    'Flujo cuadrado'
  ],
  transcript: 'En VCV, el ventilador entrega un volumen fijo independientemente de la resistencia o compliance del paciente. Esto garantiza ventilación minuto constante, pero puede generar presiones elevadas.',
  parameters: ['Vt', 'f', 'FiO2', 'PEEP', 'Flujo'],
  ranges: {
    'Vt': [6, 8],      // ml/kg peso ideal
    'f': [12, 20],     // respiraciones por minuto
    'FiO2': [21, 100], // porcentaje
    'PEEP': [5, 15]    // cmH2O
  },
  clinicalScenarios: [
    'paciente con ARDS',
    'paciente con EPOC'
  ],
  videoUrl: '/videos/vcv-mechanics.mp4',
  references: ['ARDSnet Study Group (2000). Ventilation with Lower Tidal Volumes']
};

console.log('\n' + '='.repeat(80));
console.log('EJEMPLO 2: Ventilación Controlada por Volumen');
console.log('='.repeat(80));

const vcvLesson = generateLessonContent(vcvContext);
console.log(JSON.stringify(vcvLesson, null, 2));

// ============================================================================
// EJEMPLO 3: Caso Clínico - Manejo de ARDS
// ============================================================================

const ardsContext: ContextData = {
  topic: 'Manejo de ARDS y Estrategias de Protección Pulmonar',
  level: 'Advanced',
  learningObjectives: [
    'Aplicar protocolo ARDSnet',
    'Implementar estrategias de protección pulmonar',
    'Manejar complicaciones del ARDS'
  ],
  keyPoints: [
    'Vt 6ml/kg peso ideal',
    'Presión plateau < 30 cmH2O',
    'PEEP según tabla FiO2/PEEP',
    'Permisividad hipercápnica'
  ],
  text: 'El protocolo ARDSnet establece la ventilación protectora como estándar de oro para ARDS. Se basa en limitar el volumen tidal, la presión plateau y optimizar la PEEP.',
  patientData: {
    age: 45,
    weight: 80,
    diagnosis: 'ARDS moderado',
    gasometry: 'PaO2/FiO2 = 150, pH 7.35, PaCO2 45',
    compliance: '25 ml/cmH2O',
    pressurePlateau: '28 cmH2O'
  },
  parameters: ['Vt', 'PEEP', 'FiO2', 'Presión Plateau', 'Driving Pressure'],
  ranges: {
    'Vt': [6, 6],           // ml/kg (protección)
    'PEEP': [8, 15],        // según tabla
    'FiO2': [60, 100],      // según necesidad
    'Presión Plateau': [25, 30]  // límite superior
  },
  clinicalScenarios: [
    'ARDS leve (PaO2/FiO2 200-300)',
    'ARDS moderado (PaO2/FiO2 100-200)',
    'ARDS severo (PaO2/FiO2 < 100)'
  ],
  complications: [
    'Barotrauma',
    'Volutrauma',
    'Atelectrauma',
    'Biotrauma'
  ],
  objectives: [
    'Aplicar Vt 6ml/kg',
    'Optimizar PEEP',
    'Limitar presión plateau',
    'Monitorear driving pressure'
  ],
  tables: ['tabla-ventilacion-protectora', 'tabla-PEEP-FiO2'],
  references: [
    'ARDSnet Study Group (2000)',
    'Amato et al. (2015). Driving pressure and survival in ARDS',
    'Guérin et al. (2013). Prone positioning in severe ARDS'
  ]
};

console.log('\n' + '='.repeat(80));
console.log('EJEMPLO 3: Manejo de ARDS (Caso Clínico Avanzado)');
console.log('='.repeat(80));

const ardsLesson = generateLessonContent(ardsContext);
console.log(JSON.stringify(ardsLesson, null, 2));

// ============================================================================
// EJEMPLO 4: Documentos Base
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('EJEMPLO 4: Documentos Base');
console.log('='.repeat(80));

// 4.1 Fundamentos Fisiológicos
const physiologyDoc = generatePhysiologyFoundations({
  topic: 'Fundamentos Fisiológicos y Respiratorios',
  level: 'Beginner',
  text: 'El sistema respiratorio permite el intercambio de gases entre el ambiente y la sangre mediante un proceso mecánico (ventilación) y difusión alveolo-capilar.',
  keyPoints: [
    'Anatomía de vías aéreas y pulmones',
    'Mecánica ventilatoria: compliance y resistencia',
    'Intercambio gaseoso: difusión y perfusión',
    'Control de la respiración',
    'Gasometría arterial'
  ],
  references: [
    'West, J.B. (2012). Respiratory Physiology: The Essentials',
    'Levitzky, M.G. (2018). Pulmonary Physiology',
    'Nunn, J.F. (2012). Applied Respiratory Physiology'
  ]
});

console.log('\n--- Documento Base 1: Fundamentos Fisiológicos ---');
console.log(JSON.stringify(physiologyDoc, null, 2));

// 4.2 Principios de Ventilación
const ventilationDoc = generateVentilationPrinciples({
  topic: 'Principios de la Ventilación Mecánica',
  level: 'Intermediate',
  text: 'La ventilación mecánica es un soporte vital que sustituye o asiste la función respiratoria cuando el paciente no puede mantenerla por sí mismo.',
  keyPoints: [
    'Objetivos de la ventilación mecánica',
    'Indicaciones: fallo respiratorio, apnea, protección de vía aérea',
    'Contraindicaciones relativas',
    'Parámetros básicos: Vt, f, FiO2, PEEP',
    'Modos ventilatorios: controlados, asistidos, espontáneos'
  ],
  parameters: ['Vt', 'f', 'FiO2', 'PEEP', 'Ti', 'Trigger'],
  ranges: {
    'Vt': [6, 8],
    'f': [12, 20],
    'FiO2': [21, 100],
    'PEEP': [5, 15],
    'Ti': [0.8, 1.2],
    'I:E': [1, 2]
  },
  caseStudies: [
    'Fallo respiratorio agudo',
    'Coma con riesgo de aspiración',
    'Shock séptico'
  ],
  references: [
    'Tobin, M.J. (2013). Principles and Practice of Mechanical Ventilation',
    'MacIntyre, N.R. & Branson, R.D. (2009). Mechanical Ventilation',
    'Marini, J.J. & Slutsky, A.S. (2010). Physiological Basis of Ventilatory Support'
  ]
});

console.log('\n--- Documento Base 2: Principios de Ventilación ---');
console.log(JSON.stringify(ventilationDoc, null, 2));

// 4.3 Configuración del Ventilador
const configDoc = generateVentilatorConfiguration({
  topic: 'Configuración y Manejo del Ventilador',
  level: 'Advanced',
  text: 'La configuración adecuada del ventilador requiere comprender los modos ventilatorios, ajustar parámetros según la patología y monitorizar continuamente al paciente.',
  keyPoints: [
    'Modos ventilatorios: VCV, PCV, PSV, SIMV',
    'Configuración inicial según patología',
    'Monitorización: curvas, bucles, alarmas',
    'Ajustes dinámicos basados en respuesta',
    'Criterios de destete'
  ],
  parameters: [
    'Modo ventilatorio',
    'Vt o Presión Inspiratoria',
    'Frecuencia respiratoria',
    'FiO2',
    'PEEP',
    'Trigger',
    'Cycle-off',
    'Alarmas'
  ],
  ranges: {
    'Vt': [6, 8],
    'Presión Inspiratoria': [10, 20],
    'f': [12, 20],
    'FiO2': [30, 100],
    'PEEP': [5, 15],
    'Trigger': [1, 3],
    'Cycle-off': [25, 40]
  },
  clinicalScenarios: [
    'Configuración en ARDS',
    'Configuración en EPOC',
    'Configuración en asma severo',
    'Destete de ventilación mecánica'
  ],
  complications: [
    'Barotrauma',
    'Asincronía paciente-ventilador',
    'Hiperinsuflación dinámica (auto-PEEP)',
    'Lesión pulmonar inducida por ventilador (VILI)'
  ],
  references: [
    'Pilbeam, S.P. & Cairo, J.M. (2015). Mechanical Ventilation: Physiological and Clinical Applications',
    'Cairo, J.M. (2016). Mosby\'s Respiratory Care Equipment',
    'Hess, D.R. & Kacmarek, R.M. (2014). Essentials of Mechanical Ventilation'
  ]
});

console.log('\n--- Documento Base 3: Configuración del Ventilador ---');
console.log(JSON.stringify(configDoc, null, 2));

// ============================================================================
// EJEMPLO 5: Contexto Incompleto (Demostración de [[MISSING]])
// ============================================================================

const incompleteContext: ContextData = {
  topic: 'Tema Sin Contexto Completo',
  level: 'Beginner'
  // Deliberadamente omitimos muchos campos
};

console.log('\n' + '='.repeat(80));
console.log('EJEMPLO 5: Contexto Incompleto (Demostración de [[MISSING]])');
console.log('='.repeat(80));

const incompleteLesson = generateLessonContent(incompleteContext);
console.log(JSON.stringify(incompleteLesson, null, 2));

console.log('\n' + '='.repeat(80));
console.log('ADVERTENCIAS:');
console.log('Los campos marcados como [[MISSING]] deben completarse con información');
console.log('del contexto apropiado antes de guardar la lección en producción.');
console.log('='.repeat(80));

// ============================================================================
// FUNCIÓN AUXILIAR: Extraer contexto de curriculumData
// ============================================================================

/**
 * Función de ejemplo para extraer contexto de un módulo de curriculumData
 */
function extractContextFromModule(module: any): ContextData {
  const context: ContextData = {
    topic: module.title || '[[MISSING]]',
    level: mapLevel(module.level),
    learningObjectives: module.learningObjectives || [],
    keyPoints: [],
    parameters: [],
    ranges: {},
    clinicalScenarios: [],
    references: [],
    text: '',
    videoUrl: undefined
  };

  // Extraer información de las lecciones del módulo
  if (module.lessons && Array.isArray(module.lessons)) {
    module.lessons.forEach((lesson: any) => {
      if (lesson.content) {
        // Agregar puntos clave
        if (lesson.content.keyPoints) {
          context.keyPoints = [...(context.keyPoints || []), ...lesson.content.keyPoints];
        }

        // Agregar parámetros
        if (lesson.content.parameters) {
          context.parameters = lesson.content.parameters;
        }

        // Agregar rangos
        if (lesson.content.ranges) {
          context.ranges = { ...context.ranges, ...lesson.content.ranges };
        }

        // Agregar escenarios
        if (lesson.content.clinicalScenarios) {
          context.clinicalScenarios = [
            ...(context.clinicalScenarios || []),
            ...lesson.content.clinicalScenarios
          ];
        }

        // Agregar referencias
        if (lesson.content.references) {
          context.references = [...(context.references || []), ...lesson.content.references];
        }

        // Agregar texto o transcripción
        if (lesson.content.text && !context.text) {
          context.text = lesson.content.text;
        } else if (lesson.content.transcript && !context.text) {
          context.text = lesson.content.transcript;
        }

        // Agregar video URL
        if (lesson.content.videoUrl && !context.videoUrl) {
          context.videoUrl = lesson.content.videoUrl;
        }

        // Agregar diagramas
        if (lesson.content.diagrams) {
          context.diagrams = lesson.content.diagrams;
        }

        // Agregar tablas
        if (lesson.content.tables) {
          context.tables = lesson.content.tables;
        }
      }
    });
  }

  // Eliminar duplicados
  if (context.keyPoints) {
    context.keyPoints = [...new Set(context.keyPoints)];
  }
  if (context.clinicalScenarios) {
    context.clinicalScenarios = [...new Set(context.clinicalScenarios)];
  }
  if (context.references) {
    context.references = [...new Set(context.references)];
  }

  return context;
}

/**
 * Mapea el nivel del curriculumData al formato del generador
 */
function mapLevel(level: string): 'Beginner' | 'Intermediate' | 'Advanced' {
  const levelMap: Record<string, 'Beginner' | 'Intermediate' | 'Advanced'> = {
    'beginner': 'Beginner',
    'básico': 'Beginner',
    'intermediate': 'Intermediate',
    'intermedio': 'Intermediate',
    'advanced': 'Advanced',
    'avanzado': 'Advanced'
  };

  return levelMap[level.toLowerCase()] || 'Beginner';
}

console.log('\n' + '='.repeat(80));
console.log('EJEMPLO 6: Función Auxiliar de Extracción');
console.log('='.repeat(80));
console.log('Función extractContextFromModule() disponible para uso en producción');
console.log('Esta función extrae contexto estructurado de un módulo de curriculumData');
console.log('='.repeat(80));

// ============================================================================
// NOTAS FINALES
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('NOTAS DE USO:');
console.log('='.repeat(80));
console.log('1. En producción, use la API REST en lugar de llamadas directas');
console.log('2. Siempre valide el contenido generado antes de guardarlo');
console.log('3. Complete los campos [[MISSING]] con información del contexto');
console.log('4. Mantenga coherencia con curriculumData.js');
console.log('5. Use el endpoint /preview para validar antes de guardar');
console.log('='.repeat(80));

export {
  extractContextFromModule,
  mapLevel
};

