import React from 'react';
import PanelLayout from '@/features/admin/components/panel/PanelLayout';
import PanelAdmin from '@/features/admin/components/panel/pages/PanelAdmin';
import { withAdminAuth } from '@/features/auth/components/withAuth';

function PanelAdminPage() {
  return (
    <PanelLayout>
      <PanelAdmin />
    </PanelLayout>
  );
}

export default withAdminAuth(PanelAdminPage);
