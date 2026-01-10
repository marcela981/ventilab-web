import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ClinicalCase from './ClinicalCase';

// Tema básico para las stories (aproxima el tema de VentyLab)
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#2196F3' },
    secondary: { main: '#FF9800' },
    success: { main: '#4CAF50' },
    warning: { main: '#FFC107' },
    error: { main: '#F44336' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const Template = (args) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <div style={{ padding: 16, minHeight: '100vh' }}>
      <ClinicalCase {...args} />
    </div>
  </ThemeProvider>
);

export default {
  title: 'Teaching/Content/ClinicalCase',
  component: ClinicalCase,
  parameters: {
    layout: 'fullscreen',
  },
};

// ============================================================================
// Story 1: SDRA Severo (ARDS)
// ============================================================================

const ardsCase = {
  caseId: 'case-01-ards',
  title: 'SDRA Severo en Paciente COVID-19',
  patientInfo: {
    age: 65,
    sex: 'Masculino',
    weight: 75,
    height: 170,
    admissionReason: 'Insuficiencia respiratoria aguda secundaria a neumonía bilateral por SARS-CoV-2',
    vitalSigns: {
      hr: 110,
      bp: '140/85',
      rr: 32,
      spo2: 85,
      temp: 38.5,
    },
    physicalExam: 'Paciente en distress respiratorio moderado-severo. Crepitantes bilaterales en ambos hemitórax. Uso de musculatura accesoria. Taquipneico. No cianosis central. Hemodinámicamente estable.',
  },
  complementaryExams: {
    gasometry: {
      ph: { value: 7.28, normal: [7.35, 7.45] },
      pao2: { value: 55, normal: [80, 100] },
      paco2: { value: 52, normal: [35, 45] },
      hco3: { value: 24, normal: [22, 26] },
      sao2: { value: 85, normal: [95, 100] },
    },
    labs: {
      wbc: { value: 15000, normal: [4000, 11000], unit: '/mm³' },
      crp: { value: 120, normal: [0, 10], unit: 'mg/L' },
      ddimer: { value: 2500, normal: [0, 500], unit: 'ng/mL' },
      ferritin: { value: 850, normal: [20, 300], unit: 'ng/mL' },
    },
    imaging: 'Radiografía de tórax: Infiltrados bilaterales difusos en patrón de vidrio esmerilado, compatible con SDRA. Índice PaO₂/FiO₂ = 110 (SDRA severo).',
  },
  modalityOptions: [
    {
      id: 'vcv',
      name: 'VCV (Volumen Control Ventilation)',
      description: 'Ventilación controlada por volumen. Garantiza un volumen tidal fijo independiente de las presiones generadas.',
    },
    {
      id: 'pcv',
      name: 'PCV (Pressure Control Ventilation)',
      description: 'Ventilación controlada por presión. Limita la presión inspiratoria máxima, el volumen varía según la compliance pulmonar.',
    },
    {
      id: 'prvc',
      name: 'PRVC (Pressure Regulated Volume Control)',
      description: 'Modo híbrido que combina las ventajas de PCV y VCV. Ajusta automáticamente la presión para garantizar el volumen objetivo.',
    },
  ],
  parameters: {
    mode: ['vcv', 'pcv', 'prvc'],
    vt: { min: 4, max: 10, unit: 'ml/kg' },
    rr: { min: 10, max: 30, unit: 'rpm' },
    fio2: { min: 40, max: 100, unit: '%' },
    peep: { min: 5, max: 20, unit: 'cmH₂O' },
    pinsp: { min: 15, max: 35, unit: 'cmH₂O' },
  },
  correctSolution: {
    modality: 'pcv',
    reasoning: 'En SDRA severo, PCV es la modalidad de elección porque permite mejor control de las presiones pico, distribución más homogénea de la ventilación gracias al flujo decelerado, y reduce el riesgo de barotrauma. La estrategia de ventilación protectora es fundamental en SDRA, priorizando la limitación de presiones sobre el volumen garantizado.',
    parameters: {
      vt: 6,
      rr: 18,
      fio2: 80,
      peep: 12,
      pinsp: 25,
    },
    explanations: {
      vt: 'Volumen tidal de 6 ml/kg de peso ideal es la piedra angular de la ventilación protectora en SDRA. Reduce el volutrauma y mejora la supervivencia según el estudio ARDSnet.',
      rr: 'Frecuencia respiratoria de 18 rpm permite mantener una ventilación minuto adecuada sin causar atrapamiento aéreo, manteniendo un volumen minuto de ~9 L/min.',
      fio2: 'FiO₂ de 80% es necesaria inicialmente para corregir la hipoxemia severa (SpO₂ 85%). Se debe disminuir gradualmente según respuesta para evitar toxicidad por oxígeno.',
      peep: 'PEEP de 12 cmH₂O es apropiado para SDRA moderado-severo. Mantiene el reclutamiento alveolar, previene el colapso espiratorio (atelectrauma) y mejora la oxigenación.',
      pinsp: 'Presión inspiratoria de 25 cmH₂O permite una presión de conducción (driving pressure) de 13 cmH₂O, dentro del rango seguro (<15 cmH₂O) para minimizar el riesgo de lesión pulmonar.',
    },
  },
};

