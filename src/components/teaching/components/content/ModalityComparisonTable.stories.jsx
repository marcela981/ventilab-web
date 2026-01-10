import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ModalityComparisonTable from './ModalityComparisonTable';

// Tema básico para las stories (aproxima el tema de VentyLab)
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4CAF50' },
    secondary: { main: '#FF9800' }
  }
});

const Template = (args) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <div style={{ padding: 16 }}>
      <ModalityComparisonTable {...args} />
    </div>
  </ThemeProvider>
);

const baseColumns = [
  { key: 'modality', label: 'Modalidad', tooltip: 'Nombre de la modalidad ventilatoria' },
  { key: 'control', label: 'Variable de Control', tooltip: 'Variable fija que define la inspiración' },
  { key: 'guarantee', label: 'Variable Garantizada', tooltip: 'Qué garantiza el ventilador por ciclo' },
  { key: 'flow', label: 'Patrón de Flujo', tooltip: 'Forma del flujo inspiratorio' },
  { key: 'trigger', label: 'Trigger', tooltip: 'Qué inicia la inspiración' },
  { key: 'cycling', label: 'Ciclado', tooltip: 'Qué termina la inspiración' }
];

export default {
  title: 'Teaching/Content/ModalityComparisonTable',
  component: ModalityComparisonTable
};

// Story 1: Tabla completa 7 modalidades
const fullRows = [
  { modality: 'VCV', control: 'Volumen', guarantee: 'Volumen', flow: 'Cuadrado', trigger: 'Tiempo/Pcte', cycling: 'Tiempo' },
  { modality: 'PCV', control: 'Presión', guarantee: 'Presión', flow: 'Decelerado', trigger: 'Tiempo/Pcte', cycling: 'Tiempo' },
  { modality: 'SIMV-VC', control: 'Volumen', guarantee: 'Volumen (mand.)', flow: 'Cuadrado/Variable', trigger: 'Tiempo/Pcte', cycling: 'Tiempo/Variable' },
  { modality: 'SIMV-PC', control: 'Presión', guarantee: 'Presión (mand.)', flow: 'Decelerado/Variable', trigger: 'Tiempo/Pcte', cycling: 'Tiempo/Flujo' },
  { modality: 'PSV', control: 'Presión', guarantee: '—', flow: 'Decelerado', trigger: 'Pcte (flujo/presión)', cycling: 'Flujo' },
  { modality: 'CPAP', control: 'Presión', guarantee: '— (PEEP)', flow: 'Variable', trigger: 'Pcte', cycling: 'Pcte' },
  { modality: 'BiPAP', control: 'Presión', guarantee: 'IPAP/EPAP', flow: 'Decelerado', trigger: 'Pcte', cycling: 'Flujo' }
];

export const FullTable = Template.bind({});
FullTable.args = {
  tableData: {
    title: 'Tabla completa',
    columns: baseColumns,
    rows: fullRows
  }
};

// Story 2: Tabla reducida (3 modalidades)
export const ReducedTable = Template.bind({});
ReducedTable.args = {
  tableData: {
    title: 'Tabla reducida',
    columns: baseColumns,
    rows: fullRows.slice(0, 3)
  }
};

// Story 3: Vista móvil simulada (contenedor estrecho)
export const MobileView = (args) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <div style={{ padding: 16, maxWidth: 480 }}>
      <ModalityComparisonTable {...args} />
    </div>
  </ThemeProvider>
);
MobileView.args = {
  tableData: {
    title: 'Vista móvil',
    columns: baseColumns,
    rows: fullRows
  }
};


