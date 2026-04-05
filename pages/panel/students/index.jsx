import React from 'react';
import PanelLayout from '@/features/admin/components/panel/PanelLayout';
import PanelStudents from '@/features/admin/components/panel/pages/PanelStudents';
import { withTeacherAuth } from '@/features/auth/components/withAuth';

function PanelStudentsPage() {
  return (
    <PanelLayout>
      <PanelStudents />
    </PanelLayout>
  );
}

export default withTeacherAuth(PanelStudentsPage);
