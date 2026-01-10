import React from 'react';
import { Alert, Skeleton, Fade } from '@mui/material';
import { DashboardData } from './types';
import DashboardOverviewCard from './components/DashboardOverviewCard';
import QuickActions from './components/QuickActions';
import WeeklyPlan from './components/WeeklyPlan';
import CaseSpotlight from './components/CaseSpotlight';
import NotificationsCenter from './components/NotificationsCenter';
import ActivityFeed from './components/ActivityFeed';
import TasksTodo from './components/TasksTodo';

interface DashboardTabProps {
  data: DashboardData;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  // Handlers para componentes
  onContinue?: () => void;
  onAction?: (id: string) => void;
  onStartCase?: (id: string) => void;
  onReadNotification?: (id: string) => void;
  onToggleTask?: (id: string) => void;
}

/**
 * DashboardTab - Contenedor principal del dashboard del módulo de enseñanza
 * 
 * Layout con 3 rieles (igual que Progress):
 * - Hero arriba (overview + acciones) centrado con max-w-6xl
 * - Grid 12 columnas:
 *   - Izquierda (xl:col-span-4): GRANDES - WeeklyPlan, CaseSpotlight
 *   - Centro (xl:col-span-4): VACÍO
 *   - Derecha (xl:col-span-4): VACÍO
 * - Debajo del grid principal: Tareas, Notificaciones, Actividad Reciente
 * - En sm/md: apilar Hero → Izquierda → Centro → Derecha
 */
const DashboardTab: React.FC<DashboardTabProps> = ({
  data,
  loading = false,
  error = null,
  onRefresh,
  onContinue,
  onAction,
  onStartCase,
  onReadNotification,
  onToggleTask
}) => {
  // Handlers por defecto si no se proporcionan
  const handleContinue = onContinue || (() => {
    console.log('Continue clicked');
  });
  
  const handleAction = onAction || ((id: string) => {
    console.log('Action clicked:', id);
  });
  
  const handleStartCase = onStartCase || ((id: string) => {
    console.log('Start case clicked:', id);
  });
  
  const handleReadNotification = onReadNotification || ((id: string) => {
    console.log('Read notification:', id);
  });
  
  const handleToggleTask = onToggleTask || ((id: string) => {
    console.log('Toggle task:', id);
  });

  // Convertir datos al formato esperado por los componentes
  const overviewData = data.overview ? {
    ...data.overview,
    lessonTitle: (data.overview as any).lessonTitle || undefined,
    estMin: (data.overview as any).estMin || undefined,
    progressPercent: (data.overview as any).progressPercent || (data.overview as any).levelProgress || undefined,
    xpToday: data.overview.xpToday || 0,
    level: data.overview.level || 1,
    role: data.overview.role || 'Estudiante'
  } : {
    xpToday: 0,
    level: 1,
    role: 'Estudiante'
  };

  // Renderizar skeleton de carga
  if (loading) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-6 space-y-6">
        {/* Hero skeleton */}
        <div className="mx-auto w-full max-w-6xl">
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 3 }} />
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-12 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="col-span-12 xl:col-span-4">
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Renderizar error si existe
  if (error) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-6">
        <Alert severity="error" onClose={() => onRefresh?.()}>
          Error al cargar el dashboard: {error}
        </Alert>
      </div>
    );
  }

  return (
    <Fade in timeout={600}>
      <div className="container mx-auto max-w-screen-xl px-4 py-6 space-y-6">
        {/* ========== HERO - ARRIBA CENTRADO CON ANCHO LIMITADO ========== */}
        <div className="mx-auto w-full max-w-6xl space-y-4">
          {/* Overview + Acciones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <DashboardOverviewCard
                data={overviewData}
                onContinue={handleContinue}
                loading={loading}
              />
            </div>
            <div className="md:col-span-2">
              <QuickActions
                actions={data.quickActions}
                onAction={handleAction}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* ========== GRID DE 12 COLUMNAS - 3 RAILS ========== */}
        <div className="grid grid-cols-12 gap-6">
          {/* ========== RAIL IZQUIERDA (xl: col-span-4) - COMPONENTES GRANDES ========== */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
            <WeeklyPlan
              goals={data.weeklyObjectives as any}
              loading={loading}
            />
            {data.caseSpotlight && (
              <CaseSpotlight
                data={data.caseSpotlight as any}
                onStart={handleStartCase}
                loading={loading}
              />
            )}
          </div>

          {/* ========== RAIL CENTRO (xl: col-span-4) - VACÍO ========== */}
          <div className="col-span-12 xl:col-span-4">
            {/* Este rail se deja vacío */}
          </div>

          {/* ========== RAIL DERECHA (xl: col-span-4) - VACÍO ========== */}
          <div className="col-span-12 xl:col-span-4">
            {/* Este rail se deja vacío */}
          </div>
        </div>

        {/* ========== SECCIÓN DEBAJO DE RECOMENDACIONES - TAREAS, NOTIFICACIONES, ACTIVIDAD ========== */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-4">
            <TasksTodo
              items={data.todos as any}
              onToggle={handleToggleTask}
              loading={loading}
            />
          </div>
          <div className="col-span-12 md:col-span-4">
            <NotificationsCenter
              items={data.notifications as any}
              onRead={handleReadNotification}
              loading={loading}
            />
          </div>
          <div className="col-span-12 md:col-span-4">
            <ActivityFeed
              items={data.activities}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </Fade>
  );
};

export default DashboardTab;

