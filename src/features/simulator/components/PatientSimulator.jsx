// Re-exports the refactored component from the PatientSimulator/ folder.
// The original monolithic component (~1500 lines) has been replaced with:
//   PatientSimulator/index.tsx       — main container
//   PatientSimulator/PatientForm.tsx — 2-step UI (< 300 lines)
//   PatientSimulator/usePatientForm.ts — state & logic hook
//   PatientSimulator/PatientForm.styles.ts — styled components
export { default } from './PatientSimulator/index';
