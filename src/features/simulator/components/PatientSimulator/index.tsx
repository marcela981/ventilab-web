import React, { useState, useCallback } from 'react';
import { VentilationMode } from '@/contracts/simulator.contracts';
import {
  Box,
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { predefinedClinicalCases, getSimulatedPatientData } from '@/features/simulator/utils/patientSimulatedData';
import { usePatientData } from '@/features/simulator/hooks/usePatientData';
import { useSimulation } from '@/features/simulator/hooks/useSimulation';
import { usePatientForm } from './usePatientForm';
import { PatientForm } from './PatientForm';
import { StyledCard, menuPaperSx } from './PatientForm.styles';
import { CardContent } from '@mui/material';

// =============================================================================
// Types
// =============================================================================

type CaseKey = keyof typeof predefinedClinicalCases;

// =============================================================================
// Component
// =============================================================================

const PatientSimulator: React.FC = () => {
  const { receivePatientData } = usePatientData();
  const { formState, calculated, errors, updateField, reset, loadClinicalCase, buildPayload } = usePatientForm();
  const simulation = useSimulation();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedCase, setSelectedCase] = useState<CaseKey | ''>('');
  const [successMsg, setSuccessMsg] = useState('');

  // Case loading
  const handleLoadCase = useCallback(() => {
    if (!selectedCase) return;
    const caseData = predefinedClinicalCases[selectedCase];
    if (!caseData) return;
    loadClinicalCase(caseData);
    setActiveStep(0);
    setSuccessMsg(`Historia clínica "${caseData.title}" cargada.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  }, [selectedCase, loadClinicalCase]);

  const handleLoadRandom = useCallback(() => {
    const data = getSimulatedPatientData();
    loadClinicalCase(data);
    setActiveStep(0);
    setSuccessMsg('Datos simulados aleatorios cargados.');
    setTimeout(() => setSuccessMsg(''), 4000);
  }, [loadClinicalCase]);

  // Navigation
  const handleNext = useCallback(() => setActiveStep(s => s + 1), []);
  const handleBack = useCallback(() => setActiveStep(s => s - 1), []);

  const handleReset = useCallback(() => {
    reset();
    setActiveStep(0);
    setSelectedCase('');
  }, [reset]);

  // Submit — sends to backend and updates legacy context
  const handleSubmit = useCallback(async () => {
    const payload = buildPayload();
    if (!payload) return;

    // 1. Send to backend (calculates IBW, respiratory mechanics, etc.)
    const patientModel = await simulation.actions.configurePatient(formState, calculated);

    if (!patientModel) {
      // Error is stored in simulation.error and shown below
      return;
    }

    // 2. Kick off the synthetic 30 Hz signal loop with safe initial parameters.
    // The user can adjust from the control panel; each change routes through
    // POST /command → backend updates the math without restarting the loop.
    const initialCommand = {
      mode: VentilationMode.VCV,
      tidalVolume: Math.round(patientModel.calculated.predictedTidalVolume.min),
      respiratoryRate: patientModel.vitalSigns.respiratoryRate,
      peep: 5,
      fio2: 0.4,
      timestamp: Date.now(),
    };
    await simulation.actions.startSimulation(initialCommand);

    // 3. Update legacy PatientDataContext for other components that depend on it
    receivePatientData(payload);

    setSuccessMsg('✅ Paciente configurado. Las señales fisiológicas se están generando en tiempo real.');
    setTimeout(() => setSuccessMsg(''), 7000);
  }, [buildPayload, receivePatientData, simulation.actions, formState, calculated]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, color: '#e8f4fd', fontWeight: 'bold' }}>
        Configuración del Paciente
      </Typography>

      {/* Case loader */}
      <StyledCard sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#de0b24', fontWeight: 'bold' }}>
            Módulo de Pacientes Simulados
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 280, flex: 1 }}>
              <InputLabel>Historia Clínica Simulada</InputLabel>
              <Select
                value={selectedCase}
                label="Historia Clínica Simulada"
                onChange={e => setSelectedCase(e.target.value as CaseKey | '')}
                MenuProps={{ PaperProps: { sx: menuPaperSx } }}
              >
                <MenuItem value=""><em>Seleccionar caso clínico…</em></MenuItem>
                {(Object.entries(predefinedClinicalCases) as [CaseKey, { title: string }][]).map(([key, c]) => (
                  <MenuItem key={key} value={key}>{c.title}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={<HistoryIcon />}
              onClick={handleLoadCase}
              disabled={!selectedCase}
              sx={{
                backgroundColor: '#d32f2f',
                '&:hover': { backgroundColor: '#b71c1c' },
                '&:disabled': { backgroundColor: 'rgba(211,47,47,0.3)' },
              }}
            >
              Cargar Caso
            </Button>

            <Button
              variant="contained"
              startIcon={<ShuffleIcon />}
              onClick={handleLoadRandom}
              sx={{ backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' } }}
            >
              Aleatorio
            </Button>
          </Box>

          {/* Ventilator settings preview */}
          {selectedCase && predefinedClinicalCases[selectedCase] && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                {(predefinedClinicalCases[selectedCase] as any).description}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {Object.entries((predefinedClinicalCases[selectedCase] as any).ventilatorSettings ?? {}).map(([k, v]) => (
                  <Chip key={k} label={`${k}: ${v}`} size="small"
                    sx={{ backgroundColor: 'rgba(46,125,50,0.2)', color: '#fff' }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </StyledCard>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}

      {simulation.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={simulation.actions.clearError}>
          {simulation.error}
        </Alert>
      )}

      {simulation.patient && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Paciente activo: <strong>{simulation.patient.demographics.name ?? 'Sin nombre'}</strong>
          {' · '}IBW: <strong>{simulation.patient.calculated.idealBodyWeight} kg</strong>
          {' · '}VT recomendado: <strong>{simulation.patient.calculated.predictedTidalVolume.min}–{simulation.patient.calculated.predictedTidalVolume.max} ml</strong>
          {simulation.isSimulating && (
            <Box component="span" sx={{ ml: 1, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <CircularProgress size={12} color="inherit" />
              {' Simulando…'}
            </Box>
          )}
        </Alert>
      )}

      {/* Main form */}
      <PatientForm
        activeStep={activeStep}
        formState={formState}
        calculated={calculated}
        errors={errors}
        onFieldChange={updateField}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />
    </Container>
  );
};

export default PatientSimulator;
