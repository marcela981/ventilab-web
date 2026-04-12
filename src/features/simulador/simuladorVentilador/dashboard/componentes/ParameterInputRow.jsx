import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Tooltip,
} from '@mui/material';

import ValidatedInput from '@/features/simulador/compartido/componentes/ValidatedInput';

const ParameterInputRow = ({
  ventilationMode,
  ventilatorData,
  parameterValidation,
  handleParameterChange,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="row"
      alignItems="flex-start"
      mb={1}
      mt="2px"
      gap={0}
      sx={{ position: 'relative', zIndex: 10 }}
    >
      {/* Inputs centrados */}
      <Box
        display="flex"
        flexDirection="row"
        flexWrap="nowrap"
        gap={2}
        alignItems="flex-start"
        justifyContent="space-evenly"
        flex={1}
        minWidth={0}
        sx={{ overflow: 'visible', pb: 1, px: 0.5 }}
      >
        {/* FIO2 */}
        <Box display="flex" flexDirection="column" alignItems="center" flex={1}>
          <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 200 }}>
            % FIO2
          </Typography>
          <ValidatedInput
            parameter="fio2"
            value={ventilatorData.fio2}
            onChange={handleParameterChange}
            label="FIO2"
            unit="%"
            validation={parameterValidation.validateSingleParameter(
              'fio2',
              ventilatorData.fio2,
              ventilatorData,
              ventilationMode,
            )}
            ranges={parameterValidation.getParameterRanges('fio2')}
            sx={{ minWidth: '130px' }}
            inputProps={{ min: 21, max: 100 }}
          />
        </Box>

        {ventilationMode === 'volume' && (
          <>
            <Box display="flex" flexDirection="column" alignItems="center" flex={1}>
              <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 300 }}>
                Volumen
              </Typography>
              <ValidatedInput
                parameter="volumen"
                value={ventilatorData.volumen}
                onChange={handleParameterChange}
                label="Volumen"
                unit="ml"
                validation={parameterValidation.validateSingleParameter(
                  'volumen',
                  ventilatorData.volumen,
                  ventilatorData,
                  ventilationMode,
                )}
                ranges={parameterValidation.getParameterRanges('volumen')}
                sx={{ minWidth: '130px' }}
                inputProps={{ min: 50, max: 2000 }}
              />
            </Box>
            <Box display="flex" flexDirection="column" alignItems="center" flex={1}>
              <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 300 }}>
                Q Max
              </Typography>
              <TextField
                type="number"
                variant="outlined"
                size="small"
                inputProps={{ min: 0, step: 0.1 }}
                sx={{ minWidth: '130px' }}
                value={ventilatorData.qMax || ''}
                onChange={(e) => handleParameterChange('qMax', Number(e.target.value))}
                helperText={
                  ventilatorData.qMax
                    ? `Calculado: ${ventilatorData.qMax.toFixed(1)} L/min`
                    : 'Auto-calculado'
                }
                InputProps={{ readOnly: true }}
              />
            </Box>
          </>
        )}

        {ventilationMode === 'pressure' && (
          <Box display="flex" flexDirection="column" alignItems="center" flex={1}>
            <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 300 }}>
              PIP [cmH2O]
            </Typography>
            <ValidatedInput
              parameter="presionMax"
              value={ventilatorData.presionMax || 20}
              onChange={handleParameterChange}
              label="PIP"
              unit="cmH2O"
              validation={parameterValidation.validateSingleParameter(
                'presionMax',
                ventilatorData.presionMax || 20,
                ventilatorData,
                ventilationMode,
              )}
              ranges={parameterValidation.getParameterRanges('presionMax')}
              sx={{ minWidth: '130px' }}
              inputProps={{ min: 5, max: 60 }}
            />
          </Box>
        )}

        <Box display="flex" flexDirection="column" alignItems="center" flex={1}>
          <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 300 }}>
            PEEP
          </Typography>
          <ValidatedInput
            parameter="peep"
            value={ventilatorData.peep}
            onChange={handleParameterChange}
            label="PEEP"
            unit="cmH2O"
            validation={parameterValidation.validateSingleParameter(
              'peep',
              ventilatorData.peep,
              ventilatorData,
              ventilationMode,
            )}
            ranges={parameterValidation.getParameterRanges('peep')}
            sx={{ minWidth: '130px' }}
            inputProps={{ min: 0, max: 20 }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default ParameterInputRow;
