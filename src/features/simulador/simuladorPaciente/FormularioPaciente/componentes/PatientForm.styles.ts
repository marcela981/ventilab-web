import { styled } from '@mui/material/styles';
import { Box, Card, TextField, FormControl } from '@mui/material';

// =============================================================================
// Layout
// =============================================================================

export const FormContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 1200,
  margin: '0 auto',
  padding: theme.spacing(2),

  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
}));

// =============================================================================
// Card
// =============================================================================

export const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  marginBottom: theme.spacing(3),
  color: '#e8f4fd',
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',

  '& .MuiCardContent-root': {
    padding: theme.spacing(3),

    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
    },
  },
}));

// =============================================================================
// Section header
// =============================================================================

export const SectionTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2.5),
  paddingBottom: theme.spacing(1),
  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',

  '& .MuiSvgIcon-root': {
    color: '#de0b24',
    fontSize: '1.3rem',
  },

  '& h6': {
    fontWeight: 700,
    color: '#e8f4fd',
    fontSize: '1rem',
  },
}));

// =============================================================================
// Calculated params list
// =============================================================================

export const CalculatedBox = styled(Box)(({ theme }) => ({
  backgroundColor: 'rgba(33, 150, 243, 0.06)',
  border: '1px solid rgba(33, 150, 243, 0.18)',
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1.5, 2),
  marginTop: theme.spacing(2.5),

  '& .calc-row': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    padding: theme.spacing(0.5, 0),

    '&:not(:last-child)': {
      borderBottom: '1px dashed rgba(255, 255, 255, 0.08)',
    },
  },

  '& .calc-label': {
    color: 'rgba(232, 244, 253, 0.65)',
    fontSize: '0.85rem',
  },

  '& .calc-value': {
    fontWeight: 700,
    color: '#64b5f6',
    fontSize: '0.95rem',
    textAlign: 'right',
    marginLeft: theme.spacing(1),
    whiteSpace: 'nowrap',
  },
}));

// =============================================================================
// Shared input visual styles (dark theme — applied to both TextField and Select)
// Uses higher-specificity selectors to override muiTheme's global overrides.
// =============================================================================

const inputStyles = {
  // --- Input text ---
  '& .MuiInputBase-input': {
    color: '#e8f4fd',
  },

  // --- Label (floating) ---
  // High specificity: beats muiTheme's `& .MuiInputLabel-root`
  '& .MuiFormLabel-root.MuiInputLabel-root': {
    color: 'rgba(232, 244, 253, 0.75)',
    '&.Mui-focused': {
      color: '#90caf9',
    },
    '&.Mui-error': {
      color: '#f48fb1',
    },
  },

  // --- Border ---
  // High specificity: beats muiTheme's `fieldset` and Paper border rules
  '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.38)',
    borderWidth: '1px',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#90caf9',
    borderWidth: '2px',
  },
  '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: '#f48fb1',
  },

  // --- Adornment units (kg, lpm, etc.) ---
  '& .MuiInputAdornment-root p, & .MuiInputAdornment-root .MuiTypography-root': {
    color: 'rgba(232, 244, 253, 0.45)',
    fontSize: '0.82rem',
  },

  // --- Helper text ---
  '& .MuiFormHelperText-root': {
    color: 'rgba(232, 244, 253, 0.5)',
    fontSize: '0.72rem',
    marginTop: 3,
    '&.Mui-error': {
      color: '#f48fb1',
    },
  },
} as const;

// =============================================================================
// TextField
// =============================================================================

export const CompactTextField = styled(TextField)(() => inputStyles);

// Readonly variant — green tint for auto-calculated fields
export const ReadonlyField = styled(CompactTextField)(() => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
  },
  '& .MuiInputBase-input': {
    cursor: 'default',
    color: '#a5d6a7',
    fontWeight: 600,
  },
  '& .MuiFormLabel-root.MuiInputLabel-root': {
    color: 'rgba(165, 214, 167, 0.65)',
  },
  '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(76, 175, 80, 0.35)',
  },
}));

// =============================================================================
// FormControl — wraps Select components; applies the same input styles
// =============================================================================

export const StyledFormControl = styled(FormControl)(() => ({
  ...inputStyles,

  // Select-specific: dropdown arrow icon color
  '& .MuiSelect-icon': {
    color: 'rgba(232, 244, 253, 0.5)',
  },

  // Select value text
  '& .MuiSelect-select': {
    color: '#e8f4fd',
  },
}));

// =============================================================================
// Shared Select dropdown paper — opaque dark background
// Used as: MenuProps={{ PaperProps: { sx: menuPaperSx } }}
// =============================================================================

export const menuPaperSx = {
  bgcolor: '#0d1b2a',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  backgroundImage: 'none',                        // removes MUI's elevation gradient

  '& .MuiMenuItem-root': {
    color: '#e8f4fd',
    fontSize: '0.9rem',
    minHeight: 44,                                // touch target

    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },

    '&.Mui-selected': {
      backgroundColor: 'rgba(222, 11, 36, 0.18)',
      '&:hover': {
        backgroundColor: 'rgba(222, 11, 36, 0.28)',
      },
    },
  },
} as const;

// =============================================================================
// Responsive grid column presets — used as: <Grid size={col.quarter}>
// Compatible with MUI v7 Grid `size` prop (Grid v2 API).
// =============================================================================

export const col = {
  full:       { xs: 12 },
  half:       { xs: 12, sm: 6 },
  third:      { xs: 12, sm: 6, md: 4 },
  quarter:    { xs: 6,  sm: 4, md: 3 },
  halfMobile: { xs: 6,  sm: 3 },
} as const;
