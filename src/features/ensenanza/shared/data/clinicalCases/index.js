/**
 * =============================================================================
 * Clinical Cases Dataset
 * =============================================================================
 * 
 * Dataset de casos clínicos para entrenamiento en ventilación mecánica.
 * Cada caso incluye pasos secuenciales con decisiones clínicas que evalúan
 * el razonamiento del estudiante en diferentes dominios clínicos.
 * 
 * Estructura:
 * - Cada ClinicalCase mapea a un moduleId
 * - Cada caso contiene pasos (steps) ordenados
 * - Cada paso puede tener decisiones (decisions) con opciones múltiples
 * - Las decisiones evalúan diferentes dominios: seguridad, oxigenación,
 *   ventilación, protección pulmonar
 */

// =============================================================================
// CASO CLÍNICO: Módulo 03 - Razonamiento Clínico
// =============================================================================

const clinicalCaseMod03 = {
  id: 'cc-mod-03-001',
  moduleId: 'mod-03-raciocinio-clinico',
  title: 'Paciente con SDRA: Decisión Inicial y Manejo de Complicaciones',
  intro: 'Paciente masculino de 45 años, previamente sano, ingresa a UCI con diagnóstico de neumonía bilateral por COVID-19. Presenta insuficiencia respiratoria aguda severa que requiere intubación orotraqueal e inicio de ventilación mecánica. Durante las primeras 24 horas desarrolla criterios de SDRA (Síndrome de Dificultad Respiratoria Aguda). Debes tomar decisiones críticas sobre la configuración inicial del ventilador y el manejo de complicaciones que surgen durante el seguimiento.',
  objectives: [
    'Aplicar principios de ventilación protectora en SDRA',
    'Identificar y manejar complicaciones hemodinámicas durante la ventilación mecánica',
    'Optimizar parámetros ventilatorios basados en la respuesta del paciente',
    'Evaluar criterios de seguridad antes de realizar cambios en la configuración'
  ],
  steps: [
    {
      id: 'step-001',
      title: 'Configuración Inicial del Ventilador',
      narrative: 'El paciente ha sido intubado y conectado al ventilador mecánico. Presenta SDRA moderado-severo con PaO2/FiO2 de 120 mmHg, compliance pulmonar de 25 ml/cmH2O, y presión de meseta de 28 cmH2O. La radiografía de tórax muestra infiltrados bilaterales extensos. El paciente pesa 75 kg y tiene una altura de 175 cm. Debes decidir la configuración inicial del ventilador considerando las estrategias de protección pulmonar y los objetivos de oxigenación.',
      media: {
        type: 'image',
        src: '/images/clinical-cases/sdra-chest-xray.jpg',
        alt: 'Radiografía de tórax mostrando infiltrados bilaterales compatibles con SDRA'
      },
      decisions: [
        {
          id: 'decision-001',
          type: 'single',
          prompt: '¿Qué configuración inicial de volumen tidal (VT) y frecuencia respiratoria (FR) seleccionarías para este paciente con SDRA?',
          options: [
            {
              id: 'opt-001-a',
              label: 'VT: 10 ml/kg (750 ml), FR: 14/min, modo VC-CMV',
              rationale: 'Esta configuración proporciona ventilación adecuada con volúmenes estándar',
              isExpertChoice: false
            },
            {
              id: 'opt-001-b',
              label: 'VT: 6 ml/kg (450 ml), FR: 20/min, modo VC-CMV',
              rationale: 'Estrategia de bajo volumen tidal según protocolo ARDSnet para protección pulmonar',
              isExpertChoice: true
            },
            {
              id: 'opt-001-c',
              label: 'VT: 8 ml/kg (600 ml), FR: 16/min, modo PC-CMV',
              rationale: 'Volumen intermedio con control de presión para limitar picos de presión',
              isExpertChoice: false
            },
            {
              id: 'opt-001-d',
              label: 'VT: 12 ml/kg (900 ml), FR: 12/min, modo VC-CMV',
              rationale: 'Mayor volumen tidal para mejorar la oxigenación y reducir la frecuencia',
              isExpertChoice: false
            }
          ],
          weights: {
            'opt-001-a': 0.3,
            'opt-001-b': 1.0,
            'opt-001-c': 0.5,
            'opt-001-d': 0.0
          },
          domain: 'protección pulmonar',
          feedback: 'Correcto. El protocolo ARDSnet establece VT de 6 ml/kg de peso ideal para prevenir volutrauma. En SDRA, los pulmones están heterogéneamente afectados y volúmenes mayores pueden distender regiones sanas, causando lesión pulmonar inducida por ventilador (VILI). La frecuencia de 20/min compensa el bajo volumen tidal para mantener ventilación minuto adecuada.'
        }
      ]
    },
    {
      id: 'step-002',
      title: 'Manejo de Hipoxemia Refractaria y Optimización de PEEP',
      narrative: 'A las 6 horas de iniciada la ventilación, el paciente presenta hipoxemia persistente (SpO2 85% con FiO2 0.8). La gasometría arterial muestra: pH 7.32, PaO2 55 mmHg, PaCO2 48 mmHg, HCO3- 24 mEq/L. La presión de meseta ha aumentado a 32 cmH2O. El paciente está hemodinámicamente estable (PA 110/70, FC 95/min). Debes decidir la estrategia para mejorar la oxigenación sin comprometer la hemodinamia ni aumentar el riesgo de barotrauma.',
      media: {
        type: 'svg',
        src: '/diagrams/peep-recruitment.svg',
        alt: 'Diagrama de estrategias de PEEP y reclutamiento alveolar'
      },
      decisions: [
        {
          id: 'decision-002',
          type: 'single',
          prompt: '¿Cuál es la mejor estrategia para mejorar la oxigenación en este momento?',
          options: [
            {
              id: 'opt-002-a',
              label: 'Aumentar FiO2 a 1.0 y mantener PEEP en 8 cmH2O',
              rationale: 'Maximizar la fracción inspirada de oxígeno es la forma más directa de mejorar PaO2',
              isExpertChoice: false
            },
            {
              id: 'opt-002-b',
              label: 'Realizar maniobra de reclutamiento y optimizar PEEP mediante tabla de PEEP/FiO2 (PEEP 12-14 cmH2O)',
              rationale: 'La optimización de PEEP puede reclutar alvéolos colapsados y mejorar la relación ventilación/perfusión',
              isExpertChoice: true
            },
            {
              id: 'opt-002-c',
              label: 'Aumentar volumen tidal a 8 ml/kg para mejorar la ventilación',
              rationale: 'Mayor volumen tidal puede mejorar el intercambio gaseoso',
              isExpertChoice: false
            },
            {
              id: 'opt-002-d',
              label: 'Cambiar a modo de alta frecuencia oscilatoria (HFO)',
              rationale: 'HFO es una modalidad avanzada para hipoxemia refractaria',
              isExpertChoice: false
            }
          ],
          weights: {
            'opt-002-a': 0.2,
            'opt-002-b': 1.0,
            'opt-002-c': 0.0,
            'opt-002-d': 0.3
          },
          domain: 'oxigenación',
          feedback: 'Excelente decisión. La optimización de PEEP mediante la tabla PEEP/FiO2 del protocolo ARDSnet es la estrategia de primera línea. PEEP adecuado recluta alvéolos colapsados, mejora la compliance y reduce el shunt intrapulmonar. La maniobra de reclutamiento puede ser beneficiosa pero debe realizarse con precaución y monitoreo hemodinámico. Aumentar solo FiO2 sin optimizar PEEP no aborda la fisiopatología del SDRA.'
        },
        {
          id: 'decision-003',
          type: 'multi',
          prompt: 'Antes de aumentar PEEP, ¿qué medidas de seguridad debes verificar? (Selecciona todas las que apliquen)',
          options: [
            {
              id: 'opt-003-a',
              label: 'Verificar que la presión de meseta sea < 30 cmH2O',
              rationale: 'La presión de meseta debe mantenerse dentro de límites seguros',
              isExpertChoice: true
            },
            {
              id: 'opt-003-b',
              label: 'Confirmar estabilidad hemodinámica (PA adecuada, sin necesidad de vasopresores)',
              rationale: 'PEEP alto puede comprometer el retorno venoso y la precarga',
              isExpertChoice: true
            },
            {
              id: 'opt-003-c',
              label: 'Asegurar que no haya neumotórax en la radiografía más reciente',
              rationale: 'PEEP alto puede empeorar o causar barotrauma',
              isExpertChoice: true
            },
            {
              id: 'opt-003-d',
              label: 'Reducir volumen tidal a 4 ml/kg para compensar el aumento de PEEP',
              rationale: 'Reducir VT previene sobre-distensión cuando se aumenta PEEP',
              isExpertChoice: false
            },
            {
              id: 'opt-003-e',
              label: 'Suspender sedación para evaluar esfuerzo respiratorio',
              rationale: 'La sedación no debe suspenderse antes de optimizar PEEP',
              isExpertChoice: false
            }
          ],
          weights: {
            'opt-003-a': 1.0,
            'opt-003-b': 1.0,
            'opt-003-c': 1.0,
            'opt-003-d': 0.3,
            'opt-003-e': 0.0
          },
          domain: 'seguridad',
          feedback: 'Correcto. Antes de aumentar PEEP es crucial verificar: (1) Presión de meseta < 30 cmH2O para prevenir barotrauma, (2) Estabilidad hemodinámica porque PEEP alto reduce precarga y puede causar hipotensión, (3) Ausencia de neumotórax porque PEEP puede empeorarlo. Reducir VT a 4 ml/kg no es necesario si ya está en 6 ml/kg. La sedación debe mantenerse durante la optimización de PEEP para evitar asincronías.'
        }
      ]
    }
  ]
};

// =============================================================================
// EXPORT DEFAULT
// =============================================================================
// Mapeo de moduleId → ClinicalCase

export default {
  'mod-03-raciocinio-clinico': clinicalCaseMod03
};

