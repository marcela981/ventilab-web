import React from 'react';
import PanelLayout from '@/features/admin/components/panel/PanelLayout';
import PanelStudentDetail from '@/features/admin/components/panel/pages/PanelStudentDetail';
import { withTeacherAuth } from '@/features/auth/components/withAuth';

function PanelStudentDetailPage() {
  return (
    <PanelLayout>
      <PanelStudentDetail />
    </PanelLayout>
  );
}

export default withTeacherAuth(PanelStudentDetailPage);
