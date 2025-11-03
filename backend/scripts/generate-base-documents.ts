/**
 * Script para Generar Documentos Base
 * 
 * Este script genera automáticamente los 3 documentos base del sistema:
 * 1. Fundamentos Fisiológicos y Respiratorios
 * 2. Principios de la Ventilación Mecánica
 * 3. Configuración y Manejo del Ventilador
 * 
 * Uso:
 * - Modo Vista Previa: npx ts-node scripts/generate-base-documents.ts --preview
 * - Modo Guardar: npx ts-node scripts/generate-base-documents.ts --save --module-id=<id>
 */

import {
  generatePhysiologyFoundations,
  generateVentilationPrinciples,
  generateVentilatorConfiguration,
  ContextData
} from '../src/services/content-generator.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// CONTEXTOS PARA LOS 3 DOCUMENTOS BASE
// ============================================================================

const physiologyContext: ContextData = {
  topic: 'Fundamentos Fisiológicos y Respiratorios',
  level: 'Beginner',
  text: `El sistema respiratorio es fundamental para la vida, permitiendo el intercambio de gases 
entre el ambiente y la sangre. Comprende estructuras anatómicas especializadas y procesos fisiológicos 
complejos que trabajan en conjunto para mantener la homeostasis. La comprensión profunda de estos 
fundamentos es esencial para el manejo apropiado de la ventilación mecánica y el cuidado de pacientes 
con compromiso respiratorio.`,
  keyPoints: [
    'Anatomía de vías aéreas superiores e inferiores: desde la nariz hasta los alvéolos',
    'Mecánica ventilatoria: compliance pulmonar, resistencia de vías aéreas y trabajo respiratorio',
    'Intercambio gaseoso: difusión alveolo-capilar, ley de Fick y factores que afectan la transferencia',
    'Relación ventilación-perfusión: distribución del flujo sanguíneo y ventilación alveolar',
    'Control de la respiración: centros respiratorios, quimiorreceptores y mecanorreceptores',
    'Interpretación de gasometría arterial: pH, PaCO2, PaO2, HCO3 y estado ácido-base'
  ],
  parameters: [
    'Compliance pulmonar',
    'Resistencia de vías aéreas',
    'Capacidad Vital',
    'Volumen Corriente',
    'Frecuencia Respiratoria',
    'Capacidad Residual Funcional'
  ],
  ranges: {
    'Compliance': [50, 100],           // ml/cmH2O
    'Resistencia': [0.5, 2.5],         // cmH2O/L/s
    'Capacidad Vital': [3.5, 5.5],     // Litros
    'Volumen Corriente': [400, 600],   // ml
    'Frecuencia Respiratoria': [12, 20], // resp/min
    'CRF': [2.0, 3.0]                  // Litros
  },
  diagrams: [
    '/images/respiratory-anatomy-complete.jpg',
    '/images/alveolar-structure.jpg',
    '/images/pressure-volume-curve.jpg',
    '/images/ventilation-perfusion-matching.jpg'
  ],
  references: [
    'West, J.B. (2012). Respiratory Physiology: The Essentials. 9th Edition. Lippincott Williams & Wilkins.',
    'Levitzky, M.G. (2018). Pulmonary Physiology. 9th Edition. McGraw-Hill Education.',
    'Nunn, J.F. (2012). Applied Respiratory Physiology. 7th Edition. Butterworth-Heinemann.',
    'Lumb, A.B. (2017). Nunn\'s Applied Respiratory Physiology. 8th Edition. Elsevier.'
  ]
};

