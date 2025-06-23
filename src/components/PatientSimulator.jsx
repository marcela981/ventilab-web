import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Autocomplete,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import CalculateIcon from '@mui/icons-material/Calculate';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import ScienceIcon from '@mui/icons-material/Science';
import { getSimulatedPatientData } from '../utils/patientSimulatedData';

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: 'rgba(31, 31, 31, 0.8)',
  border: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(2),
}));

const PatientSimulator = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  
  // Estados reorganizados según los pasos
  const [patientBasicData, setPatientBasicData] = useState({
    // Datos básicos obligatorios
    nombre: '',
    apellido: '',
    tipoDocumento: '',
    documento: '',
    fechaNacimiento: '',
    edad: '',
    sexo: '',
    
    // Datos básicos no obligatorios
    segundoNombre: '',
    segundoApellido: '',
    direccion: '',
    telefonoResidencia: '',
    contactoEmergenciaNombre: '',
    contactoEmergenciaTelefono: '',
    
    // Datos antropomórficos obligatorios
    pesoActual: '',
    estatura: '',
    pesoCorporalIdeal: 0, // Calculado
    imc: 0, // Calculado
  });

  const [clinicalData, setClinicalData] = useState({
    // Signos vitales
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    tensionArterialSistolica: '',
    tensionArterialDiastolica: '',
    saturacionOxigeno: '',
    temperatura: '',
    
    // Examen físico
    inspeccionGeneral: '',
    palpacionTorax: '',
    percusionTorax: '',
    auscultacionPulmonar: '',
    auscultacionCardiaca: '',
    escalaGlasgow: '',
    
    // Otros datos clínicos (existentes)
    diagnostico: '',
    alergias: [],
    medicamentos: [],
  });

  const [respiratoryConditions, setRespiratoryConditions] = useState({
    asma: false,
    epoc: false,
    neumonia: false,
    covid19: false,
    ards: false,
  });

  const [diagnosticStudies, setDiagnosticStudies] = useState({
    // Imágenes Diagnósticas
    radiografiaTorax: '',
    radiografiaFile: null,
    ecografiaPulmonar: '',
    ecografiaFile: null,
    tacTorax: '',
    tacFile: null,
    
    // Análisis de Laboratorio
    gasesArteriales: '',
    hemogramaCompleto: '',
    electrolitosFuncionRenal: '',
    pruebasCoagulacion: '',
    
    // Formulación del Juicio Clínico
    diagnosticoPrincipal: '',
    diagnosticoSecundario: '',
    condicionAsociada: '',
    planAccionInmediato: '',
  });

  const [calculatedParams, setCalculatedParams] = useState({
    volumenTidal: 0,
    peepRecomendado: 5,
    fio2Inicial: 21,
    frecuenciaResp: 12,
  });

  const steps = [
    'Datos Básicos del Paciente',
    'Historia Clínica y Condiciones',
    'Estudios Diagnósticos y Formulación Clínica'
  ];

  const tiposDocumento = [
    'Cédula de Ciudadanía',
    'Tarjeta de Identidad',
    'Cédula de Extranjería',
    'Pasaporte',
    'Registro Civil',
    'Otro'
  ];

  const diagnoses = [
    'Insuficiencia Respiratoria Aguda',
    'Neumonía Bilateral',
    'COVID-19',
    'EPOC Exacerbado',
    'ARDS',
    'Edema Agudo de Pulmón',
    'Embolia Pulmonar',
    'Asma Severa',
  ];

  // Definir campos obligatorios por paso - mover fuera del componente o usar useMemo
  const requiredFieldsByStep = useMemo(() => ({
    0: ['nombre', 'apellido', 'tipoDocumento', 'documento', 'fechaNacimiento', 'edad', 'sexo', 'pesoActual', 'estatura'],
    1: [], // Agregar campos obligatorios del paso 1 cuando se implemente
    2: [], // Agregar campos obligatorios del paso 2 cuando se implemente
    3: [], // Agregar campos obligatorios del paso 3 cuando se implemente
  }), []);

  // Función para validar todos los campos obligatorios (solo para envío final)
  const validateAllRequiredFields = useCallback(() => {
    const allRequiredFields = [
      'nombre', 'apellido', 'tipoDocumento', 'documento', 
      'fechaNacimiento', 'edad', 'sexo', 'pesoActual', 'estatura'
    ];
    
    const errors = {};
    let isValid = true;

    allRequiredFields.forEach(field => {
      let value;
      if (field in patientBasicData) {
        value = patientBasicData[field];
      } else if (field in clinicalData) {
        value = clinicalData[field];
      } else if (field in respiratoryConditions) {
        value = respiratoryConditions[field];
      } else if (field in calculatedParams) {
        value = calculatedParams[field];
      }

      // Mejorar la validación para evitar false positives
      if (value === undefined || value === null) {
        errors[field] = 'Este campo es obligatorio';
        isValid = false;
      } else if (typeof value === 'string' && value.trim() === '') {
        errors[field] = 'Este campo es obligatorio';
        isValid = false;
      } else if (typeof value === 'number' && value === 0 && field !== 'pesoCorporalIdeal' && field !== 'imc') {
        errors[field] = 'Este campo es obligatorio';
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  }, [patientBasicData, clinicalData, respiratoryConditions, calculatedParams]);

  // Función para validar solo el paso actual (opcional, para mostrar errores)
  const validateCurrentStep = useCallback(() => {
    const requiredFields = requiredFieldsByStep[activeStep] || [];
    const errors = {};
    let isValid = true;

    requiredFields.forEach(field => {
      let value;
      if (field in patientBasicData) {
        value = patientBasicData[field];
      } else if (field in clinicalData) {
        value = clinicalData[field];
      } else if (field in respiratoryConditions) {
        value = respiratoryConditions[field];
      } else if (field in calculatedParams) {
        value = calculatedParams[field];
      }

      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors[field] = 'Este campo es obligatorio';
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  }, [activeStep, patientBasicData, clinicalData, respiratoryConditions, calculatedParams, requiredFieldsByStep]);

  const handleBasicDataChange = useCallback((field, value) => {
    setPatientBasicData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error de validación cuando el usuario empiece a escribir
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Calcular edad automáticamente desde fecha de nacimiento
    if (field === 'fechaNacimiento' && value) {
      const today = new Date();
      const birthDate = new Date(value);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        setPatientBasicData(prev => ({ ...prev, edad: age - 1 }));
      } else {
        setPatientBasicData(prev => ({ ...prev, edad: age }));
      }
    }
    
    // Calcular IMC y PCI automáticamente
    if (field === 'pesoActual' || field === 'estatura') {
      setTimeout(() => {
        setPatientBasicData(currentData => {
          const peso = field === 'pesoActual' ? parseFloat(value) : parseFloat(currentData.pesoActual);
          const estatura = field === 'estatura' ? parseFloat(value) : parseFloat(currentData.estatura);
          
          if (peso && estatura) {
            const estaturaMetros = estatura / 100;
            const imc = peso / Math.pow(estaturaMetros, 2);
            
            // Calcular Peso Corporal Ideal usando fórmula de Robinson
            let pci = 0;
            if (currentData.sexo === 'masculino') {
              pci = 52 + (1.9 * ((estatura - 152.4) / 2.54));
            } else if (currentData.sexo === 'femenino') {
              pci = 49 + (1.7 * ((estatura - 152.4) / 2.54));
            }
            
            const newData = {
              ...currentData,
              imc: imc.toFixed(1),
              pesoCorporalIdeal: pci > 0 ? pci.toFixed(1) : 0
            };
            
            // Calcular volumen tidal (7 ml/kg PCI)
            if (pci > 0) {
              setCalculatedParams(prev => ({ 
                ...prev, 
                volumenTidal: Math.round(pci * 7) 
              }));
            }
            
            return newData;
          }
          return currentData;
        });
      }, 0);
    }
    
    // Recalcular PCI si cambia el sexo
    if (field === 'sexo' && patientBasicData.estatura) {
      const estatura = parseFloat(patientBasicData.estatura);
      let pci = 0;
      
      if (value === 'masculino') {
        pci = 52 + (1.9 * ((estatura - 152.4) / 2.54));
      } else if (value === 'femenino') {
        pci = 49 + (1.7 * ((estatura - 152.4) / 2.54));
      }
      
      setPatientBasicData(prev => ({ 
        ...prev, 
        pesoCorporalIdeal: pci > 0 ? pci.toFixed(1) : 0
      }));
      
      if (pci > 0) {
        setCalculatedParams(prev => ({ 
          ...prev, 
          volumenTidal: Math.round(pci * 7) 
        }));
      }
    }
  }, [validationErrors, patientBasicData.estatura, patientBasicData.sexo]);

  const handleClinicalDataChange = useCallback((field, value) => {
    setClinicalData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error de validación cuando el usuario empiece a escribir
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [validationErrors]);

  const handleDiagnosticDataChange = useCallback((field, value) => {
    setDiagnosticStudies(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error de validación cuando el usuario empiece a escribir
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [validationErrors]);

  const handleFileChange = useCallback((field, file) => {
    setDiagnosticStudies(prev => ({ ...prev, [field]: file }));
  }, []);

  const handleNextStep = useCallback(() => {
    setActiveStep(prev => prev + 1);
    setValidationErrors({}); // Limpiar errores al avanzar
  }, []);

  const handlePreviousStep = useCallback(() => {
    setActiveStep(prev => prev - 1);
    setValidationErrors({}); // Limpiar errores al retroceder
  }, []);

  const sendToMonitoring = useCallback(() => {
    // Validar todos los campos obligatorios antes de enviar
    if (!validateAllRequiredFields()) {
      alert('Por favor, complete todos los campos obligatorios antes de enviar al monitoreo. Revise los campos marcados en rojo.');
      
      // Ir al primer paso que tiene errores
      const hasErrors0 = requiredFieldsByStep[0].some(field => validationErrors[field]);
      if (hasErrors0) {
        setActiveStep(0);
      }
      return;
    }

    console.log('Enviando configuración al monitoreo:', {
      patientBasicData,
      clinicalData,
      respiratoryConditions,
      diagnosticStudies,
      calculatedParams,
    });
    alert('Configuración del paciente enviada al módulo de monitoreo');
    setValidationErrors({}); // Limpiar errores tras envío exitoso
  }, [patientBasicData, clinicalData, respiratoryConditions, diagnosticStudies, calculatedParams, validateAllRequiredFields, requiredFieldsByStep, validationErrors]);

  // Función para cargar datos simulados
  const loadSimulatedData = useCallback(() => {
    const simulatedData = getSimulatedPatientData();
    
    setPatientBasicData(simulatedData.patientBasicData);
    setClinicalData(simulatedData.clinicalData);
    setRespiratoryConditions(simulatedData.respiratoryConditions);
    setDiagnosticStudies(simulatedData.diagnosticStudies);
    setCalculatedParams(simulatedData.calculatedParams);
    
    // Limpiar errores de validación
    setValidationErrors({});
    
    alert('¡Datos simulados cargados exitosamente! Todos los campos han sido completados con información de ejemplo.');
    console.log('Datos simulados cargados:', simulatedData);
  }, []);

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            {/* Botón para cargar datos simulados */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                variant="contained"
                startIcon={<ScienceIcon />}
                onClick={loadSimulatedData}
                sx={{
                  backgroundColor: '#2e7d32',
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: '#1b5e20',
                  },
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(46, 125, 50, 0.4)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Ingresar Datos Simulados
              </Button>
            </Box>
            
            {/* Caja para Datos Básicos */}
            <StyledCard sx={{ mb: 3 }}>
              <CardContent sx={{ p: 1, pl: 2 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#de0b24', fontWeight: 'bold' }}>
                  Datos Básicos
                </Typography>
                
                <Grid container spacing={3}>
                  {/* Fila 1: Información personal */}
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Nombre *"
                      value={patientBasicData.nombre}
                      onChange={(e) => handleBasicDataChange('nombre', e.target.value)}
                      size="small"
                      required
                      error={!!validationErrors.nombre}
                      helperText={validationErrors.nombre}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Segundo Nombre"
                      value={patientBasicData.segundoNombre}
                      onChange={(e) => handleBasicDataChange('segundoNombre', e.target.value)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Apellido *"
                      value={patientBasicData.apellido}
                      onChange={(e) => handleBasicDataChange('apellido', e.target.value)}
                      size="small"
                      required
                      error={!!validationErrors.apellido}
                      helperText={validationErrors.apellido}
                    />
                  </Grid>

                  {/* Fila 2: Más información personal */}
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Segundo Apellido"
                      value={patientBasicData.segundoApellido}
                      onChange={(e) => handleBasicDataChange('segundoApellido', e.target.value)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small" required error={!!validationErrors.tipoDocumento}>
                      <InputLabel>Tipo de Documento *</InputLabel>
                      <Select
                        value={patientBasicData.tipoDocumento}
                        label="Tipo de Documento *"
                        onChange={(e) => handleBasicDataChange('tipoDocumento', e.target.value)}
                      >
                        {tiposDocumento.map((tipo) => (
                          <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                        ))}
                      </Select>
                      {validationErrors.tipoDocumento && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                          {validationErrors.tipoDocumento}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Número de Documento *"
                      value={patientBasicData.documento}
                      onChange={(e) => handleBasicDataChange('documento', e.target.value)}
                      size="small"
                      required
                      error={!!validationErrors.documento}
                      helperText={validationErrors.documento}
                    />
                  </Grid>

                  {/* Fila 3: Información demográfica */}
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Fecha de Nacimiento *"
                      type="date"
                      value={patientBasicData.fechaNacimiento}
                      onChange={(e) => handleBasicDataChange('fechaNacimiento', e.target.value)}
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      required
                      error={!!validationErrors.fechaNacimiento}
                      helperText={validationErrors.fechaNacimiento}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Edad *"
                      type="number"
                      value={patientBasicData.edad}
                      onChange={(e) => handleBasicDataChange('edad', e.target.value)}
                      size="small"
                      inputProps={{ min: 0, max: 120 }}
                      InputProps={{ readOnly: patientBasicData.fechaNacimiento !== '' }}
                      helperText={patientBasicData.fechaNacimiento ? "Auto-calculado" : validationErrors.edad}
                      required
                      error={!!validationErrors.edad}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small" required error={!!validationErrors.sexo}>
                      <InputLabel>Sexo *</InputLabel>
                      <Select
                        value={patientBasicData.sexo}
                        label="Sexo *"
                        onChange={(e) => handleBasicDataChange('sexo', e.target.value)}
                      >
                        <MenuItem value="masculino">Masculino</MenuItem>
                        <MenuItem value="femenino">Femenino</MenuItem>
                        <MenuItem value="otro">Otro</MenuItem>
                      </Select>
                      {validationErrors.sexo && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                          {validationErrors.sexo}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Teléfono de Residencia"
                      value={patientBasicData.telefonoResidencia}
                      onChange={(e) => handleBasicDataChange('telefonoResidencia', e.target.value)}
                      size="small"
                    />
                  </Grid>

                  {/* Separador sutil */}
                  <Grid item xs={12}>
                    <Box sx={{ mt: 2, mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        Información de Contacto
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Fila 4: Contacto y dirección */}
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Dirección de Residencia"
                      value={patientBasicData.direccion}
                      onChange={(e) => handleBasicDataChange('direccion', e.target.value)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Contacto de Emergencia (Nombre)"
                      value={patientBasicData.contactoEmergenciaNombre}
                      onChange={(e) => handleBasicDataChange('contactoEmergenciaNombre', e.target.value)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Contacto de Emergencia (Teléfono)"
                      value={patientBasicData.contactoEmergenciaTelefono}
                      onChange={(e) => handleBasicDataChange('contactoEmergenciaTelefono', e.target.value)}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>

            {/* Caja separada para Datos Antropomórficos */}
            <StyledCard>
              <CardContent sx={{ p: 1, pl: 2 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#de0b24', fontWeight: 'bold' }}>
                  Datos Antropomórficos
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Peso Actual (kg) *"
                      type="number"
                      value={patientBasicData.pesoActual}
                      onChange={(e) => handleBasicDataChange('pesoActual', e.target.value)}
                      size="small"
                      inputProps={{ min: 1, max: 300, step: 0.1 }}
                      helperText={validationErrors.pesoActual || "Estimado o medido"}
                      required
                      error={!!validationErrors.pesoActual}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Estatura (cm) *"
                      type="number"
                      value={patientBasicData.estatura}
                      onChange={(e) => handleBasicDataChange('estatura', e.target.value)}
                      size="small"
                      inputProps={{ min: 30, max: 250 }}
                      required
                      error={!!validationErrors.estatura}
                      helperText={validationErrors.estatura}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Peso Corporal Ideal (kg)"
                      value={patientBasicData.pesoCorporalIdeal}
                      size="small"
                      InputProps={{ 
                        readOnly: true,
                        style: { backgroundColor: 'rgba(76, 175, 80, 0.08)' }
                      }}
                      helperText="Auto-calculado"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="IMC"
                      value={patientBasicData.imc}
                      size="small"
                      InputProps={{ 
                        readOnly: true,
                        style: { backgroundColor: 'rgba(76, 175, 80, 0.08)' }
                      }}
                      helperText={
                        patientBasicData.imc < 18.5 ? 'Bajo peso' :
                        patientBasicData.imc < 25 ? 'Normal' :
                        patientBasicData.imc < 30 ? 'Sobrepeso' : 'Obesidad'
                      }
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>
          </Box>
        );
      case 1:
        return (
          <Box>
            {/* Caja para Signos Vitales */}
            <StyledCard sx={{ mb: 3 }}>
              <CardContent sx={{ p: 1, pl: 2 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#de0b24', fontWeight: 'bold' }}>
                  Signos Vitales
                </Typography>
                
                <Grid container spacing={3}>
                  {/* Fila 1: Frecuencias */}
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Frecuencia Cardíaca (FC)"
                      type="number"
                      value={clinicalData.frecuenciaCardiaca}
                      onChange={(e) => handleClinicalDataChange('frecuenciaCardiaca', e.target.value)}
                      size="small"
                      inputProps={{ min: 0, max: 300 }}
                      helperText="latidos/min"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Frecuencia Respiratoria (FR)"
                      type="number"
                      value={clinicalData.frecuenciaRespiratoria}
                      onChange={(e) => handleClinicalDataChange('frecuenciaRespiratoria', e.target.value)}
                      size="small"
                      inputProps={{ min: 0, max: 60 }}
                      helperText="resp/min"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Saturación de Oxígeno (SpO₂)"
                      type="number"
                      value={clinicalData.saturacionOxigeno}
                      onChange={(e) => handleClinicalDataChange('saturacionOxigeno', e.target.value)}
                      size="small"
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      helperText="%"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Temperatura"
                      type="number"
                      value={clinicalData.temperatura}
                      onChange={(e) => handleClinicalDataChange('temperatura', e.target.value)}
                      size="small"
                      inputProps={{ min: 30, max: 45, step: 0.1 }}
                      helperText="°C"
                    />
                  </Grid>

                  {/* Fila 2: Tensión Arterial */}
                  <Grid item xs={12} md={6}>
                    <Box display="flex" gap={1} alignItems="center">
                      <TextField
                        label="TA Sistólica"
                        type="number"
                        value={clinicalData.tensionArterialSistolica}
                        onChange={(e) => handleClinicalDataChange('tensionArterialSistolica', e.target.value)}
                        size="small"
                        inputProps={{ min: 0, max: 300 }}
                        sx={{ flex: 1 }}
                      />
                      <Typography variant="body2" sx={{ mx: 1 }}>/</Typography>
                      <TextField
                        label="TA Diastólica"
                        type="number"
                        value={clinicalData.tensionArterialDiastolica}
                        onChange={(e) => handleClinicalDataChange('tensionArterialDiastolica', e.target.value)}
                        size="small"
                        inputProps={{ min: 0, max: 200 }}
                        sx={{ flex: 1 }}
                      />
                      <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                        mmHg
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>

            {/* Caja separada para Examen Físico */}
            <StyledCard>
              <CardContent sx={{ p: 1, pl: 2 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#de0b24', fontWeight: 'bold' }}>
                  Examen Físico
                </Typography>
                
                <Grid container spacing={3}>
                  {/* Fila 1: Inspección General (campo grande) */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Inspección General"
                      multiline
                      rows={3}
                      value={clinicalData.inspeccionGeneral}
                      onChange={(e) => handleClinicalDataChange('inspeccionGeneral', e.target.value)}
                      size="small"
                      helperText="Describe el estado general del paciente, postura, coloración, estado de conciencia, etc."
                    />
                  </Grid>

                  {/* Fila 2: Palpación y Percusión */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Palpación del Tórax"
                      multiline
                      rows={2}
                      value={clinicalData.palpacionTorax}
                      onChange={(e) => handleClinicalDataChange('palpacionTorax', e.target.value)}
                      size="small"
                      helperText="Expansión torácica, frémito vocal, etc."
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Percusión del Tórax"
                      multiline
                      rows={2}
                      value={clinicalData.percusionTorax}
                      onChange={(e) => handleClinicalDataChange('percusionTorax', e.target.value)}
                      size="small"
                      helperText="Matidez, timpanismo, resonancia, etc."
                    />
                  </Grid>

                  {/* Fila 3: Auscultaciones */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Auscultación Pulmonar"
                      multiline
                      rows={2}
                      value={clinicalData.auscultacionPulmonar}
                      onChange={(e) => handleClinicalDataChange('auscultacionPulmonar', e.target.value)}
                      size="small"
                      helperText="Ruidos respiratorios, crepitantes, sibilancias, etc."
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Auscultación Cardíaca"
                      multiline
                      rows={2}
                      value={clinicalData.auscultacionCardiaca}
                      onChange={(e) => handleClinicalDataChange('auscultacionCardiaca', e.target.value)}
                      size="small"
                      helperText="Ruidos cardíacos, soplos, galope, etc."
                    />
                  </Grid>

                  {/* Fila 4: Estado Neurológico */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Estado Neurológico (Escala de Glasgow)"
                      type="number"
                      value={clinicalData.escalaGlasgow}
                      onChange={(e) => handleClinicalDataChange('escalaGlasgow', e.target.value)}
                      size="small"
                      inputProps={{ min: 3, max: 15 }}
                      helperText="Puntuación de 3-15 (Normal: 15)"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>
          </Box>
        );
      case 2:
        return (
          <Box>
            {/* Caja para Imágenes Diagnósticas */}
            <StyledCard sx={{ mb: 3 }}>
              <CardContent sx={{ p: 1, pl: 2 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#de0b24', fontWeight: 'bold' }}>
                  <ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Imágenes Diagnósticas
                </Typography>
                
                <Grid container spacing={3}>
                  {/* Radiografía de Tórax */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Radiografía de Tórax (Portátil, AP)
                    </Typography>
                    <TextField
                      fullWidth
                      label="Descripción de hallazgos"
                      multiline
                      rows={3}
                      value={diagnosticStudies.radiografiaTorax}
                      onChange={(e) => handleDiagnosticDataChange('radiografiaTorax', e.target.value)}
                      size="small"
                      sx={{ mb: 2 }}
                      helperText="Ej: Opacidades bilaterales, consolidación, derrame pleural..."
                    />
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUploadIcon />}
                      fullWidth
                      sx={{ 
                        color: '#de0b24', 
                        borderColor: '#de0b24',
                        '&:hover': { borderColor: '#b8001f', backgroundColor: 'rgba(222, 11, 36, 0.05)' }
                      }}
                    >
                      Cargar Imagen de Radiografía
                      <input
                        type="file"
                        hidden
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange('radiografiaFile', e.target.files[0])}
                      />
                    </Button>
                    {diagnosticStudies.radiografiaFile && (
                      <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                        ✓ Archivo cargado: {diagnosticStudies.radiografiaFile.name}
                      </Typography>
                    )}
                  </Grid>

                  {/* Ecografía Pulmonar */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Ecografía Pulmonar (FAST/eFAST)
                    </Typography>
                    <TextField
                      fullWidth
                      label="Descripción de hallazgos"
                      multiline
                      rows={3}
                      value={diagnosticStudies.ecografiaPulmonar}
                      onChange={(e) => handleDiagnosticDataChange('ecografiaPulmonar', e.target.value)}
                      size="small"
                      sx={{ mb: 2 }}
                      helperText="Ej: Líneas B, consolidaciones, derrame..."
                    />
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUploadIcon />}
                      fullWidth
                      sx={{ 
                        color: '#de0b24', 
                        borderColor: '#de0b24',
                        '&:hover': { borderColor: '#b8001f', backgroundColor: 'rgba(222, 11, 36, 0.05)' }
                      }}
                    >
                      Cargar Imagen de Ecografía
                      <input
                        type="file"
                        hidden
                        accept="image/*,.pdf,video/*"
                        onChange={(e) => handleFileChange('ecografiaFile', e.target.files[0])}
                      />
                    </Button>
                    {diagnosticStudies.ecografiaFile && (
                      <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                        ✓ Archivo cargado: {diagnosticStudies.ecografiaFile.name}
                      </Typography>
                    )}
                  </Grid>

                  {/* TAC de Tórax */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Tomografía Axial Computarizada (TAC) de Tórax
                    </Typography>
                    <TextField
                      fullWidth
                      label="Descripción de hallazgos"
                      multiline
                      rows={3}
                      value={diagnosticStudies.tacTorax}
                      onChange={(e) => handleDiagnosticDataChange('tacTorax', e.target.value)}
                      size="small"
                      sx={{ mb: 2 }}
                      helperText="Ej: Vidrio esmerilado, patrón en empedrado, fibrosis..."
                    />
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUploadIcon />}
                      fullWidth
                      sx={{ 
                        color: '#de0b24', 
                        borderColor: '#de0b24',
                        '&:hover': { borderColor: '#b8001f', backgroundColor: 'rgba(222, 11, 36, 0.05)' }
                      }}
                    >
                      Cargar Imágenes de TAC
                      <input
                        type="file"
                        hidden
                        accept="image/*,.pdf,.dcm"
                        multiple
                        onChange={(e) => handleFileChange('tacFile', e.target.files[0])}
                      />
                    </Button>
                    {diagnosticStudies.tacFile && (
                      <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                        ✓ Archivo cargado: {diagnosticStudies.tacFile.name}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>

            {/* Caja para Análisis de Laboratorio */}
            <StyledCard sx={{ mb: 3 }}>
              <CardContent sx={{ p: 1, pl: 2 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#de0b24', fontWeight: 'bold' }}>
                  <LocalHospitalIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Análisis de Laboratorio
                </Typography>
                
                <Grid container spacing={3}>
                  {/* Gases Arteriales */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Gases Arteriales"
                      multiline
                      rows={4}
                      value={diagnosticStudies.gasesArteriales}
                      onChange={(e) => handleDiagnosticDataChange('gasesArteriales', e.target.value)}
                      size="small"
                      helperText="pH, PaO2, PaCO2, HCO3-, BE, SaO2, FiO2, PaO2/FiO2"
                      placeholder="Ej: pH: 7.35, PaO2: 65 mmHg, PaCO2: 45 mmHg, HCO3-: 22 mEq/L, BE: -2, SaO2: 92%, FiO2: 40%, PaO2/FiO2: 162"
                    />
                  </Grid>

                  {/* Hemograma Completo */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Hemograma Completo"
                      multiline
                      rows={4}
                      value={diagnosticStudies.hemogramaCompleto}
                      onChange={(e) => handleDiagnosticDataChange('hemogramaCompleto', e.target.value)}
                      size="small"
                      helperText="Hb, Hto, Leucocitos, Neutrófilos, Linfocitos, Plaquetas"
                      placeholder="Ej: Hb: 12.5 g/dL, Hto: 37%, Leucocitos: 12,000/µL, Neutrófilos: 85%, Linfocitos: 10%, Plaquetas: 250,000/µL"
                    />
                  </Grid>

                  {/* Electrolitos y Función Renal */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Electrolitos y Función Renal"
                      multiline
                      rows={4}
                      value={diagnosticStudies.electrolitosFuncionRenal}
                      onChange={(e) => handleDiagnosticDataChange('electrolitosFuncionRenal', e.target.value)}
                      size="small"
                      helperText="Na+, K+, Cl-, Creatinina, BUN, Glucosa"
                      placeholder="Ej: Na+: 140 mEq/L, K+: 4.2 mEq/L, Cl-: 102 mEq/L, Creatinina: 1.1 mg/dL, BUN: 18 mg/dL, Glucosa: 110 mg/dL"
                    />
                  </Grid>

                  {/* Pruebas de Coagulación */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Pruebas de Coagulación"
                      multiline
                      rows={4}
                      value={diagnosticStudies.pruebasCoagulacion}
                      onChange={(e) => handleDiagnosticDataChange('pruebasCoagulacion', e.target.value)}
                      size="small"
                      helperText="PT, PTT, INR, Fibrinógeno, Dímero D"
                      placeholder="Ej: PT: 13 seg, PTT: 28 seg, INR: 1.1, Fibrinógeno: 350 mg/dL, Dímero D: 0.8 µg/mL"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>

            {/* Caja para Formulación del Juicio Clínico */}
            <StyledCard>
              <CardContent sx={{ p: 1, pl: 2 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#de0b24', fontWeight: 'bold' }}>
                  <MonitorHeartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Formulación del Juicio Clínico (Diagnósticos)
                </Typography>
                
                <Grid container spacing={3}>
                  {/* Diagnóstico Principal */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Diagnóstico Principal"
                      multiline
                      rows={3}
                      value={diagnosticStudies.diagnosticoPrincipal}
                      onChange={(e) => handleDiagnosticDataChange('diagnosticoPrincipal', e.target.value)}
                      size="small"
                      helperText="Diagnóstico primario según la evaluación clínica y estudios realizados"
                      placeholder="Ej: Insuficiencia Respiratoria Aguda Hipoxémica secundaria a Neumonía Bilateral por SARS-CoV-2"
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  {/* Diagnóstico Secundario */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Diagnóstico Secundario"
                      multiline
                      rows={4}
                      value={diagnosticStudies.diagnosticoSecundario}
                      onChange={(e) => handleDiagnosticDataChange('diagnosticoSecundario', e.target.value)}
                      size="small"
                      helperText="Diagnósticos adicionales o comorbilidades relevantes"
                      placeholder="Ej: Hipertensión Arterial, Diabetes Mellitus tipo 2, Obesidad grado II"
                    />
                  </Grid>

                  {/* Condición Asociada */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Condición Asociada"
                      multiline
                      rows={4}
                      value={diagnosticStudies.condicionAsociada}
                      onChange={(e) => handleDiagnosticDataChange('condicionAsociada', e.target.value)}
                      size="small"
                      helperText="Condiciones que complican o se relacionan con el cuadro actual"
                      placeholder="Ej: Síndrome de Respuesta Inflamatoria Sistémica (SIRS), Riesgo de ARDS"
                    />
                  </Grid>

                  {/* Plan de Acción Inmediato */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Plan de Acción Inmediato"
                      multiline
                      rows={5}
                      value={diagnosticStudies.planAccionInmediato}
                      onChange={(e) => handleDiagnosticDataChange('planAccionInmediato', e.target.value)}
                      size="small"
                      helperText="Plan terapéutico y medidas inmediatas a implementar"
                      placeholder="Ej: 1) Ventilación mecánica invasiva con estrategia de protección pulmonar, 2) Posición prono, 3) Sedoanalgesia, 4) Monitoreo hemodinámico, 5) Antibioticoterapia empírica, 6) Soporte nutricional"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box display="flex" flexDirection="row" alignItems="flex-start" mb={2} ml={2} sx={{ minHeight: '100vh' }}>
      {/* Imágenes del header */}
      <Box display="flex" flexDirection="column" alignItems="left">
        <img src="/images/logo-univalle.svg" alt="Univalle" width={250} height={42} style={{ marginBottom: 0 }} />
        <img src="/images/logo.png" alt="VentyLab" width={220} height={110} />
      </Box>
      
      {/* Contenido principal del simulador */}
      <Container maxWidth="xl" sx={{ py: 3, paddingBottom: '100px', ml: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h4" sx={{ mb: 3, color: '#de0b24', fontWeight: 'bold' }}>
          <PersonIcon sx={{ mr: 2, fontSize: 40 }} />
          Simulador de Paciente
        </Typography>

        {/* Barra de pasos */}
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': {
                      color: index === activeStep ? '#de0b24' : 'text.secondary',
                      fontWeight: index === activeStep ? 'bold' : 'normal',
                    },
                    '& .MuiStepIcon-root': {
                      color: index === activeStep ? '#de0b24' : 'text.secondary',
                    },
                    '& .MuiStepIcon-root.Mui-completed': {
                      color: '#4caf50',
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Contenido del paso actual */}
        <StyledCard sx={{ flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            {renderStepContent(activeStep)}
          </CardContent>
        </StyledCard>

        {/* Botones de navegación */}
        <Box display="flex" justifyContent="space-between" mt={3}>
          <Button
            disabled={activeStep === 0}
            onClick={handlePreviousStep}
            sx={{ color: '#de0b24', borderColor: '#de0b24' }}
          >
            Anterior
          </Button>
          
          <Box display="flex" gap={2}>
            {activeStep === steps.length - 1 ? (
              <>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  sx={{ 
                    color: '#de0b24', 
                    borderColor: '#de0b24',
                    '&:hover': { 
                      borderColor: '#b8001f', 
                      backgroundColor: 'rgba(222, 11, 36, 0.05)' 
                    }
                  }}
                >
                  Guardar Perfil
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={sendToMonitoring}
                  sx={{ 
                    backgroundColor: '#de0b24',
                    '&:hover': { backgroundColor: '#b8001f' }
                  }}
                >
                  Enviar al Monitoreo
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  onClick={handleNextStep}
                  sx={{ 
                    backgroundColor: '#de0b24',
                    '&:hover': { 
                      backgroundColor: '#b8001f'
                    }
                  }}
                >
                  Siguiente
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  sx={{ 
                    color: '#de0b24', 
                    borderColor: '#de0b24',
                    '&:hover': { 
                      borderColor: '#b8001f', 
                      backgroundColor: 'rgba(222, 11, 36, 0.05)' 
                    }
                  }}
                >
                  Guardar Perfil
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default PatientSimulator; 