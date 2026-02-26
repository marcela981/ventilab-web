import { useState, useCallback } from 'react';

import { simulatorApi } from '../simulator.api';
import type { PatientModel, PatientCondition, VitalSigns } from '@/contracts/patient.contracts';
import type { VentilatorCommand } from '@/contracts/simulator.contracts';
import type { PatientFormState, CalculatedParams } from '../components/PatientSimulator/usePatientForm';

// =============================================================================
// Types
// =============================================================================

export interface UseSimulationReturn {
  /** PatientModel recibido del backend (null mientras no se configure) */
  patient: PatientModel | null;
  /** true mientras hay un loop de generación de señales activo */
  isSimulating: boolean;
  /** true mientras hay una petición HTTP en curso */
  isLoading: boolean;
  /** Último error, o null */
  error: string | null;
  actions: {
    /**
     * Envía los datos del formulario al backend, obtiene el PatientModel calculado
     * y opcionalmente lanza la simulación con los parámetros ventilatorios iniciales.
     */
    configurePatient: (
      formState: PatientFormState,
      calculated: CalculatedParams | null,
    ) => Promise<PatientModel | null>;
    /**
     * Inicia la generación de señales a 20 Hz.
     * El backend emitirá 'ventilator:data' por WebSocket.
     */
    startSimulation: (command: VentilatorCommand) => Promise<void>;
    /** Detiene el loop de señales. */
    stopSimulation: () => Promise<void>;
    clearError: () => void;
  };
}

// =============================================================================
// Gender mapping
// =============================================================================

function mapGender(gender: PatientFormState['gender']): 'M' | 'F' {
  return gender === 'masculino' ? 'M' : 'F';
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Orquesta el ciclo de vida completo de la simulación de paciente:
 *   1. configurePatient() → POST /api/simulation/patient/configure
 *   2. startSimulation()  → POST /api/simulation/patient/start
 *   3. stopSimulation()   → POST /api/simulation/patient/stop
 *
 * Los datos fluyen de vuelta por WebSocket ('ventilator:data'),
 * que ya es manejado por useRemoteVentilator sin cambios adicionales.
 */
export function useSimulation(): UseSimulationReturn {
  const [patient, setPatient] = useState<PatientModel | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // configurePatient
  // ---------------------------------------------------------------------------

  const configurePatient = useCallback(
    async (
      formState: PatientFormState,
      calculated: CalculatedParams | null,
    ): Promise<PatientModel | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Build the API request body from the form state
        const body: Record<string, unknown> = {
          demographics: {
            name: formState.name || undefined,
            weight: Number(formState.weight),
            height: Number(formState.height),
            age: Number(formState.age),
            gender: mapGender(formState.gender as PatientFormState['gender']),
          },
          condition: formState.condition as PatientCondition,
          vitalSigns: {
            heartRate: formState.heartRate !== '' ? Number(formState.heartRate) : undefined,
            respiratoryRate: formState.respiratoryRate !== '' ? Number(formState.respiratoryRate) : undefined,
            spo2: formState.spo2 !== '' ? Number(formState.spo2) : undefined,
            systolicBP: formState.systolicBP !== '' ? Number(formState.systolicBP) : undefined,
            diastolicBP: formState.diastolicBP !== '' ? Number(formState.diastolicBP) : undefined,
            temperature: formState.temperature !== '' ? Number(formState.temperature) : undefined,
          } as Partial<VitalSigns>,
          diagnosis: formState.diagnosis || undefined,
          difficultyLevel: formState.difficultyLevel,
        };

        const response = await simulatorApi.configurePatient(body);

        if (!response.success || !response.patient) {
          throw new Error('El backend no devolvió un paciente válido');
        }

        setPatient(response.patient);
        return response.patient;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al configurar paciente';
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // startSimulation
  // ---------------------------------------------------------------------------

  const startSimulation = useCallback(async (command: VentilatorCommand): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await simulatorApi.startSimulation(command);
      setIsSimulating(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar la simulación';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // stopSimulation
  // ---------------------------------------------------------------------------

  const stopSimulation = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await simulatorApi.stopSimulation();
      setIsSimulating(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al detener la simulación';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // clearError
  // ---------------------------------------------------------------------------

  const clearError = useCallback(() => setError(null), []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    patient,
    isSimulating,
    isLoading,
    error,
    actions: {
      configurePatient,
      startSimulation,
      stopSimulation,
      clearError,
    },
  };
}