const ventilationContext: ContextData = {
  topic: 'Principios de la Ventilación Mecánica',
  level: 'Intermediate',
  text: `La ventilación mecánica es un soporte vital crítico que sustituye o asiste la función 
respiratoria cuando el paciente no puede mantenerla por sí mismo. Sus objetivos principales incluyen 
mantener un intercambio gaseoso adecuado, reducir el trabajo respiratorio, prevenir complicaciones 
y permitir la recuperación del paciente. La comprensión de sus principios fundamentales, indicaciones 
y parámetros básicos es esencial para todo profesional de salud que trabaje en áreas críticas.`,
  keyPoints: [
    'Objetivos primarios: optimizar oxigenación, mantener ventilación alveolar adecuada',
    'Objetivos secundarios: reducir trabajo respiratorio, permitir recuperación pulmonar',
    'Indicaciones absolutas: apnea, paro cardiorrespiratorio, fallo respiratorio agudo severo',
    'Indicaciones relativas: trabajo respiratorio aumentado, fatiga muscular, protección de vía aérea',
    'Parámetros fundamentales: Vt, frecuencia, FiO2, PEEP, tiempo inspiratorio',
    'Modos ventilatorios básicos: controlados, asistidos, espontáneos',
    'Monitorización esencial: gasometría, mecánica pulmonar, oximetría'
  ],
  parameters: [
    'Volumen Tidal (Vt)',
    'Frecuencia Respiratoria (f)',
    'Fracción Inspirada de O2 (FiO2)',
    'Presión Positiva al Final de la Espiración (PEEP)',
    'Tiempo Inspiratorio (Ti)',
    'Relación I:E',
    'Trigger (sensibilidad)',
    'Flujo Inspiratorio'
  ],
  ranges: {
    'Vt': [6, 8],              // ml/kg peso ideal
    'f': [12, 20],             // respiraciones/minuto
    'FiO2': [21, 100],         // porcentaje
    'PEEP': [5, 15],           // cmH2O
    'Ti': [0.8, 1.2],          // segundos
    'I:E': [1, 3],             // ratio
    'Trigger': [1, 3],         // L/min o cmH2O
    'Flujo': [40, 80]          // L/min
  },
  caseStudies: [
    'Fallo respiratorio agudo hipoxémico: paciente con neumonía bilateral severa',
    'Fallo respiratorio hipercápnico: paciente con EPOC exacerbado',
    'Coma con riesgo de aspiración: paciente post-ACV con Glasgow <8',
    'Shock séptico con compromiso respiratorio: paciente con sepsis de foco abdominal'
  ],
  clinicalScenarios: [
    'Inicio de ventilación mecánica en urgencias',
    'Ajuste de parámetros según gasometría arterial',
    'Manejo de alarmas del ventilador',
    'Evaluación de sincronía paciente-ventilador'
  ],
  complications: [
    'Lesión pulmonar inducida por ventilador (VILI)',
    'Barotrauma',
    'Hemodinamia: reducción del retorno venoso',
    'Neumonía asociada a ventilador (NAV)',
    'Atrofia muscular respiratoria'
  ],
  references: [
    'Tobin, M.J. (2013). Principles and Practice of Mechanical Ventilation. 3rd Edition. McGraw-Hill.',
    'MacIntyre, N.R. & Branson, R.D. (2009). Mechanical Ventilation. 2nd Edition. Saunders Elsevier.',
    'Marini, J.J. & Slutsky, A.S. (2010). Physiological Basis of Ventilatory Support. Marcel Dekker.',
    'Esteban, A. et al. (2002). Characteristics and outcomes in adult patients receiving mechanical ventilation. JAMA.'
  ]
};

