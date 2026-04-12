/**
 * EditModeContext - Estado global de "Modo Edición" para el LMS
 * Permite a componentes anidados saber si el profesor activó la edición in-place.
 */
import React, { createContext, useContext, useState } from 'react';

const EditModeContext = createContext({
  isEditMode: false,
  toggleEditMode: () => {},
});

export function EditModeProvider({ children }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const toggleEditMode = () => setIsEditMode((v) => !v);
  return (
    <EditModeContext.Provider value={{ isEditMode, toggleEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}
