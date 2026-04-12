/**
 * PanelDashboard - Admin Panel Home Page
 * Inyector de datos: fetches stats y estudiantes, pasa todo a componentes ui/.
 * Layout responsivo que se adapta correctamente al abrir/cerrar el sidebar.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Alert } from '@mui/material';
import {
  People as PeopleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  AdminPanelSettings as AdminIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/contexts/AuthContext';
import adminService from '@/features/admin/services/adminService';

import DashboardHero from '../ui/DashboardHero';
import GlassStatCard from '../ui/GlassStatCard';
import QuickActionsGrid from '../ui/QuickActionsGrid';
import RecentActivityFeed from '../ui/RecentActivityFeed';

export default function PanelDashboard() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { user, role, isAdmin, isSuperuser } = useAuth();

  const [stats, setStats] = useState(null);
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const [statsRes, studentsRes] = await Promise.all([
        adminService.getPlatformStatistics(),
        adminService.getStudents({ page: 1, limit: 5, sortBy: 'lastActivity', sortOrder: 'desc' }),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (studentsRes.success) {
        setRecentStudents(
          (studentsRes.data.students || []).map((s) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            stats: { progressPercentage: s.progress?.overallProgress ?? 0 },
          }))
        );
      }
      if (!statsRes.success && !studentsRes.success) {
        setError(statsRes.error?.message || 'Error al cargar estadísticas');
      }
      setLoading(false);
    })();
  }, []);

  const canSeeAdmin = isAdmin?.() || isSuperuser?.();

  // ── Datos para las tarjetas de stats ──────────────────────────────────────
  const statCards = [
    {
      icon: <PeopleIcon />,
      title: 'Estudiantes Activos',
      value: stats?.totalStudents ?? stats?.activeStudents,
      accent: 'cyan',
      onClick: () => navigate('/panel/students'),
    },
    {
      icon: <SchoolIcon />,
      title: 'Módulos Publicados',
      value: stats?.totalModules ?? stats?.publishedModules,
      accent: 'green',
      onClick: () => navigate('/teaching'),
    },
    {
      icon: <AssignmentIcon />,
      title: 'Lecciones Totales',
      value: stats?.totalLessons,
      accent: 'purple',
    },
    {
      icon: <TrendingUpIcon />,
      title: 'Completados Hoy',
      value: stats?.completionsToday ?? stats?.todayCompletions,
      accent: 'orange',
    },
  ];

  // ── Acciones rápidas ───────────────────────────────────────────────────────
  const quickActions = [
    { icon: <PeopleIcon />, title: 'Ver Estudiantes',  description: 'Listado y progreso individual',  path: '/panel/students' },
    { icon: <SchoolIcon />, title: 'Editar Contenido', description: 'Niveles, módulos y lecciones',   path: '/teaching' },
    { icon: <AssessmentIcon />, title: 'Evaluaciones', description: 'Crear, asignar y calificar',     path: '/evaluation/manage' },
    ...(canSeeAdmin
      ? [{ icon: <AdminIcon />, title: 'Gestión de Profesores', description: 'Ver profesores y permisos', path: '/panel/admin' }]
      : []),
  ];

  return (
    <Box>
      {/* Banner de bienvenida */}
      <DashboardHero user={user} role={role} />

      {error && (
        <Alert
          severity="warning"
          sx={{ mb: 3, bgcolor: 'rgba(255,152,0,0.12)', color: '#fcd34d', border: '1px solid rgba(255,152,0,0.3)' }}
        >
          {error}
        </Alert>
      )}

      {/* Tarjetas de estadísticas — auto-fill: no se comprimen con el sidebar */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 2,
          mb: 3,
        }}
      >
        {statCards.map((card) => (
          <GlassStatCard key={card.title} loading={loading} {...card} />
        ))}
      </Box>

      {/* Sección inferior: feed de actividad + accesos rápidos */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <RecentActivityFeed
          students={recentStudents}
          navigate={navigate}
          loading={loading}
        />
        <Box sx={{ width: { xs: '100%', md: 280 } }}>
          <QuickActionsGrid actions={quickActions} navigate={navigate} />
        </Box>
      </Box>
    </Box>
  );
}
