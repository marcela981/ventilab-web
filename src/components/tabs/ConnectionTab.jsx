import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled('div')(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'rgba(121, 10, 10, 0.57)',
  border: `1px solid ${theme.palette?.divider || 'rgba(255,255,255,0.2)'}`,
  borderRadius: theme.spacing(1),
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