const configurationContext: ContextData = {
  topic: 'Configuración y Manejo del Ventilador',
  level: 'Advanced',
  text: `La configuración apropiada del ventilador mecánico requiere un conocimiento profundo de los 
modos ventilatorios disponibles, la capacidad de ajustar parámetros según la patología subyacente, 
y habilidades de monitorización continua de la respuesta del paciente. La sincronía paciente-ventilador, 
el manejo de complicaciones y la optimización de parámetros son fundamentales para lograr los mejores 
resultados clínicos y minimizar el riesgo de lesión pulmonar inducida por ventilador.`,
  keyPoints: [
    'Modos controlados por volumen (VCV): garantizan volumen minuto pero presión variable',
    'Modos controlados por presión (PCV): limitan presión pero volumen variable',
    'Ventilación con soporte de presión (PSV): modo espontáneo para destete',
    'SIMV: combinación de respiraciones mandatorias y espontáneas',
    'Configuración específica para ARDS: ventilación protectora, Vt 6ml/kg, PEEP optimizado',
    'Configuración para EPOC: evitar auto-PEEP, tiempo espiratorio prolongado',
    'Monitorización avanzada: curvas, bucles, mecánica pulmonar',
    'Detección y manejo de asincronías paciente-ventilador'
  ],
  parameters: [
    'Modo ventilatorio (VCV, PCV, PSV, SIMV, PRVC)',
    'Volumen Tidal o Presión Inspiratoria',
    'Frecuencia respiratoria',
    'FiO2',
    'PEEP',
    'Trigger (sensibilidad)',
    'Cycle-off (% del flujo)',
    'Rise Time (rampa de presión)',
    'Alarmas de presión, volumen y frecuencia'
  ],
  ranges: {
    'Vt': [6, 8],                      // ml/kg peso ideal
    'Presión Inspiratoria': [10, 20],  // cmH2O (sobre PEEP)
    'f': [12, 20],                     // resp/min
    'FiO2': [30, 100],                 // %
    'PEEP': [5, 15],                   // cmH2O
    'Trigger': [1, 3],                 // L/min o cmH2O
    'Cycle-off': [25, 40],             // % del flujo pico
    'Rise Time': [0, 400],             // ms
    'Presión Plateau': [25, 30],       // cmH2O (límite)
    'Driving Pressure': [10, 15]       // cmH2O (objetivo)
  },
  clinicalScenarios: [
    'Configuración en ARDS moderado-severo: protocolo ARDSnet, ventilación protectora',
    'Configuración en EPOC exacerbado: evitar auto-PEEP, relación I:E 1:3 o 1:4',
    'Configuración en asma severo: ventilación permisiva, hipercapnia permisiva',
    'Proceso de destete: criterios, protocolo SBT, transición a ventilación no invasiva'
  ],
  complications: [
    'Barotrauma: neumotórax, neumomediastino, enfisema subcutáneo',
    'Volutrauma: sobredistensión alveolar por volúmenes excesivos',
    'Atelectrauma: colapso y reapertura cíclica de alvéolos',
    'Biotrauma: liberación de mediadores inflamatorios por estiramiento',
    'Asincronía paciente-ventilador: trigger inefectivo, doble trigger, auto-trigger',
    'Hiperinsuflación dinámica (auto-PEEP): atrapamiento de aire',
    'Lesión pulmonar inducida por ventilador (VILI): resultado de ventilación no protectora'
  ],
  tables: [
    'Tabla de configuración inicial por patología',
    'Tabla de ajuste de FiO2/PEEP según ARDSnet',
    'Tabla de criterios de destete',
    'Tabla de tipos de asincronías y manejo'
  ],
  objectives: [
    'Seleccionar el modo ventilatorio apropiado según patología',
    'Configurar parámetros iniciales basados en peso ideal',
    'Interpretar curvas de presión-tiempo, volumen-tiempo y flujo-tiempo',
    'Analizar bucles de presión-volumen y flujo-volumen',
    'Detectar y corregir asincronías paciente-ventilador',
    'Aplicar estrategias de protección pulmonar',
    'Evaluar criterios de destete y realizar prueba de ventilación espontánea'
  ],
  references: [
    'Pilbeam, S.P. & Cairo, J.M. (2015). Mechanical Ventilation: Physiological and Clinical Applications. 5th Edition. Mosby.',
    'Cairo, J.M. (2016). Mosby\'s Respiratory Care Equipment. 10th Edition. Mosby.',
    'Hess, D.R. & Kacmarek, R.M. (2014). Essentials of Mechanical Ventilation. 3rd Edition. McGraw-Hill.',
    'ARDSnet. (2000). Ventilation with Lower Tidal Volumes for Acute Lung Injury and ARDS. NEJM.',
    'Thille, A.W. et al. (2006). Patient-ventilator asynchrony during assisted mechanical ventilation. ICM.'
  ]
};

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Genera vista previa de los 3 documentos
 */
async function previewDocuments() {
  console.log('='.repeat(80));
  console.log('VISTA PREVIA DE DOCUMENTOS BASE');
  console.log('='.repeat(80));
  console.log('\n');

  // Documento 1
  console.log('📄 DOCUMENTO 1: Fundamentos Fisiológicos y Respiratorios');
  console.log('-'.repeat(80));
  const doc1 = generatePhysiologyFoundations(physiologyContext);
  console.log(JSON.stringify(doc1, null, 2));
  console.log('\n');

  // Documento 2
  console.log('📄 DOCUMENTO 2: Principios de la Ventilación Mecánica');
  console.log('-'.repeat(80));
  const doc2 = generateVentilationPrinciples(ventilationContext);
  console.log(JSON.stringify(doc2, null, 2));
  console.log('\n');

  // Documento 3
  console.log('📄 DOCUMENTO 3: Configuración y Manejo del Ventilador');
  console.log('-'.repeat(80));
  const doc3 = generateVentilatorConfiguration(configurationContext);
  console.log(JSON.stringify(doc3, null, 2));
  console.log('\n');

  console.log('='.repeat(80));
  console.log('✅ VISTA PREVIA COMPLETADA');
  console.log('='.repeat(80));
}

/**
 * Guarda los documentos en la base de datos
 */
