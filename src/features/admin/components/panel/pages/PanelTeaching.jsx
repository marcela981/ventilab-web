/**
 * =============================================================================
 * PanelTeaching - Teaching Content Management Page
 * =============================================================================
 * Page for managing teaching content (modules, lessons, resources).
 * Placeholder to be extended with CRUD operations for educational content.
 *
 * Accessible to: teacher, admin, superuser
 * =============================================================================
 */

import React from 'react';
import { Box, Typography, Paper, Button, Stack } from '@mui/material';
import {
  Add as AddIcon,
  MenuBook as MenuBookIcon,
  VideoLibrary as VideoIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';

/**
 * PanelTeaching Component
 *
 * Content management interface for teachers and admins.
 */
export default function PanelTeaching() {
  return (
    <Box>
      {/* Page Header */}
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Gestión de Contenido
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Administra módulos, lecciones y recursos educativos.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled
          sx={{ textTransform: 'none' }}
        >
          Nuevo Módulo
        </Button>
      </Box>

      {/* Quick Actions */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 2,
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
        >
          <MenuBookIcon color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h6">Módulos</Typography>
            <Typography variant="body2" color="text.secondary">
              Gestionar módulos de aprendizaje
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 2,
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
        >
          <VideoIcon color="secondary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h6">Lecciones</Typography>
            <Typography variant="body2" color="text.secondary">
              Crear y editar lecciones
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 2,
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
        >
          <QuizIcon color="success" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h6">Evaluaciones</Typography>
            <Typography variant="body2" color="text.secondary">
              Configurar quizzes y exámenes
            </Typography>
          </Box>
        </Paper>
      </Stack>

      {/* Placeholder Content Area */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2,
          textAlign: 'center',
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MenuBookIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Gestión de Contenido en construcción
        </Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={400}>
          Aquí podrás crear, editar y organizar todo el contenido educativo de
          la plataforma.
        </Typography>
      </Paper>
    </Box>
  );
}
