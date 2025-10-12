import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Paper,
} from '@mui/material';

const ConnectionPanel = ({ isConnected, onConnect, onDisconnect }) => {
  const [port, setPort] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [availablePorts, setAvailablePorts] = useState([]);

  const baudRates = [9600, 19200, 38400, 57600, 115200];

  const handleConnect = () => {
    if (port && baudRate) {
      onConnect(port, baudRate);
    }
  };

  const handleDisconnect = () => {
    onDisconnect();
  };

  const scanPorts = async () => {
    // Simulación de escaneo de puertos
    // En una implementación real, esto usaría la Web Serial API
    const mockPorts = ['COM1', 'COM2', 'COM3', 'COM4'];
    setAvailablePorts(mockPorts);
  };

  return (
    <Paper sx={{ 
      p: 2, 
      minWidth: 300,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      color: '#e8f4fd',
      boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
    }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#e8f4fd' }}>
        Conexión Serial
      </Typography>
      
      {isConnected ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            Conectado a {port} @ {baudRate} baud
          </Alert>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDisconnect}
            fullWidth
          >
            Desconectar
          </Button>
        </Box>
      ) : (
        <Box>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Puerto</InputLabel>
            <Select
              value={port}
              label="Puerto"
              onChange={(e) => setPort(e.target.value)}
            >
              {availablePorts.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Velocidad (Baud)</InputLabel>
            <Select
              value={baudRate}
              label="Velocidad (Baud)"
              onChange={(e) => setBaudRate(e.target.value)}
            >
              {baudRates.map((rate) => (
                <MenuItem key={rate} value={rate}>{rate}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              onClick={scanPorts}
              sx={{ flex: 1 }}
            >
              Escanear Puertos
            </Button>
            <Button 
              variant="contained" 
              onClick={handleConnect}
              disabled={!port}
              sx={{ flex: 1 }}
            >
              Conectar
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default ConnectionPanel;
