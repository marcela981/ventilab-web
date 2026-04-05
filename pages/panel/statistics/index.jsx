import React from 'react';
import PanelLayout from '@/features/admin/components/panel/PanelLayout';
import PanelStatistics from '@/features/admin/components/panel/pages/PanelStatistics';
import { withTeacherAuth } from '@/features/auth/components/withAuth';

function PanelStatisticsPage() {
  return (
    <PanelLayout>
      <PanelStatistics />
    </PanelLayout>
  );
}

export default withTeacherAuth(PanelStatisticsPage);
