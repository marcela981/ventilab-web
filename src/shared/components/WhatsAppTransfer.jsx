import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useQRBridge } from '@/features/simulator/hooks/useQRBridge';

const Wrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
}));

const Helper = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.85rem',
}));

const WhatsAppTransfer = ({ ventilatorData, patientData, ventilationMode, setNotification }) => {
  const { shareCompleteDataToWhatsApp, isSharing } = useQRBridge();

  const handleShare = async () => {
    const result = await shareCompleteDataToWhatsApp(ventilatorData, patientData, ventilationMode);
    if (result.success) {
      if (result.requiresManualAction) {
        setNotification && setNotification({
          type: 'warning',
          message: 'Enlace copiado al portapapeles. Pega el enlace en tu navegador para abrir WhatsApp.',
          timestamp: Date.now(),
        });
      } else {
        setNotification && setNotification({
          type: 'success',
          message: 'WhatsApp abierto. Revisa la nueva pestaña para enviar el reporte.',
          timestamp: Date.now(),
        });
      }
    } else {
      setNotification && setNotification({
        type: 'error',
        message: `No se pudo compartir por WhatsApp: ${result.error}`,
        timestamp: Date.now(),
      });
    }
  };

  return (
    <Wrapper>
      <Typography variant="h6" gutterBottom sx={{ color: '#de0b24', fontWeight: 600 }}>
        Reporte Completo VentyLab
      </Typography>
      <Helper>
        Genera y comparte un reporte con la configuración del ventilador, datos del paciente y estadísticas de la sesión.
      </Helper>
      <Box>
        <Button
          variant="contained"
          color="success"
          startIcon={<WhatsAppIcon />}
          onClick={handleShare}
          disabled={isSharing}
          sx={{ fontWeight: 600, '&:hover': { backgroundColor: 'success.dark' } }}
        >
          {isSharing ? 'Preparando reporte…' : 'Compartir por WhatsApp'}
        </Button>
      </Box>
    </Wrapper>
  );
};

export default WhatsAppTransfer;


