import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormControl,
  RadioGroup,
  Radio,
  Alert
} from '@mui/material';

const DecisionRenderer = ({ decision, selectedOptions, onSelectionChange, showFeedback = true }) => {
  const isMulti = decision.type === 'multi';
  const selectedSet = useMemo(() => new Set(selectedOptions || []), [selectedOptions]);

  const handleChange = useCallback((optionId, checked) => {
    if (isMulti) {
      const newSelection = checked
        ? [...(selectedOptions || []), optionId]
        : (selectedOptions || []).filter(id => id !== optionId);
      onSelectionChange(decision.id, newSelection);
    } else {
      onSelectionChange(decision.id, [optionId]);
    }
  }, [decision.id, isMulti, onSelectionChange, selectedOptions]);

  const getOptionWeight = useCallback((optionId) => {
    return decision.weights?.[optionId] || 0;
  }, [decision.weights]);

  const getOptionScore = useCallback(() => {
    if (!selectedOptions || selectedOptions.length === 0) return 0;
    
    if (isMulti) {
      return selectedOptions.reduce((sum, optId) => sum + getOptionWeight(optId), 0);
    } else {
      return getOptionWeight(selectedOptions[0]);
    }
  }, [selectedOptions, isMulti, getOptionWeight]);

  return (
    <Card sx={{ mb: 3, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {decision.prompt}
          </Typography>
          {decision.domain && (
            <Chip
              label={decision.domain}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {isMulti ? (
          <FormGroup>
            {decision.options.map((option) => {
              const isSelected = selectedSet.has(option.id);
              const isExpert = option.isExpertChoice;
              
              return (
                <FormControlLabel
                  key={option.id}
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => handleChange(option.id, e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={isSelected ? 600 : 400}>
                        {option.label}
                        {isExpert && (
                          <Chip label="Opción experta" size="small" color="success" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {option.rationale}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    mb: 1,
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                    border: isSelected ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                />
              );
            })}
          </FormGroup>
        ) : (
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={selectedOptions?.[0] || ''}
              onChange={(e) => handleChange(e.target.value, true)}
            >
              {decision.options.map((option) => {
                const isSelected = selectedSet.has(option.id);
                const isExpert = option.isExpertChoice;
                
                return (
                  <FormControlLabel
                    key={option.id}
                    value={option.id}
                    control={<Radio color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={isSelected ? 600 : 400}>
                          {option.label}
                          {isExpert && (
                            <Chip label="Opción experta" size="small" color="success" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {option.rationale}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      mb: 1,
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                      border: isSelected ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  />
                );
              })}
            </RadioGroup>
          </FormControl>
        )}

        {showFeedback && selectedOptions && selectedOptions.length > 0 && decision.feedback && (
          <Alert
            severity={getOptionScore() >= 0.7 ? 'success' : getOptionScore() > 0 ? 'info' : 'warning'}
            sx={{ mt: 2 }}
            role="alert"
            aria-live="polite"
          >
            {decision.feedback}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default DecisionRenderer;
