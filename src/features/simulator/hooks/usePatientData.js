import { useContext } from 'react';
import { PatientDataContext } from '@/features/simulator/context/PatientDataContext';

export const usePatientData = () => {
  const context = useContext(PatientDataContext);
  if (context === undefined) {
    throw new Error('usePatientData debe ser usado dentro de un PatientDataProvider');
  }
  return context;
};