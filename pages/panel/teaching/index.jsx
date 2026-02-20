/**
 * =============================================================================
 * /panel/teaching - Teaching Content Admin Entry
 * =============================================================================
 * Simple landing page for the teaching section of the admin panel.
 * From here, teachers/admins can navigate to specific lesson/card editors.
 *
 * NOTE:
 * - Route is protected with teacher-level auth (teacher, admin, superuser).
 * - Students never reach this page (guarded by withTeacherAuth).
 * - Actual editing happens in:
 *   - /panel/teaching/lessons/[id]
 *   - /panel/teaching/cards/[id]
 * =============================================================================
 */

import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  MenuBook as LessonIcon,
  Style as CardIcon,
} from '@mui/icons-material';
import { withTeacherAuth } from '@/features/auth/components/withAuth';

function PanelTeachingPage() {
  const router = useRouter();
  const [lessonId, setLessonId] = React.useState('');
  const [cardId, setCardId] = React.useState('');

  const goToLesson = () => {
    if (!lessonId.trim()) return;
    router.push(`/panel/teaching/lessons/${lessonId.trim()}`);
  };

  const goToCard = () => {
    if (!cardId.trim()) return;
    router.push(`/panel/teaching/cards/${cardId.trim()}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Gestión de Contenido Docente
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Edita lecciones y tarjetas existentes del LMS. Los cambios son
          globales y afectan a todos los estudiantes.
        </Typography>
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        alignItems="stretch"
      >
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1.5 }}>
            <LessonIcon color="primary" />
            <Typography variant="h6">Editar lección</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ingresa el ID de una lección para abrir el editor avanzado con
            historial de cambios.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="ID de lección"
              fullWidth
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={goToLesson}
            >
              Abrir
            </Button>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1.5 }}>
            <CardIcon color="secondary" />
            <Typography variant="h6">Editar tarjeta</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ingresa el ID de una tarjeta para abrir el editor avanzado con
            historial de cambios.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="ID de tarjeta"
              fullWidth
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
            />
            <Button variant="contained" color="secondary" onClick={goToCard}>
              Abrir
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

export default withTeacherAuth(PanelTeachingPage);

