import React from 'react';
import { Box, Container, Typography, Button, TextField } from '@mui/material';
import { styled } from '@mui/material/styles';
import WhatsAppTransfer from './WhatsAppTransfer';

const StyledPaper = styled('div')(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: theme.spacing(1),
  color: '#e8f4fd',
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
}));

const ConnectionTabContent = ({
  serialConnection,
  systemStatus,
  handleConnection,
  handleDisconnection,
  handleSendConfiguration,
  getValueColor,
  ventilatorData,
  maxMinData,
  dataRecording,
  setNotification,
  patientData,
  ventilationMode,
}) => {
  return (
    <Box p={3} pb={12}>
      <Container maxWidth="xl">
        {/* Imágenes de logos */}
        <Box display="flex" flexDirection="column" alignItems="left" mb={4}>
          <img src="/images/logo-univalle.svg" alt="Univalle" width={300} height={50} style={{ marginBottom: 4 }} />
          <img src="/images/logo.png" alt="VentyLab" width={260} height={130} />
        </Box>
        
        <Typography variant="h4" gutterBottom align="center" sx={{ color: '#de0b24', mb: 4 }}>
          Control de Conexión Serial
        </Typography>

        <Box display="flex" gap={3} mb={3} flexWrap="wrap">
          <Box flex="1" minWidth="300px">
            <StyledPaper>
              <Typography variant="h6" gutterBottom sx={{ color: '#de0b24', fontWeight: 600 }}>
                Estado de Conexión
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: serialConnection.isConnected ? 'success.main' : 'error.main',
                    animation: serialConnection.isConnected ? 'pulse 2s infinite' : 'none',
                    boxShadow: serialConnection.isConnected ? '0 0 10px rgba(76, 175, 80, 0.6)' : '0 0 10px rgba(244, 67, 54, 0.6)',
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {serialConnection.isConnected ? 'Conectado' : 'Desconectado'}
                </Typography>
              </Box>
              {systemStatus.lastMessage && (
                <Box sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', p: 2, borderRadius: 1, mt: 2, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    Último mensaje: {systemStatus.lastMessage}
                  </Typography>
                </Box>
              )}
            </StyledPaper>
          </Box>

          <Box flex="1" minWidth="300px">
            <StyledPaper>
              <Typography variant="h6" gutterBottom sx={{ color: '#de0b24', fontWeight: 600 }}>
                Configuración de Puerto
              </Typography>

              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      const port = await serialConnection.requestPort();
                      if (port) {
                        setNotification({ type: 'success', message: 'Puerto seleccionado exitosamente', timestamp: Date.now() });
                      }
                    } catch (error) {
                      let errorMessage = 'Error desconocido';
                      switch (error.message) {
                        case 'USER_CANCELLED':
                          errorMessage = 'Selección de puerto cancelada por el usuario';
                          break;
                        case 'PERMISSION_DENIED':
                          errorMessage = 'Permisos de acceso al puerto serial denegados';
                          break;
                        case 'UNSUPPORTED_BROWSER':
                          errorMessage = 'Tu navegador no soporta Web Serial API. Usa Chrome/Edge más reciente';
                          break;
                        case 'NO_DEVICE_CONNECTED':
                          errorMessage = 'No hay dispositivos seriales conectados o disponibles';
                          break;
                        default:
                          errorMessage = `Error seleccionando puerto: ${error.message}`;
                      }
                      setNotification({ type: 'error', message: errorMessage, timestamp: Date.now() });
                    }
                  }}
                  disabled={serialConnection.isConnected}
                  sx={{ backgroundColor: serialConnection.isConnected ? 'rgba(255, 255, 255, 0.1)' : 'primary.main', '&:hover': { backgroundColor: serialConnection.isConnected ? 'rgba(255, 255, 255, 0.1)' : 'primary.dark' } }}
                >
                  Seleccionar Puerto Serie
                </Button>

                <TextField
                  label="Velocidad de Baudios"
                  type="number"
                  defaultValue={9600}
                  disabled={serialConnection.isConnected}
                  helperText="Velocidad estándar: 9600 bps"
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'rgba(255, 255, 255, 0.05)', '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' }, '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' } } }}
                />

                {!serialConnection.isConnected ? (
                  <Button variant="contained" color="success" onClick={() => handleConnection(null, 9600)} size="large" sx={{ fontWeight: 600, '&:hover': { backgroundColor: 'success.dark' } }}>
                    Conectar
                  </Button>
                ) : (
                  <Button variant="contained" color="error" onClick={handleDisconnection} size="large" sx={{ fontWeight: 600, '&:hover': { backgroundColor: 'error.dark' } }}>
                    Desconectar
                  </Button>
                )}
              </Box>
            </StyledPaper>
          </Box>

          <Box flex="1" minWidth="300px">
            <StyledPaper>
              <Typography variant="h6" gutterBottom sx={{ color: '#de0b24', fontWeight: 600 }}>
                Pruebas de Comunicación
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Button variant="outlined" onClick={() => serialConnection.startSystem()} disabled={!serialConnection.isConnected} size="small" sx={{ borderColor: serialConnection.isConnected ? 'success.main' : 'rgba(255, 255, 255, 0.2)', color: serialConnection.isConnected ? 'success.main' : 'text.disabled', '&:hover': { borderColor: serialConnection.isConnected ? 'success.dark' : 'rgba(255, 255, 255, 0.2)', backgroundColor: serialConnection.isConnected ? 'rgba(76, 175, 80, 0.1)' : 'transparent' } }}>
                  Enviar Start (a?)
                </Button>
                <Button variant="outlined" onClick={() => serialConnection.stopSystem()} disabled={!serialConnection.isConnected} size="small" sx={{ borderColor: serialConnection.isConnected ? 'error.main' : 'rgba(255, 255, 255, 0.2)', color: serialConnection.isConnected ? 'error.main' : 'text.disabled', '&:hover': { borderColor: serialConnection.isConnected ? 'error.dark' : 'rgba(255, 255, 255, 0.2)', backgroundColor: serialConnection.isConnected ? 'rgba(244, 67, 54, 0.1)' : 'transparent' } }}>
                  Enviar Stop (f?)
                </Button>
                <Button variant="outlined" onClick={() => serialConnection.resetSystem()} disabled={!serialConnection.isConnected} size="small" sx={{ borderColor: serialConnection.isConnected ? 'warning.main' : 'rgba(255, 255, 255, 0.2)', color: serialConnection.isConnected ? 'warning.main' : 'text.disabled', '&:hover': { borderColor: serialConnection.isConnected ? 'warning.dark' : 'rgba(255, 255, 255, 0.2)', backgroundColor: serialConnection.isConnected ? 'rgba(255, 152, 0, 0.1)' : 'transparent' } }}>
                  Enviar Reset (r?)
                </Button>
                <Button variant="outlined" onClick={handleSendConfiguration} disabled={!serialConnection.isConnected} size="small" sx={{ borderColor: serialConnection.isConnected ? 'primary.main' : 'rgba(255, 255, 255, 0.2)', color: serialConnection.isConnected ? 'primary.main' : 'text.disabled', '&:hover': { borderColor: serialConnection.isConnected ? 'primary.dark' : 'rgba(255, 255, 255, 0.2)', backgroundColor: serialConnection.isConnected ? 'rgba(222, 11, 36, 0.1)' : 'transparent' } }}>
                  Enviar Configuración Actual
                </Button>
              </Box>
            </StyledPaper>
          </Box>
        </Box>

        <Box mb={3}>
          <StyledPaper>
            <Typography variant="h6" gutterBottom sx={{ color: '#de0b24', fontWeight: 600 }}>
              Monitor de Datos en Tiempo Real
            </Typography>
            <Box display="flex" gap={4} mb={3} justifyContent="space-around">
              <Box textAlign="center" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', p: 2, borderRadius: 1, border: '1px solid rgba(255, 255, 255, 0.1)', minWidth: '120px' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Presión</Typography>
                <Typography variant="h4" sx={{ color: getValueColor('presionPico', ventilatorData.pressure), fontWeight: 'bold' }}>
                  {ventilatorData.pressure.toFixed(1)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>cmH₂O</Typography>
              </Box>
              <Box textAlign="center" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', p: 2, borderRadius: 1, border: '1px solid rgba(255, 255, 255, 0.1)', minWidth: '120px' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Flujo</Typography>
                <Typography variant="h4" sx={{ color: getValueColor('flujo', ventilatorData.flow), fontWeight: 'bold' }}>
                  {ventilatorData.flow.toFixed(1)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>L/min</Typography>
              </Box>
              <Box textAlign="center" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', p: 2, borderRadius: 1, border: '1px solid rgba(255, 255, 255, 0.1)', minWidth: '120px' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Volumen</Typography>
                <Typography variant="h4" sx={{ color: getValueColor('volumen', ventilatorData.volume), fontWeight: 'bold' }}>
                  {ventilatorData.volume.toFixed(1)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>mL</Typography>
              </Box>
            </Box>

            {maxMinData && (
              <Box sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', p: 2, borderRadius: 1, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ color: '#de0b24', fontWeight: 600 }}>
                  Máximos y Mínimos (últimas 100 muestras)
                </Typography>
                <Box display="flex" gap={3} flexWrap="wrap" justifyContent="space-around">
                  <Box textAlign="center" sx={{ minWidth: '110px' }}>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 500 }}>Presión Máx</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ color: '#4caf50' }}>{maxMinData.pressureMax} cmH₂O</Typography>
                  </Box>
                  <Box textAlign="center" sx={{ minWidth: '110px' }}>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 500 }}>Presión Mín</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ color: '#ff9800' }}>{maxMinData.pressureMin} cmH₂O</Typography>
                  </Box>
                  <Box textAlign="center" sx={{ minWidth: '110px' }}>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 500 }}>Flujo Máx</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ color: '#4caf50' }}>{maxMinData.flowMax} L/min</Typography>
                  </Box>
                  <Box textAlign="center" sx={{ minWidth: '110px' }}>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 500 }}>Flujo Mín</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ color: '#ff9800' }}>{maxMinData.flowMin} L/min</Typography>
                  </Box>
                  <Box textAlign="center" sx={{ minWidth: '110px' }}>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 500 }}>Vol Máx</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ color: '#4caf50' }}>{maxMinData.volumeMax} mL</Typography>
                  </Box>
                  <Box textAlign="center" sx={{ minWidth: '110px' }}>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 500 }}>Presión Media</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ color: '#76c7c0' }}>{maxMinData.pressureAvg} cmH₂O</Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </StyledPaper>
        </Box>

        <Box>
          <StyledPaper>
            <Typography variant="h6" gutterBottom sx={{ color: '#de0b24', fontWeight: 600 }}>
              Requisitos y Compatibilidad
            </Typography>
            <Box sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', p: 2, borderRadius: 1, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Box display="flex" gap={4} flexWrap="wrap">
                <Box flex="1" minWidth="200px">
                  <Typography variant="subtitle2" sx={{ color: '#4caf50', fontWeight: 600, mb: 1 }}>
                    ✓ Navegadores Compatibles
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">• Chrome 89+ (Recomendado)</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">• Microsoft Edge 89+</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">• Opera 75+</Typography>
                </Box>
                <Box flex="1" minWidth="200px">
                  <Typography variant="subtitle2" sx={{ color: '#ff9800', fontWeight: 600, mb: 1 }}>
                    ⚡ Hardware Compatible
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">• Arduino Uno/Nano/Mega</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">• Chips CH340/CP2102/FTDI</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">• Velocidad: 9600 baudios</Typography>
                </Box>
                <Box flex="1" minWidth="200px">
                  <Typography variant="subtitle2" sx={{ color: '#76c7c0', fontWeight: 600, mb: 1 }}>
                    ℹ️ Instrucciones
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">1. Conecta el dispositivo por USB</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">2. Selecciona puerto serie</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">3. Permite acceso en el navegador</Typography>
                </Box>
              </Box>
              <Box mt={2} p={1.5} sx={{ backgroundColor: 'serial' in navigator ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)', borderRadius: 1, border: `1px solid ${'serial' in navigator ? '#4caf50' : '#f44336'}` }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'serial' in navigator ? 'success.main' : 'error.main' }} />
                  <Typography variant="body2" sx={{ color: 'serial' in navigator ? '#4caf50' : '#f44336', fontWeight: 600 }}>
                    {'serial' in navigator ? '✓ Tu navegador es compatible con Web Serial API' : '✗ Tu navegador NO es compatible. Cambia a Chrome/Edge más reciente'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </StyledPaper>
        </Box>

        <Box mt={3}>
          <StyledPaper>
            <WhatsAppTransfer
              ventilatorData={ventilatorData}
              patientData={patientData}
              ventilationMode={ventilationMode}
              setNotification={setNotification}
            />
          </StyledPaper>
        </Box>
      </Container>
    </Box>
  );
};

export default ConnectionTabContent;
