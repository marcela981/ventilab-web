/*
 * Funcionalidad: Crear Nueva Actividad de Evaluación
 * Descripción: Página para que el docente cree una nueva actividad usando ActivityBuilder; requiere rol TEACHER o ADMIN
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from '@/shared/contexts/AuthContext';
import ActivityBuilder from '@/features/evaluation/components/builder/ActivityBuilder';
import styles from './UI/manage.module.css';

export default function NewActivityPage() {
  const { isTeacher } = useAuth();

  if (!isTeacher || !isTeacher()) {
    return (
      <Box className={styles.page}>
        <Typography>No autorizado.</Typography>
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <ActivityBuilder />
    </Box>
  );
}
