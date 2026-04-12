/**
 * Patient Contracts – Frontend
 *
 * Mirrors the patient types defined in the backend simulation module.
 * Keep in sync with: ventylab-server/src/modules/simulation/patient/patient.types.ts
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Condiciones clínicas que afectan la mecánica respiratoria
 * Cada condición modifica compliance y resistencia de forma característica
 */
export enum PatientCondition {
    HEALTHY = 'HEALTHY',
    ARDS_MILD = 'ARDS_MILD',           // PaO2/FiO2 200-300
    ARDS_MODERATE = 'ARDS_MODERATE',   // PaO2/FiO2 100-200
    ARDS_SEVERE = 'ARDS_SEVERE',       // PaO2/FiO2 < 100
    COPD_MILD = 'COPD_MILD',
    COPD_MODERATE = 'COPD_MODERATE',
    COPD_SEVERE = 'COPD_SEVERE',
    ASTHMA_MILD = 'ASTHMA_MILD',
    ASTHMA_MODERATE = 'ASTHMA_MODERATE',
    ASTHMA_SEVERE = 'ASTHMA_SEVERE',
    PNEUMONIA = 'PNEUMONIA',
    PULMONARY_EDEMA = 'PULMONARY_EDEMA',
    PNEUMOTHORAX = 'PNEUMOTHORAX',
    OBESITY_HYPOVENTILATION = 'OBESITY_HYPOVENTILATION',
    NEUROMUSCULAR = 'NEUROMUSCULAR',
    POST_SURGICAL = 'POST_SURGICAL',
}

export type Gender = 'M' | 'F';

// =============================================================================
// Data shapes
// =============================================================================

/**
 * Datos demográficos mínimos del paciente
 * Solo lo necesario para cálculos fisiológicos
 */
export interface PatientDemographics {
    /** Nombre para identificación (opcional, solo UI) */
    name?: string;
    /** Peso actual en kg (usado para cálculos de dosificación) */
    weight: number;
    /** Estatura en cm */
    height: number;
    /** Edad en años */
    age: number;
    /** Sexo biológico (afecta IBW) */
    gender: Gender;
}

/**
 * Parámetros calculados automáticamente
 */
export interface PatientCalculatedParams {
    /** Peso corporal ideal (kg) - Fórmula ARDSNet */
    idealBodyWeight: number;
    /** Índice de masa corporal */
    bmi: number;
    /** Volumen tidal predicho (6-8 ml/kg IBW) */
    predictedTidalVolume: { min: number; max: number };
    /** Superficie corporal (m²) - Fórmula DuBois */
    bodySurfaceArea: number;
}

/**
 * Mecánica respiratoria del paciente
 * Valores que determinan la respuesta del sistema respiratorio
 */
export interface RespiratoryMechanics {
    /** Compliance estática (ml/cmH2O) - Normal: 50-100 */
    compliance: number;
    /** Resistencia de vías aéreas (cmH2O/L/s) - Normal: 2-5 */
    resistance: number;
    /** Capacidad residual funcional (ml) - aprox 2400ml adulto */
    functionalResidualCapacity: number;
    /** Auto-PEEP intrínseca (cmH2O) - Normal: 0 */
    intrinsicPeep: number;
}

/**
 * Signos vitales basales del paciente
 */
export interface VitalSigns {
    /** Frecuencia cardíaca (lpm) */
    heartRate: number;
    /** Frecuencia respiratoria espontánea (rpm) */
    respiratoryRate: number;
    /** SpO2 basal (%) */
    spo2: number;
    /** Presión arterial sistólica (mmHg) */
    systolicBP: number;
    /** Presión arterial diastólica (mmHg) */
    diastolicBP: number;
    /** Temperatura (°C) */
    temperature: number;
}

/**
 * Gasometría arterial
 */
export interface ArterialBloodGas {
    /** pH arterial (7.35-7.45) */
    ph: number;
    /** PaO2 en mmHg */
    pao2: number;
    /** PaCO2 en mmHg (35-45) */
    paco2: number;
    /** HCO3 en mEq/L (22-26) */
    hco3: number;
    /** Exceso de base */
    baseExcess: number;
    /** Lactato (mmol/L) */
    lactate: number;
}

/**
 * Examen físico simplificado relevante para ventilación
 */
export interface PhysicalExam {
    /** Escala Glasgow (3-15) */
    glasgowScore: number;
    /** Hallazgos en auscultación pulmonar */
    lungAuscultation: string;
    /** Uso de músculos accesorios */
    accessoryMuscleUse: boolean;
    /** Patrón respiratorio */
    breathingPattern: 'normal' | 'tachypneic' | 'bradypneic' | 'irregular' | 'paradoxical';
}

// =============================================================================
// Patient Model
// =============================================================================

/**
 * Modelo completo de paciente para simulación
 */
export interface PatientModel {
    /** ID único del paciente simulado */
    id: string;
    /** Datos demográficos */
    demographics: PatientDemographics;
    /** Parámetros calculados (readonly, generados automáticamente) */
    calculated: PatientCalculatedParams;
    /** Mecánica respiratoria */
    respiratoryMechanics: RespiratoryMechanics;
    /** Condición clínica principal */
    condition: PatientCondition;
    /** Signos vitales */
    vitalSigns: VitalSigns;
    /** Gasometría (opcional) */
    arterialBloodGas?: ArterialBloodGas;
    /** Examen físico (opcional) */
    physicalExam?: PhysicalExam;
    /** Diagnóstico principal (texto libre) */
    diagnosis?: string;
    /** Nivel de dificultad de simulación */
    difficultyLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
    /** Timestamp de creación */
    createdAt: number;
}

// =============================================================================
// REST API — request/response shapes
// =============================================================================

/**
 * Request para configurar paciente
 */
export interface ConfigurePatientRequest {
    /** ID de caso clínico predefinido (opcional) */
    clinicalCaseId?: string;
    /** Configuración custom (si no se usa caso predefinido) */
    customPatient?: Omit<PatientModel, 'id' | 'calculated' | 'createdAt'>;
    /** ID de sesión de simulación */
    sessionId: string;
}

/**
 * Response de configuración de paciente
 */
export interface ConfigurePatientResponse {
    success: boolean;
    patient: PatientModel;
    message: string;
    timestamp: number;
}
