import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import { ParameterTable } from '../content';

/**
 * ParameterTablesSection - Componente para renderizar tablas de parámetros
 */
const ParameterTablesSection = ({ data }) => {
  // Buscar secciones con type === 'parameter-table'
  const sections = data?.sections || data?.content?.sections || [];
  const parameterTableSections = Array.isArray(sections)
    ? sections.filter(s => String(s.type).toLowerCase() === 'parameter-table')
    : [];

  if (parameterTableSections.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      {parameterTableSections.map((section, idx) => {
        const tableData = section.parameters || section.data || section;
        
        return (
          <Box key={idx} sx={{ mb: 4 }}>
            {section.title && (
              <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3, color: '#0BBAF4' }}>
                {section.title}
              </Typography>
            )}
            
            <ParameterTable
              parameters={tableData.parameters || []}
              showUnits={tableData.showUnits !== false}
              showObjective={tableData.showObjective !== false}
              interactive={tableData.interactive !== false}
              highlightCritical={tableData.highlightCritical !== false}
              compactMode={tableData.compactMode || false}
              searchTerm={tableData.searchTerm || ''}
              title={tableData.title || section.title || ''}
              categories={tableData.categories || null}
              onParameterClick={tableData.onParameterClick || undefined}
            />
            
            {section.description && (
              <Typography variant="body2" sx={{ mt: 2, color: '#ffffff' }}>
                {section.description}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default ParameterTablesSection;

