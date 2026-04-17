import { useState, useCallback, useMemo } from 'react';
import { PatientCondition } from '@/contracts/patient.contracts';

// =============================================================================
// Types
// =============================================================================

export interface PatientFormState {
  // Sección 1: Básicos
  name: string;
  age: number | '';
  gender: 'masculino' | 'femenino' | '';
  weight: number | '';
  height: number | '';

  // Sección 2: Condición clínica
  condition: PatientCondition | '';
  difficultyLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  diagnosis: string;
  allergies: string[];
  medicalHistory: string;

  // Sección 3: Signos vitales
  heartRate: number | '';
  respiratoryRate: number | '';
  spo2: number | '';
  systolicBP: number | '';
  diastolicBP: number | '';
  temperature: number | '';
  glasgowScore: number | '';
  breathingPattern: 'normal' | 'tachypneic' | 'bradypneic' | 'irregular' | 'paradoxical' | '';
}

export interface CalculatedParams {
  idealBodyWeight: number;
  bmi: number;
  predictedTidalVolume: { min: number; max: number };
}

export type ValidationErrors = Record<string, string>;

// Payload compatible con PatientDataContext
export interface PatientDataPayload {
  patientBasicData: {
    nombre: string;
    apellido: string;
    sexo: string;
    edad: number;
    pesoActual: string;
    estatura: string;
    pesoCorporalIdeal: number;
    imc: number;
  };
  clinicalData: {
    frecuenciaCardiaca: string;
    frecuenciaRespiratoria: string;
    tensionArterialSistolica: string;
    tensionArterialDiastolica: string;
    saturacionOxigeno: string;
    temperatura: string;
    escalaGlasgow: string;
    diagnostico: string;
    alergias: string[];
  };
  respiratoryConditions: {
    asma: boolean;
    epoc: boolean;
    neumonia: boolean;
    covid19: boolean;
    ards: boolean;
  };
  diagnosticStudies: Record<string, string>;
  calculatedParams: {
    volumenTidal: number;
    peepRecomendado: number;
    fio2Inicial: number;
    frecuenciaResp: number;
  };
  timestamp: Date;
  source: string;
}

// =============================================================================
// Initial state
// =============================================================================

const INITIAL_STATE: PatientFormState = {
  name: '',
  age: '',
  gender: '',
  weight: '',
  height: '',
  condition: '',
  difficultyLevel: 'INTERMEDIATE',
  diagnosis: '',
  allergies: [],
  medicalHistory: '',
  heartRate: '',
  respiratoryRate: '',
  spo2: '',
  systolicBP: '',
  diastolicBP: '',
  temperature: '',
  glasgowScore: '',
  breathingPattern: '',
};

// =============================================================================
// Helpers
// =============================================================================

function calcIBW(heightCm: number, gender: 'masculino' | 'femenino'): number {
  // ARDSNet formula
  const base = gender === 'masculino' ? 50 : 45.5;
  return base + 0.91 * (heightCm - 152.4);
}

function conditionToRespiratoryConditions(condition: PatientCondition | '') {
  return {
    asma: condition.startsWith('ASTHMA'),
    epoc: condition.startsWith('COPD'),
    neumonia: condition === PatientCondition.PNEUMONIA || condition === PatientCondition.PULMONARY_EDEMA,
    covid19: false,
    ards: condition.startsWith('ARDS'),
  };
}

function conditionToPeep(condition: PatientCondition | ''): number {
  if (condition.startsWith('ARDS_SEVERE')) return 14;
  if (condition.startsWith('ARDS_MODERATE')) return 10;
  if (condition.startsWith('ARDS_MILD')) return 8;
  if (condition.startsWith('COPD')) return 5;
  if (condition === PatientCondition.PNEUMONIA) return 8;
  return 5;
}

function conditionToFio2(condition: PatientCondition | ''): number {
  if (condition === PatientCondition.ARDS_SEVERE) return 90;
  if (condition === PatientCondition.ARDS_MODERATE) return 70;
  if (condition === PatientCondition.ARDS_MILD) return 50;
  if (condition.startsWith('COPD')) return 35;
  if (condition === PatientCondition.PNEUMONIA) return 60;
  return 21;
}

// =============================================================================
// Hook
// =============================================================================