export const ARDSCase = Template.bind({});
ARDSCase.args = {
  caseData: ardsCase,
  onComplete: (result) => {
    console.log('Caso completado:', result);
    alert(`¡Caso completado!\nPuntuación: ${result.score}%\nTiempo: ${result.timeSpent}s`);
  },
};

// ============================================================================
// Story 2: EPOC Exacerbado
// ============================================================================

const copdCase = {
  caseId: 'case-02-copd',
  title: 'Exacerbación Severa de EPOC con Hipercapnia',
  patientInfo: {
    age: 72,
    sex: 'Masculino',
    weight: 68,
    height: 165,
    admissionReason: 'Exacerbación aguda de EPOC con falla respiratoria hipercápnica',
    vitalSigns: {
      hr: 105,
      bp: '150/90',
      rr: 28,
      spo2: 88,
      temp: 37.2,
    },
    physicalExam: 'Paciente con disnea severa, uso de musculatura accesoria. Tórax en tonel. Sibilancias espiratorias difusas. Espiración prolongada. Timpanismo a la percusión.',
  },
  complementaryExams: {
    gasometry: {
      ph: { value: 7.25, normal: [7.35, 7.45] },
      pao2: { value: 58, normal: [80, 100] },
      paco2: { value: 68, normal: [35, 45] },
      hco3: { value: 30, normal: [22, 26] },
      sao2: { value: 88, normal: [95, 100] },
    },
    labs: {
      wbc: { value: 13000, normal: [4000, 11000], unit: '/mm³' },
      crp: { value: 45, normal: [0, 10], unit: 'mg/L' },
    },
    imaging: 'Radiografía de tórax: Hiperinsuflación pulmonar. Aplanamiento diafragmático. Aumento de espacios intercostales. No infiltrados agudos.',
  },
  modalityOptions: [
    {
      id: 'vcv',
      name: 'VCV (Volumen Control Ventilation)',
      description: 'Ventilación controlada por volumen con volumen tidal fijo.',
    },
    {
      id: 'pcv',
      name: 'PCV (Pressure Control Ventilation)',
      description: 'Ventilación controlada por presión con límite de presión inspiratoria.',
    },
    {
      id: 'psv',
      name: 'PSV (Pressure Support Ventilation)',
      description: 'Ventilación asistida por presión. El paciente inicia todas las respiraciones.',
    },
  ],
  parameters: {
    mode: ['vcv', 'pcv', 'psv'],
    vt: { min: 4, max: 10, unit: 'ml/kg' },
    rr: { min: 8, max: 25, unit: 'rpm' },
    fio2: { min: 30, max: 60, unit: '%' },
    peep: { min: 3, max: 10, unit: 'cmH₂O' },
    pinsp: { min: 12, max: 25, unit: 'cmH₂O' },
  },
  correctSolution: {
    modality: 'pcv',
    reasoning: 'En EPOC exacerbado con hipercapnia, PCV permite un mejor manejo del atrapamiento aéreo y auto-PEEP. El flujo decelerado de PCV facilita el vaciamiento pulmonar y reduce el trabajo respiratorio. Además, permite controlar las presiones máximas en un paciente con alto riesgo de barotrauma.',
    parameters: {
      vt: 7,
      rr: 12,
      fio2: 40,
      peep: 5,
      pinsp: 18,
    },
    explanations: {
      vt: 'Volumen tidal de 7 ml/kg es apropiado para EPOC. No tan restrictivo como en SDRA, pero evita la sobredistensión en un pulmón ya hiperinsuflado.',
      rr: 'Frecuencia baja (12 rpm) es crucial en EPOC para permitir un tiempo espiratorio prolongado (I:E 1:3 o 1:4), evitando el atrapamiento aéreo y la auto-PEEP.',
      fio2: 'FiO₂ de 40% es suficiente para una SpO₂ objetivo de 88-92% en EPOC. FiO₂ elevado puede suprimir el drive respiratorio en hipercápnicos crónicos.',
      peep: 'PEEP de 5 cmH₂O actúa como contra-PEEP para vencer la auto-PEEP intrínseca, reduce el trabajo inspiratorio y mejora el trigger.',
      pinsp: 'Presión inspiratoria moderada de 18 cmH₂O permite una ventilación adecuada sin generar presiones alveolares excesivas que agraven el atrapamiento aéreo.',
    },
  },
};

