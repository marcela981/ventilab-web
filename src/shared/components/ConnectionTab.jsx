import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled('div')(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: theme.spacing(1),
  color: '#e8f4fd',
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
}));

const ConnectionTab = ({ header, children }) => {
  return (
    <Box p={3} pb={12}>
      <Container maxWidth="xl">
        <Typography variant="h4" gutterBottom align="center" sx={{ color: '#de0b24', mb: 4 }}>
          {header || 'Control de Conexión Serial'}
        </Typography>
        <StyledPaper>
          {children}
        </StyledPaper>
      </Container>
    </Box>
  );
};

export default ConnectionTab;