async function saveDocuments(moduleId: string) {
  console.log('='.repeat(80));
  console.log('GUARDANDO DOCUMENTOS BASE EN BASE DE DATOS');
  console.log(`Módulo ID: ${moduleId}`);
  console.log('='.repeat(80));
  console.log('\n');

  try {
    // Verificar que el módulo existe
    const module = await prisma.module.findUnique({
      where: { id: moduleId }
    });

    if (!module) {
      throw new Error(`Módulo con ID ${moduleId} no encontrado`);
    }

    console.log(`✅ Módulo encontrado: ${module.title}`);
    console.log('\n');

    // Documento 1: Fundamentos Fisiológicos
    console.log('📄 Guardando Documento 1: Fundamentos Fisiológicos y Respiratorios...');
    const doc1 = generatePhysiologyFoundations(physiologyContext);
    const lesson1 = await prisma.lesson.create({
      data: {
        moduleId,
        title: 'Fundamentos Fisiológicos y Respiratorios',
        content: JSON.stringify(doc1),
        order: 1,
        estimatedTime: doc1.estimatedTime,
        aiGenerated: true,
        sourcePrompt: 'Base Document: Physiology Foundations'
      }
    });
    console.log(`✅ Guardado: ${lesson1.title} (ID: ${lesson1.id})`);
    console.log('\n');

    // Documento 2: Principios de Ventilación
    console.log('📄 Guardando Documento 2: Principios de la Ventilación Mecánica...');
    const doc2 = generateVentilationPrinciples(ventilationContext);
    const lesson2 = await prisma.lesson.create({
      data: {
        moduleId,
        title: 'Principios de la Ventilación Mecánica',
        content: JSON.stringify(doc2),
        order: 2,
        estimatedTime: doc2.estimatedTime,
        aiGenerated: true,
        sourcePrompt: 'Base Document: Ventilation Principles'
      }
    });
    console.log(`✅ Guardado: ${lesson2.title} (ID: ${lesson2.id})`);
    console.log('\n');

    // Documento 3: Configuración del Ventilador
    console.log('📄 Guardando Documento 3: Configuración y Manejo del Ventilador...');
    const doc3 = generateVentilatorConfiguration(configurationContext);
    const lesson3 = await prisma.lesson.create({
      data: {
        moduleId,
        title: 'Configuración y Manejo del Ventilador',
        content: JSON.stringify(doc3),
        order: 3,
        estimatedTime: doc3.estimatedTime,
        aiGenerated: true,
        sourcePrompt: 'Base Document: Ventilator Configuration'
      }
    });
    console.log(`✅ Guardado: ${lesson3.title} (ID: ${lesson3.id})`);
    console.log('\n');

    console.log('='.repeat(80));
    console.log('✅ TODOS LOS DOCUMENTOS GUARDADOS EXITOSAMENTE');
    console.log('='.repeat(80));
    console.log('\n');
    console.log('Resumen:');
    console.log(`- Documento 1: ${lesson1.id}`);
    console.log(`- Documento 2: ${lesson2.id}`);
    console.log(`- Documento 3: ${lesson3.id}`);
    console.log('\n');

  } catch (error: any) {
    console.error('❌ ERROR al guardar documentos:');
    console.error(error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================================
// EJECUCIÓN DEL SCRIPT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  // Verificar argumentos
  if (args.length === 0) {
    console.log('❌ Error: Debe especificar modo de ejecución');
    console.log('\n📖 Uso:');
    console.log('  Vista previa: npx ts-node scripts/generate-base-documents.ts --preview');
    console.log('  Guardar:      npx ts-node scripts/generate-base-documents.ts --save --module-id=<id>');
    console.log('\n📝 Ejemplos:');
    console.log('  npx ts-node scripts/generate-base-documents.ts --preview');
    console.log('  npx ts-node scripts/generate-base-documents.ts --save --module-id=clxxx123');
    process.exit(1);
  }

  const mode = args[0];

  if (mode === '--preview') {
    await previewDocuments();
  } else if (mode === '--save') {
    // Buscar argumento module-id
    const moduleArg = args.find(arg => arg.startsWith('--module-id='));
    if (!moduleArg) {
      console.log('❌ Error: Debe especificar --module-id=<id>');
      console.log('\n📝 Ejemplo:');
      console.log('  npx ts-node scripts/generate-base-documents.ts --save --module-id=clxxx123');
      process.exit(1);
    }

    const moduleId = moduleArg.split('=')[1];
    if (!moduleId) {
      console.log('❌ Error: El module-id no puede estar vacío');
      process.exit(1);
    }

    await saveDocuments(moduleId);
  } else {
    console.log(`❌ Error: Modo desconocido: ${mode}`);
    console.log('\n📖 Modos disponibles:');
    console.log('  --preview  : Genera vista previa de los documentos');
    console.log('  --save     : Guarda los documentos en la base de datos');
    process.exit(1);
  }
}

// Ejecutar
main()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

