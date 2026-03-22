// Barrel export for simuladorPaciente sub-module
export { default as PatientSimulator } from './FormularioPaciente';
export * from './hooks/usePatientData';
export * from './hooks/useSimulation';
export { PatientDataContext, PatientDataProvider } from './contexto/PatientDataContext';
