import React, { createContext, useContext, useMemo, useState } from 'react';

const EvaluationContext = createContext(null);

export const EvaluationProvider = ({ children }) => {
  const [selectedActivityId, setSelectedActivityId] = useState(null);

  const value = useMemo(
    () => ({
      selectedActivityId,
      setSelectedActivityId,
    }),
    [selectedActivityId]
  );

  return <EvaluationContext.Provider value={value}>{children}</EvaluationContext.Provider>;
};

export const useEvaluationContext = () => {
  const ctx = useContext(EvaluationContext);
  if (!ctx) throw new Error('useEvaluationContext must be used within EvaluationProvider');
  return ctx;
};

