import React from 'react';
import PanelLayout from '@/features/admin/components/panel/PanelLayout';
import PanelGroups from '@/features/admin/components/panel/pages/PanelGroups';
import { withTeacherAuth } from '@/features/auth/components/withAuth';

function PanelGroupsPage() {
  return (
    <PanelLayout>
      <PanelGroups />
    </PanelLayout>
  );
}

export default withTeacherAuth(PanelGroupsPage);
