/**
 * =============================================================================
 * /panel/teaching/lessons/[id] - Lesson Editor Page
 * =============================================================================
 * Frontend editor for lessons that:
 * - Allows editing title, content, order, isActive
 * - Shows "last modified by" and "last modified at"
 * - Renders a change history panel with diffs
 *
 * Access:
 * - teacher, admin, superuser (via withTeacherAuth)
 * - Students are never allowed to access this route.
 * =============================================================================
 */

import React from 'react';
import { useRouter } from 'next/router';
import { Container } from '@mui/material';
import { withTeacherAuth } from '@/components/hoc/withAuth';
import TeachingEntityEditor from '@/components/panel/teaching/TeachingEntityEditor';
import teachingContentService from '@/services/api/teachingContentService';

function LessonEditorPage() {
  const router = useRouter();
  const { id } = router.query;

  if (typeof id !== 'string') {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <TeachingEntityEditor
        entityType="lesson"
        entityId={id}
        fetchEntity={teachingContentService.getLessonById}
        updateEntity={teachingContentService.updateLesson}
        titleLabel="Título de la lección"
      />
    </Container>
  );
}

export default withTeacherAuth(LessonEditorPage);

