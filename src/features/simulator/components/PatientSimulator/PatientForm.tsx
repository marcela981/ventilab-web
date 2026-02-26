import {
  Box,
  Grid,
  CardContent,
  Typography,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Button,
  Stack,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { PatientCondition } from '@/contracts/patient.contracts';
import {
  StyledCard,
  SectionTitle,
  CalculatedBox,
  CompactTextField,
  ReadonlyField,
  StyledFormControl,
  menuPaperSx,
  col,
} from './PatientForm.styles';
import type { PatientFormState, CalculatedParams, ValidationErrors } from './usePatientForm';

// =============================================================================
// Types
// =============================================================================

interface PatientFormProps {
  activeStep: number;
  formState: PatientFormState;
  calculated: CalculatedParams | null;
  errors: ValidationErrors;
  onFieldChange: <K extends keyof PatientFormState>(field: K, value: PatientFormState[K]) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  onReset: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const STEPS = ['Paciente y Condición', 'Estado Actual y Resumen'];

// Shared MenuProps for all Selects — opaque dark background prevents transparency
const MENU_PROPS = { PaperProps: { sx: menuPaperSx } };

const CONDITIONS: { value: PatientCondition; label: string }[] = [
  { value: PatientCondition.HEALTHY,                  label: 'Sano / Control' },
  { value: PatientCondition.ARDS_MILD,                label: 'SDRA Leve (PaO₂/FiO₂ 200–300)' },
  { value: PatientCondition.ARDS_MODERATE,            label: 'SDRA Moderado (PaO₂/FiO₂ 100–200)' },
  { value: PatientCondition.ARDS_SEVERE,              label: 'SDRA Severo (PaO₂/FiO₂ < 100)' },
  { value: PatientCondition.COPD_MILD,                label: 'EPOC Leve' },
  { value: PatientCondition.COPD_MODERATE,            label: 'EPOC Moderado' },
  { value: PatientCondition.COPD_SEVERE,              label: 'EPOC Severo' },
  { value: PatientCondition.ASTHMA_MILD,              label: 'Asma Leve' },
  { value: PatientCondition.ASTHMA_MODERATE,          label: 'Asma Moderada' },
  { value: PatientCondition.ASTHMA_SEVERE,            label: 'Asma Severa' },
  { value: PatientCondition.PNEUMONIA,                label: 'Neumonía' },
  { value: PatientCondition.PULMONARY_EDEMA,          label: 'Edema Pulmonar Agudo' },
  { value: PatientCondition.PNEUMOTHORAX,             label: 'Neumotórax' },
  { value: PatientCondition.OBESITY_HYPOVENTILATION,  label: 'Síndrome de Hipoventilación' },
  { value: PatientCondition.NEUROMUSCULAR,            label: 'Enfermedad Neuromuscular' },
  { value: PatientCondition.POST_SURGICAL,            label: 'Postquirúrgico' },
];

const DIFFICULTY_LEVELS: {
  value: PatientFormState['difficultyLevel'];
  label: string;
  color: 'success' | 'warning' | 'error';
}[] = [
  { value: 'BASIC',        label: 'Básico',     color: 'success' },
  { value: 'INTERMEDIATE', label: 'Intermedio', color: 'warning' },
  { value: 'ADVANCED',     label: 'Avanzado',   color: 'error' },
];

const BREATHING_PATTERNS: { value: PatientFormState['breathingPattern']; label: string }[] = [
  { value: 'normal',      label: 'Normal' },
  { value: 'tachypneic',  label: 'Taquipneico' },
  { value: 'bradypneic',  label: 'Bradipneico' },
  { value: 'irregular',   label: 'Irregular' },
  { value: 'paradoxical', label: 'Paradójico' },
];

function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return 'Bajo peso';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Sobrepeso';
  return 'Obesidad';
}

// =============================================================================
// Sub-components
// =============================================================================

// Step 1 — Patient basics + clinical condition
function StepPatient({
  formState,
  calculated,
  errors,
  onFieldChange,
}: Pick<PatientFormProps, 'formState' | 'calculated' | 'errors' | 'onFieldChange'>) {
  function handleAllergyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const input = e.currentTarget as HTMLInputElement;
    if (e.key === 'Enter' && input.value.trim()) {
      onFieldChange('allergies', [...formState.allergies, input.value.trim()]);
      input.value = '';
      e.preventDefault();
    }
  }

  return (
    <>
      {/* Datos básicos del paciente */}
      <StyledCard>
        <CardContent>
          <SectionTitle>
            <PersonIcon />
            <Typography variant="h6">Datos del Paciente</Typography>
          </SectionTitle>

          <Grid container spacing={2.5}>
            {/* Nombre */}
            <Grid size={{ xs: 12, md: 6 }}>
              <CompactTextField
                fullWidth
                label="Nombre (opcional)"
                value={formState.name}
                onChange={e => onFieldChange('name', e.target.value)}
                placeholder="Identificación del paciente"
              />
            </Grid>

            {/* Edad */}
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <CompactTextField
                fullWidth required
                type="number"
                label="Edad"
                value={formState.age}
                onChange={e => onFieldChange('age', e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 18, max: 100 }}
                error={!!errors.age}
                helperText={errors.age}
                InputProps={{
                  endAdornment: <InputAdornment position="end">años</InputAdornment>,
                }}
              />
            </Grid>

            {/* Sexo */}
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StyledFormControl fullWidth required error={!!errors.gender}>
                <InputLabel>Sexo</InputLabel>
                <Select
                  value={formState.gender}
                  label="Sexo"
                  onChange={e => onFieldChange('gender', e.target.value as PatientFormState['gender'])}
                  MenuProps={MENU_PROPS}
                >
                  <MenuItem value="masculino">Masculino</MenuItem>
                  <MenuItem value="femenino">Femenino</MenuItem>
                </Select>
                {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
              </StyledFormControl>
            </Grid>

            {/* Peso */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <CompactTextField
                fullWidth required
                type="number"
                label="Peso actual"
                value={formState.weight}
                onChange={e => onFieldChange('weight', e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 30, max: 250, step: 0.5 }}
                error={!!errors.weight}
                helperText={errors.weight || 'Estimado o medido'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                }}
              />
            </Grid>

            {/* Estatura */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <CompactTextField
                fullWidth required
                type="number"
                label="Estatura"
                value={formState.height}
                onChange={e => onFieldChange('height', e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 100, max: 220 }}
                error={!!errors.height}
                helperText={errors.height}
                InputProps={{
                  endAdornment: <InputAdornment position="end">cm</InputAdornment>,
                }}
              />
            </Grid>

            {/* Campos calculados — siempre una fila completa bien distribuida */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <ReadonlyField
                fullWidth
                label="Peso Corp. Ideal (PCI)"
                value={calculated ? `${calculated.idealBodyWeight}` : '—'}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                }}
                helperText="Auto-calculado · ARDSNet"
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 4 }}>
              <ReadonlyField
                fullWidth
                label="IMC"
                value={calculated ? `${calculated.bmi}` : '—'}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="end">kg/m²</InputAdornment>,
                }}
                helperText={calculated ? bmiLabel(calculated.bmi) : ''}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 4 }}>
              <ReadonlyField
                fullWidth
                label="VT predicho"
                value={
                  calculated
                    ? `${calculated.predictedTidalVolume.min} – ${calculated.predictedTidalVolume.max}`
                    : '—'
                }
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="end">ml</InputAdornment>,
                }}
                helperText="6 – 8 ml/kg PCI"
              />
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>

      {/* Condición clínica */}
      <StyledCard>
        <CardContent>
          <SectionTitle>
            <LocalHospitalIcon />
            <Typography variant="h6">Condición Clínica</Typography>
          </SectionTitle>

          <Grid container spacing={2.5}>
            {/* Condición — ancha porque los labels son descriptivos */}
            <Grid size={{ xs: 12, sm: 8 }}>
              <StyledFormControl fullWidth required error={!!errors.condition}>
                <InputLabel>Condición Principal</InputLabel>
                <Select
                  value={formState.condition}
                  label="Condición Principal"
                  onChange={e => onFieldChange('condition', e.target.value as PatientCondition)}
                  MenuProps={MENU_PROPS}
                >
                  {CONDITIONS.map(c => (
                    <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                  ))}
                </Select>
                {errors.condition && <FormHelperText>{errors.condition}</FormHelperText>}
              </StyledFormControl>
            </Grid>

            {/* Dificultad */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <StyledFormControl fullWidth>
                <InputLabel>Dificultad</InputLabel>
                <Select
                  value={formState.difficultyLevel}
                  label="Dificultad"
                  onChange={e =>
                    onFieldChange('difficultyLevel', e.target.value as PatientFormState['difficultyLevel'])
                  }
                  MenuProps={MENU_PROPS}
                  renderValue={v => {
                    const d = DIFFICULTY_LEVELS.find(l => l.value === v);
                    return d ? (
                      <Chip label={d.label} size="small" color={d.color} sx={{ height: 22 }} />
                    ) : v;
                  }}
                >
                  {DIFFICULTY_LEVELS.map(d => (
                    <MenuItem key={d.value} value={d.value}>
                      <Stack direction="row" alignItems="center" gap={1.5}>
                        <Chip label={d.label} size="small" color={d.color} sx={{ minWidth: 88 }} />
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </StyledFormControl>
            </Grid>

            {/* Diagnóstico / Resumen */}
            <Grid size={12}>
              <CompactTextField
                fullWidth multiline rows={2}
                label="Diagnóstico / Resumen clínico"
                value={formState.diagnosis}
                onChange={e => onFieldChange('diagnosis', e.target.value)}
                placeholder="Ej: SDRA moderado secundario a neumonía bilateral…"
              />
            </Grid>

            {/* Alergias */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <CompactTextField
                fullWidth
                label="Alergias"
                placeholder="Escribe y pulsa Enter para agregar"
                onKeyDown={handleAllergyKeyDown}
              />
              {formState.allergies.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {formState.allergies.map((a, i) => (
                    <Chip
                      key={i} label={a} size="small" variant="outlined"
                      onDelete={() =>
                        onFieldChange('allergies', formState.allergies.filter((_, idx) => idx !== i))
                      }
                      sx={{ color: '#e8f4fd', borderColor: 'rgba(255,255,255,0.3)' }}
                    />
                  ))}
                </Box>
              )}
            </Grid>

            {/* Antecedentes */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <CompactTextField
                fullWidth multiline rows={3}
                label="Antecedentes relevantes"
                value={formState.medicalHistory}
                onChange={e => onFieldChange('medicalHistory', e.target.value)}
                placeholder="Ej: HTA, tabaquismo 20 paq-año…"
              />
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>
    </>
  );
}

// Step 2 — Vital signs + calculated summary
function StepVitals({
  formState,
  calculated,
  onFieldChange,
}: Pick<PatientFormProps, 'formState' | 'calculated' | 'onFieldChange'>) {
  return (
    <>
      <StyledCard>
        <CardContent>
          <SectionTitle>
            <MonitorHeartIcon />
            <Typography variant="h6">Estado Actual</Typography>
          </SectionTitle>

          <Grid container spacing={2.5}>
            {/* Frecuencia Cardíaca */}
            <Grid size={col.quarter}>
              <CompactTextField
                fullWidth
                type="number" label="Frec. Cardíaca"
                value={formState.heartRate}
                onChange={e => onFieldChange('heartRate', e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 20, max: 300 }}
                InputProps={{ endAdornment: <InputAdornment position="end">lpm</InputAdornment> }}
              />
            </Grid>

            {/* Frecuencia Respiratoria */}
            <Grid size={col.quarter}>
              <CompactTextField
                fullWidth
                type="number" label="Frec. Resp."
                value={formState.respiratoryRate}
                onChange={e => onFieldChange('respiratoryRate', e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 4, max: 60 }}
                InputProps={{ endAdornment: <InputAdornment position="end">rpm</InputAdornment> }}
              />
            </Grid>

            {/* SpO2 */}
            <Grid size={col.quarter}>
              <CompactTextField
                fullWidth
                type="number" label="SpO₂"
                value={formState.spo2}
                onChange={e => onFieldChange('spo2', e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 50, max: 100 }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
            </Grid>

            {/* Temperatura */}
            <Grid size={col.quarter}>
              <CompactTextField
                fullWidth
                type="number" label="Temperatura"
                value={formState.temperature}
                onChange={e => onFieldChange('temperature', e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 30, max: 43, step: 0.1 }}
                InputProps={{ endAdornment: <InputAdornment position="end">°C</InputAdornment> }}
              />
            </Grid>

            {/* Tensión Arterial Sistólica */}
            <Grid size={col.halfMobile}>
              <CompactTextField
                fullWidth
                type="number" label="Sistólica"
                value={formState.systolicBP}
                onChange={e => onFieldChange('systolicBP', e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 40, max: 300 }}
                InputProps={{ endAdornment: <InputAdornment position="end">mmHg</InputAdornment> }}
                helperText="Tensión Art."
              />
            </Grid>

            {/* Tensión Arterial Diastólica */}
            <Grid size={col.halfMobile}>
              <CompactTextField
                fullWidth
                type="number" label="Diastólica"
                value={formState.diastolicBP}
                onChange={e => onFieldChange('diastolicBP', e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 20, max: 200 }}
                InputProps={{ endAdornment: <InputAdornment position="end">mmHg</InputAdornment> }}
                helperText="Tensión Art."
              />
            </Grid>

            {/* Glasgow */}
            <Grid size={col.quarter}>
              <CompactTextField
                fullWidth
                type="number" label="Glasgow"
                value={formState.glasgowScore}
                onChange={e => onFieldChange('glasgowScore', e.target.value === '' ? '' : Number(e.target.value))}
                inputProps={{ min: 3, max: 15 }}
                helperText="Escala 3 – 15"
              />
            </Grid>

            {/* Patrón Respiratorio */}
            <Grid size={{ xs: 12, sm: 6, md: 9 }}>
              <StyledFormControl fullWidth>
                <InputLabel>Patrón Respiratorio</InputLabel>
                <Select
                  value={formState.breathingPattern}
                  label="Patrón Respiratorio"
                  onChange={e =>
                    onFieldChange('breathingPattern', e.target.value as PatientFormState['breathingPattern'])
                  }
                  MenuProps={MENU_PROPS}
                >
                  <MenuItem value=""><em>No especificado</em></MenuItem>
                  {BREATHING_PATTERNS.map(p => (
                    <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                  ))}
                </Select>
              </StyledFormControl>
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>

      {/* Resumen de parámetros calculados */}
      {calculated && (
        <StyledCard>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#de0b24', fontWeight: 700 }}>
              Parámetros Ventilatorios Sugeridos
            </Typography>
            <CalculatedBox>
              <div className="calc-row">
                <span className="calc-label">Peso Corporal Ideal (PCI)</span>
                <span className="calc-value">{calculated.idealBodyWeight} kg</span>
              </div>
              <div className="calc-row">
                <span className="calc-label">IMC — {bmiLabel(calculated.bmi)}</span>
                <span className="calc-value">{calculated.bmi} kg/m²</span>
              </div>
              <div className="calc-row">
                <span className="calc-label">Volumen Tidal recomendado (6–8 ml/kg PCI)</span>
                <span className="calc-value">
                  {calculated.predictedTidalVolume.min} – {calculated.predictedTidalVolume.max} ml
                </span>
              </div>
            </CalculatedBox>
          </CardContent>
        </StyledCard>
      )}
    </>
  );
}

// Navigation bar — shown at the bottom of both steps
function StepNavigation({
  activeStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  onReset,
}: {
  activeStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  const isLast = activeStep === totalSteps - 1;
  const primarySx = {
    px: 3,
    backgroundColor: '#de0b24',
    '&:hover': { backgroundColor: '#b71c1c' },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        justifyContent: 'flex-end',
        mt: 2,
        flexWrap: 'wrap',
        '& .MuiButton-root': { minHeight: 44 },
      }}
    >
      <Button variant="outlined" color="inherit" onClick={onReset} sx={{ px: 3 }}>
        Limpiar
      </Button>
      {activeStep > 0 && (
        <Button variant="outlined" onClick={onBack} sx={{ px: 3 }}>
          ← Atrás
        </Button>
      )}
      {isLast ? (
        <Button variant="contained" onClick={onSubmit} sx={primarySx}>
          Enviar al Monitoreo
        </Button>
      ) : (
        <Button variant="contained" onClick={onNext} sx={primarySx}>
          Siguiente →
        </Button>
      )}
    </Box>
  );
}

// =============================================================================
// Main exported component
// =============================================================================

export function PatientForm({
  activeStep,
  formState,
  calculated,
  errors,
  onFieldChange,
  onNext,
  onBack,
  onSubmit,
  onReset,
}: PatientFormProps) {
  return (
    <Box>
      {/* Stepper — oculta labels en xs para evitar overflow */}
      <Stepper
        activeStep={activeStep}
        sx={{
          mb: 3,
          pt: 1,
          '& .MuiStepLabel-label': { display: { xs: 'none', sm: 'block' } },
          '& .MuiStepConnector-line': { borderColor: 'rgba(255,255,255,0.2)' },
        }}
      >
        {STEPS.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <StepPatient
          formState={formState}
          calculated={calculated}
          errors={errors}
          onFieldChange={onFieldChange}
        />
      )}

      {activeStep === 1 && (
        <StepVitals
          formState={formState}
          calculated={calculated}
          onFieldChange={onFieldChange}
        />
      )}

      <StepNavigation
        activeStep={activeStep}
        totalSteps={STEPS.length}
        onBack={onBack}
        onNext={onNext}
        onSubmit={onSubmit}
        onReset={onReset}
      />
    </Box>
  );
}
