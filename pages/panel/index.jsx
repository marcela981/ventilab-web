import React from 'react';
import PanelLayout from '@/features/admin/components/panel/PanelLayout';
import PanelDashboard from '@/features/admin/components/panel/pages/PanelDashboard';
import { withTeacherAuth } from '@/features/auth/components/withAuth';

function PanelIndexPage() {
  return (
    <PanelLayout>
      <PanelDashboard />
    </PanelLayout>
  );
}

export default withTeacherAuth(PanelIndexPage);
