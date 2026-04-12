import React from 'react';
import PanelLayout from '@/features/admin/components/panel/PanelLayout';
import PanelSettings from '@/features/admin/components/panel/pages/PanelSettings';
import { withAdminAuth } from '@/features/auth/components/withAuth';

function PanelSettingsPage() {
  return (
    <PanelLayout>
      <PanelSettings />
    </PanelLayout>
  );
}

export default withAdminAuth(PanelSettingsPage);
