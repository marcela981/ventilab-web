import React from 'react';
import PanelLayout from '@/features/admin/components/panel/PanelLayout';
import PanelSimulator from '@/features/admin/components/panel/pages/PanelSimulator';
import { withTeacherAuth } from '@/features/auth/components/withAuth';

function PanelSimulatorPage() {
  return (
    <PanelLayout>
      <PanelSimulator />
    </PanelLayout>
  );
}

export default withTeacherAuth(PanelSimulatorPage);