export const COPDCase = Template.bind({});
COPDCase.args = {
  caseData: copdCase,
  onComplete: (result) => {
    console.log('Caso EPOC completado:', result);
  },
};

// ============================================================================
// Story 3: Caso Simple para Testing
// ============================================================================

const simpleCase = {
  caseId: 'case-test-simple',
  title: 'Caso de Prueba Simple',
  patientInfo: {
    age: 45,
    sex: 'Femenino',
    weight: 60,
    height: 160,
    admissionReason: 'Neumonía adquirida en la comunidad',
    vitalSigns: {
      hr: 95,
      bp: '120/80',
      rr: 22,
      spo2: 92,
      temp: 38.0,
    },
    physicalExam: 'Crepitantes en base pulmonar derecha. Resto del examen normal.',
  },
  complementaryExams: {
    gasometry: {
      ph: { value: 7.38, normal: [7.35, 7.45] },
      pao2: { value: 70, normal: [80, 100] },
      paco2: { value: 40, normal: [35, 45] },
    },
    labs: {
      wbc: { value: 14000, normal: [4000, 11000], unit: '/mm³' },
    },
    imaging: 'Rx: Consolidación en lóbulo inferior derecho.',
  },
  modalityOptions: [
    {
      id: 'vcv',
      name: 'VCV',
      description: 'Volumen controlado',
    },
    {
      id: 'pcv',
      name: 'PCV',
      description: 'Presión controlada',
    },
  ],
  parameters: {
    vt: { min: 5, max: 8, unit: 'ml/kg' },
    rr: { min: 12, max: 20, unit: 'rpm' },
    fio2: { min: 40, max: 60, unit: '%' },
    peep: { min: 5, max: 10, unit: 'cmH₂O' },
  },
  correctSolution: {
    modality: 'vcv',
    reasoning: 'VCV es apropiado para este caso de neumonía simple sin complicaciones severas.',
    parameters: {
      vt: 6,
      rr: 16,
      fio2: 50,
      peep: 6,
    },
    explanations: {
      vt: 'Volumen tidal protector',
      rr: 'Frecuencia normal',
      fio2: 'FiO₂ moderada',
      peep: 'PEEP fisiológico',
    },
  },
};

export const SimpleCase = Template.bind({});
SimpleCase.args = {
  caseData: simpleCase,
  onComplete: (result) => {
    console.log('Caso simple completado:', result);
  },
};

// ============================================================================
// Story 4: Mobile View
// ============================================================================

export const MobileView = (args) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <div style={{ padding: 8, maxWidth: 480, minHeight: '100vh' }}>
      <ClinicalCase {...args} />
    </div>
  </ThemeProvider>
);
MobileView.args = {
  caseData: simpleCase,
  onComplete: (result) => {
    console.log('Caso móvil completado:', result);
  },
};