export function usePatientForm() {
  const [formState, setFormState] = useState<PatientFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Cálculos automáticos (IBW, BMI, VT predicho)
  const calculated = useMemo<CalculatedParams | null>(() => {
    const { weight, height, gender } = formState;
    if (!weight || !height || !gender) return null;

    const heightCm = Number(height);
    const weightKg = Number(weight);
    const heightM = heightCm / 100;

    const ibw = calcIBW(heightCm, gender);
    const bmi = weightKg / (heightM * heightM);

    return {
      idealBodyWeight: Math.round(ibw * 10) / 10,
      bmi: Math.round(bmi * 10) / 10,
      predictedTidalVolume: {
        min: Math.round(ibw * 6),
        max: Math.round(ibw * 8),
      },
    };
  }, [formState.weight, formState.height, formState.gender]);

  const updateField = useCallback(<K extends keyof PatientFormState>(
    field: K,
    value: PatientFormState[K],
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const s = formState;
    const newErrors: ValidationErrors = {};

    if (!s.age) newErrors.age = 'Requerida';
    else if (Number(s.age) < 18 || Number(s.age) > 100) newErrors.age = 'Debe estar entre 18 y 100';

    if (!s.gender) newErrors.gender = 'Requerido';

    if (!s.weight) newErrors.weight = 'Requerido';
    else if (Number(s.weight) < 30 || Number(s.weight) > 250) newErrors.weight = 'Entre 30 y 250 kg';

    if (!s.height) newErrors.height = 'Requerida';
    else if (Number(s.height) < 100 || Number(s.height) > 220) newErrors.height = 'Entre 100 y 220 cm';

    if (!s.condition) newErrors.condition = 'Requerida';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState]);

  const reset = useCallback(() => {
    setFormState(INITIAL_STATE);
    setErrors({});
  }, []);

  // Cargar caso predefinido (estructura antigua de patientSimulatedData.js)
  const loadClinicalCase = useCallback((caseData: Record<string, unknown>) => {
    const b = caseData.patientBasicData ?? {};
    const c = caseData.clinicalData ?? {};
    const r = caseData.respiratoryConditions ?? {};

    // Inferir condición desde respiratoryConditions
    let condition: PatientCondition | '' = '';
    if (r.ards) condition = PatientCondition.ARDS_MODERATE;
    else if (r.epoc) condition = PatientCondition.COPD_MODERATE;
    else if (r.asma) condition = PatientCondition.ASTHMA_MODERATE;
    else if (r.neumonia || r.covid19) condition = PatientCondition.PNEUMONIA;

    setFormState({
      name: b.nombre ?? '',
      age: b.edad ?? '',
      gender: b.sexo ?? '',
      weight: b.pesoActual ?? '',
      height: b.estatura ?? '',
      condition,
      difficultyLevel: 'INTERMEDIATE',
      diagnosis: c.diagnostico ?? caseData.diagnosticStudies?.diagnosticoPrincipal ?? '',
      allergies: c.alergias ?? [],
      medicalHistory: '',
      heartRate: c.frecuenciaCardiaca ?? '',
      respiratoryRate: c.frecuenciaRespiratoria ?? '',
      spo2: c.saturacionOxigeno ?? '',
      systolicBP: c.tensionArterialSistolica ?? '',
      diastolicBP: c.tensionArterialDiastolica ?? '',
      temperature: c.temperatura ?? '',
      glasgowScore: c.escalaGlasgow ?? '',
      breathingPattern: '',
    });
    setErrors({});
  }, []);

  // Construir payload compatible con PatientDataContext
  const buildPayload = useCallback((): PatientDataPayload | null => {
    if (!validate()) return null;

    const ibw = calculated?.idealBodyWeight ?? 0;
    const bmi = calculated?.bmi ?? 0;

    return {
      patientBasicData: {
        nombre: formState.name || 'Paciente',
        apellido: '',
        sexo: formState.gender,
        edad: Number(formState.age),
        pesoActual: String(formState.weight),
        estatura: String(formState.height),
        pesoCorporalIdeal: ibw,
        imc: bmi,
      },
      clinicalData: {
        frecuenciaCardiaca: String(formState.heartRate),
        frecuenciaRespiratoria: String(formState.respiratoryRate),
        tensionArterialSistolica: String(formState.systolicBP),
        tensionArterialDiastolica: String(formState.diastolicBP),
        saturacionOxigeno: String(formState.spo2),
        temperatura: String(formState.temperature),
        escalaGlasgow: String(formState.glasgowScore),
        diagnostico: formState.diagnosis,
        alergias: formState.allergies,
      },
      respiratoryConditions: conditionToRespiratoryConditions(formState.condition),
      diagnosticStudies: {},
      calculatedParams: {
        volumenTidal: calculated?.predictedTidalVolume.min ?? 0,
        peepRecomendado: conditionToPeep(formState.condition),
        fio2Inicial: conditionToFio2(formState.condition),
        frecuenciaResp: Number(formState.respiratoryRate) || 12,
      },
      timestamp: new Date(),
      source: 'patient_simulator',
    };
  }, [formState, validate, calculated]);

  return {
    formState,
    calculated,
    errors,
    updateField,
    validate,
    reset,
    loadClinicalCase,
    buildPayload,
  };
}
