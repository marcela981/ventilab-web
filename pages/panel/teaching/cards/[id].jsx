/**
 * =============================================================================
 * /panel/teaching/cards/[id] - Card Editor Page
 * =============================================================================
 * Frontend editor for teaching cards that:
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
import { withTeacherAuth } from '@/features/auth/components/withAuth';
import TeachingEntityEditor from '@/features/admin/components/panel/teaching/TeachingEntityEditor';
import teachingContentService from '@/features/teaching/services/teachingContentService';

function CardEditorPage() {
  const router = useRouter();
  const { id } = router.query;

  if (typeof id !== 'string') {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <TeachingEntityEditor
        entityType="card"
        entityId={id}
        fetchEntity={teachingContentService.getCardById}
        updateEntity={teachingContentService.updateCard}
        titleLabel="Título de la tarjeta"
      />
    </Container>
  );
}

export default withTeacherAuth(CardEditorPage);

