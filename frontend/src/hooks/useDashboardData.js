/**
 * =============================================================================
 * Dashboard Data Hooks
 * =============================================================================
 * Custom hooks for fetching dashboard-specific data
 * Encapsulates API calls, loading states, and error handling
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Base API URL
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Helper function to make authenticated API requests
 */
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('ventilab_auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// STUDENT DASHBOARD HOOKS
// =============================================================================

/**
 * Hook for fetching student learning progress
 *
 * @returns {Object} { progress, loading, error, refetch }
 *
 * @example
 * const { progress, loading, error } = useStudentProgress();
 */
export function useStudentProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchProgress = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user's module progress
      const data = await fetchWithAuth(`${API_BASE_URL}/users/${user.id}/progress`);

      setProgress(data);
    } catch (err) {
      console.error('[useStudentProgress] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, loading, error, refetch: fetchProgress };
}

/**
 * Hook for fetching recommended lessons for student
 *
 * @returns {Object} { recommendations, loading, error, refetch }
 */
export function useRecommendedLessons() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recommended lessons based on user progress
      const data = await fetchWithAuth(`${API_BASE_URL}/lessons/recommended`);

      setRecommendations(data.lessons || []);
    } catch (err) {
      console.error('[useRecommendedLessons] Error:', err);
      setError(err.message);
      // Set mock data on error for demo purposes
      setRecommendations([
        {
          id: '1',
          title: 'Introducción a la Ventilación Mecánica',
          moduleTitle: 'Fundamentos',
          estimatedTime: 30,
        },
        {
          id: '2',
          title: 'Modos de Ventilación',
          moduleTitle: 'Principios',
          estimatedTime: 45,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, loading, error, refetch: fetchRecommendations };
}

/**
 * Hook for fetching student statistics
 *
 * @returns {Object} { stats, loading, error, refetch }
 */
export function useStudentStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await fetchWithAuth(`${API_BASE_URL}/users/${user.id}/stats`);

      setStats(data);
    } catch (err) {
      console.error('[useStudentStats] Error:', err);
      setError(err.message);
      // Mock data for demo
      setStats({
        totalStudyTime: 150, // minutes
        modulesCompleted: 3,
        lessonsCompleted: 12,
        averageScore: 85,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// =============================================================================
// TEACHER DASHBOARD HOOKS
// =============================================================================

/**
 * Hook for fetching teacher's modules
 *
 * @returns {Object} { modules, loading, error, refetch }
 */
export function useTeacherModules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchModules = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch modules created by this teacher
      const data = await fetchWithAuth(`${API_BASE_URL}/modules?createdBy=${user.id}`);

      setModules(data.modules || []);
    } catch (err) {
      console.error('[useTeacherModules] Error:', err);
      setError(err.message);
      // Mock data
      setModules([
        {
          id: '1',
          title: 'Fundamentos de Ventilación',
          lessonsCount: 8,
          studentsEnrolled: 24,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Técnicas Avanzadas',
          lessonsCount: 12,
          studentsEnrolled: 15,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  return { modules, loading, error, refetch: fetchModules };
}

/**
 * Hook for fetching teacher's student statistics
 *
 * @returns {Object} { stats, loading, error, refetch }
 */
export function useTeacherStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await fetchWithAuth(`${API_BASE_URL}/teachers/${user.id}/stats`);

      setStats(data);
    } catch (err) {
      console.error('[useTeacherStats] Error:', err);
      setError(err.message);
      // Mock data
      setStats({
        totalStudents: 45,
        activeStudents: 38,
        modulesCreated: 5,
        lessonsCreated: 32,
        averageCompletion: 72,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// =============================================================================
// ADMIN DASHBOARD HOOKS
// =============================================================================

/**
 * Hook for fetching system-wide statistics
 *
 * @returns {Object} { stats, loading, error, refetch }
 */
export function useSystemStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchWithAuth(`${API_BASE_URL}/admin/stats`);

      setStats(data);
    } catch (err) {
      console.error('[useSystemStats] Error:', err);
      setError(err.message);
      // Mock data
      setStats({
        totalUsers: 156,
        totalStudents: 120,
        totalTeachers: 25,
        totalAdmins: 5,
        totalModules: 18,
        totalLessons: 145,
        activeUsers: 89,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

/**
 * Hook for fetching all users (admin only)
 *
 * @returns {Object} { users, loading, error, refetch, updateUser, deleteUser }
 */
export function useAllUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchWithAuth(`${API_BASE_URL}/users`);

      setUsers(data.users || []);
    } catch (err) {
      console.error('[useAllUsers] Error:', err);
      setError(err.message);
      // Mock data
      setUsers([
        {
          id: '1',
          name: 'Juan Pérez',
          email: 'juan@example.com',
          role: 'STUDENT',
          isActive: true,
          createdAt: '2025-01-15',
        },
        {
          id: '2',
          name: 'María García',
          email: 'maria@example.com',
          role: 'TEACHER',
          isActive: true,
          createdAt: '2025-01-10',
        },
        {
          id: '3',
          name: 'Carlos López',
          email: 'carlos@example.com',
          role: 'STUDENT',
          isActive: true,
          createdAt: '2025-01-20',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Update user role or active status
   */
  const updateUser = useCallback(
    async (userId, updates) => {
      try {
        await fetchWithAuth(`${API_BASE_URL}/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });

        // Refresh user list
        await fetchUsers();

        return { success: true };
      } catch (err) {
        console.error('[updateUser] Error:', err);
        return { success: false, error: err.message };
      }
    },
    [fetchUsers]
  );

  /**
   * Deactivate user
   */
  const deleteUser = useCallback(
    async (userId) => {
      try {
        await fetchWithAuth(`${API_BASE_URL}/users/${userId}`, {
          method: 'DELETE',
        });

        // Refresh user list
        await fetchUsers();

        return { success: true };
      } catch (err) {
        console.error('[deleteUser] Error:', err);
        return { success: false, error: err.message };
      }
    },
    [fetchUsers]
  );

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    updateUser,
    deleteUser,
  };
}

// =============================================================================
// DASHBOARD-SPECIFIC HOOKS (Used by Dashboard Components)
// =============================================================================

/**
 * Hook for Student Dashboard
 * Combines all student-related data into a single object
 *
 * @returns {Object} { data, loading, error, refetch }
 * @property {Object} data - Combined student dashboard data
 * @property {Array} data.modules - All available modules
 * @property {Array} data.recommendedLessons - Recommended lessons for student
 * @property {Object} data.statistics - Student statistics
 *
 * @example
 * const { data, loading, error } = useStudentDashboard();
 */
export function useStudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({
    modules: [],
    recommendedLessons: [],
    statistics: {
      modulesCompleted: 0,
      lessonsCompleted: 0,
      totalTimeSpent: 0,
      averageScore: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAllModules = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/modules`);
      return response.modules || response.data || [];
    } catch (err) {
      console.error('[useStudentDashboard] Error fetching modules:', err);
      return [];
    }
  }, []);

  const fetchRecommendedLessons = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/lessons/recommended`);
      return response.lessons || response.data || [];
    } catch (err) {
      console.error('[useStudentDashboard] Error fetching recommendations:', err);
      // Mock data on error
      return [
        {
          id: '1',
          moduleId: '1',
          title: 'Introducción a la Ventilación Mecánica',
          difficulty: 'BEGINNER',
          estimatedTime: 30,
        },
        {
          id: '2',
          moduleId: '1',
          title: 'Modos de Ventilación',
          difficulty: 'INTERMEDIATE',
          estimatedTime: 45,
        },
      ];
    }
  }, []);

  const fetchStudentData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all modules
      const modules = await fetchAllModules();

      // Fetch recommended lessons
      const recommendedLessons = await fetchRecommendedLessons();

      // Calculate statistics
      const modulesCompleted = modules.filter((m) => m.progress?.completed).length || 0;

      // Try to fetch user stats
      let statistics = {
        modulesCompleted,
        lessonsCompleted: 0,
        totalTimeSpent: 0,
        averageScore: 0,
      };

      try {
        const statsResponse = await fetchWithAuth(`${API_BASE_URL}/users/${user.id}/stats`);
        if (statsResponse) {
          statistics = {
            modulesCompleted,
            lessonsCompleted: statsResponse.lessonsCompleted || 0,
            totalTimeSpent: statsResponse.totalStudyTime || 0,
            averageScore: statsResponse.averageScore || 0,
          };
        }
      } catch (err) {
        console.error('[useStudentDashboard] Error fetching stats:', err);
      }

      setData({
        modules,
        recommendedLessons,
        statistics,
      });
    } catch (err) {
      console.error('[useStudentDashboard] Error:', err);
      setError(err.message || 'Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchAllModules, fetchRecommendedLessons]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  return { data, loading, error, refetch: fetchStudentData };
}

/**
 * Hook for Teacher Dashboard
 * Combines teacher modules and student statistics
 *
 * @returns {Object} { data, loading, error, refetch }
 * @property {Object} data - Combined teacher dashboard data
 * @property {Array} data.myModules - Modules created by teacher
 * @property {Object} data.studentStats - Aggregated student statistics
 *
 * @example
 * const { data, loading, error, refetch } = useTeacherDashboard();
 */
export function useTeacherDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({
    myModules: [],
    studentStats: {
      totalStudents: 0,
      activeStudents: 0,
      completionRate: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeacherData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch modules created by this teacher
      let myModules = [];
      try {
        const modulesResponse = await fetchWithAuth(
          `${API_BASE_URL}/modules?createdBy=${user.id}`
        );
        myModules = modulesResponse.modules || modulesResponse.data || [];
      } catch (err) {
        console.error('[useTeacherDashboard] Error fetching modules:', err);
        // Mock data
        myModules = [
          {
            id: '1',
            title: 'Fundamentos de Ventilación',
            description: 'Introducción a los conceptos básicos',
            category: 'FUNDAMENTALS',
            difficulty: 'BEGINNER',
            lessonsCount: 8,
            studentsEnrolled: 24,
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            title: 'Técnicas Avanzadas',
            description: 'Métodos avanzados de ventilación mecánica',
            category: 'ADVANCED_TECHNIQUES',
            difficulty: 'ADVANCED',
            lessonsCount: 12,
            studentsEnrolled: 15,
            createdAt: new Date().toISOString(),
          },
        ];
      }

      // Fetch teacher statistics
      let studentStats = {
        totalStudents: 0,
        activeStudents: 0,
        completionRate: 0,
      };

      try {
        const statsResponse = await fetchWithAuth(`${API_BASE_URL}/teachers/${user.id}/stats`);
        if (statsResponse) {
          studentStats = {
            totalStudents: statsResponse.totalStudents || 0,
            activeStudents: statsResponse.activeStudents || 0,
            completionRate: statsResponse.averageCompletion || 0,
          };
        }
      } catch (err) {
        console.error('[useTeacherDashboard] Error fetching stats:', err);
        // Mock data
        studentStats = {
          totalStudents: 45,
          activeStudents: 38,
          completionRate: 72,
        };
      }

      setData({
        myModules,
        studentStats,
      });
    } catch (err) {
      console.error('[useTeacherDashboard] Error:', err);
      setError(err.message || 'Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  return { data, loading, error, refetch: fetchTeacherData };
}

/**
 * Hook for Admin Dashboard
 * Provides system statistics and user management
 *
 * @returns {Object} { data, loading, error, refetch, updateUserRole, deactivateUser }
 * @property {Object} data - Combined admin dashboard data
 * @property {Object} data.systemStats - System-wide statistics
 * @property {Array} data.users - All users in the system
 * @property {Function} updateUserRole - Function to update user role
 * @property {Function} deactivateUser - Function to deactivate user
 *
 * @example
 * const { data, loading, error, refetch, updateUserRole, deactivateUser } = useAdminDashboard();
 */
export function useAdminDashboard() {
  const [data, setData] = useState({
    systemStats: {
      totalUsers: 0,
      totalModules: 0,
      totalLessons: 0,
      activeUsers: 0,
    },
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch system statistics
      let systemStats = {
        totalUsers: 0,
        totalModules: 0,
        totalLessons: 0,
        activeUsers: 0,
      };

      try {
        const statsResponse = await fetchWithAuth(`${API_BASE_URL}/admin/stats`);
        if (statsResponse) {
          systemStats = {
            totalUsers: statsResponse.totalUsers || 0,
            totalModules: statsResponse.totalModules || 0,
            totalLessons: statsResponse.totalLessons || 0,
            activeUsers: statsResponse.activeUsers || 0,
          };
        }
      } catch (err) {
        console.error('[useAdminDashboard] Error fetching system stats:', err);
        // Mock data
        systemStats = {
          totalUsers: 156,
          totalModules: 18,
          totalLessons: 145,
          activeUsers: 89,
        };
      }

      // Fetch all modules to count lessons
      try {
        const modulesResponse = await fetchWithAuth(`${API_BASE_URL}/modules`);
        const modules = modulesResponse.modules || modulesResponse.data || [];
        
        // Count lessons across all modules
        let totalLessons = 0;
        for (const module of modules.slice(0, 10)) {
          // Limit to first 10 modules to avoid too many requests
          try {
            const lessonsResponse = await fetchWithAuth(
              `${API_BASE_URL}/modules/${module.id}/lessons`
            );
            const lessons = lessonsResponse.lessons || lessonsResponse.data || [];
            totalLessons += lessons.length;
          } catch (err) {
            // Silently continue if module doesn't have lessons endpoint
          }
        }
        
        systemStats.totalModules = modules.length;
        systemStats.totalLessons = totalLessons || systemStats.totalLessons;
      } catch (err) {
        console.error('[useAdminDashboard] Error fetching modules:', err);
      }

      // Fetch all users
      let users = [];
      try {
        const usersResponse = await fetchWithAuth(`${API_BASE_URL}/users`);
        users = usersResponse.users || usersResponse.data || [];
        systemStats.totalUsers = users.length || systemStats.totalUsers;
        systemStats.activeUsers = users.filter((u) => u.isActive !== false).length || users.length;
      } catch (err) {
        console.error('[useAdminDashboard] Error fetching users:', err);
        // Mock data
        users = [
          {
            id: '1',
            name: 'Juan Pérez',
            email: 'juan@example.com',
            role: 'STUDENT',
            isActive: true,
            createdAt: '2025-01-15',
          },
          {
            id: '2',
            name: 'María García',
            email: 'maria@example.com',
            role: 'TEACHER',
            isActive: true,
            createdAt: '2025-01-10',
          },
          {
            id: '3',
            name: 'Carlos López',
            email: 'carlos@example.com',
            role: 'STUDENT',
            isActive: true,
            createdAt: '2025-01-20',
          },
        ];
        systemStats.totalUsers = users.length;
        systemStats.activeUsers = users.length;
      }

      setData({
        systemStats,
        users,
      });
    } catch (err) {
      console.error('[useAdminDashboard] Error:', err);
      setError(err.message || 'Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  /**
   * Update user role
   */
  const updateUserRole = useCallback(
    async (userId, newRole) => {
      try {
        await fetchWithAuth(`${API_BASE_URL}/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({ role: newRole }),
        });

        // Refresh data after update
        await fetchAdminData();

        return { success: true };
      } catch (err) {
        console.error('[updateUserRole] Error:', err);
        return { success: false, error: err.message };
      }
    },
    [fetchAdminData]
  );

  /**
   * Deactivate user
   */
  const deactivateUser = useCallback(
    async (userId) => {
      try {
        await fetchWithAuth(`${API_BASE_URL}/users/${userId}`, {
          method: 'DELETE',
        });

        // Refresh data after deactivation
        await fetchAdminData();

        return { success: true };
      } catch (err) {
        console.error('[deactivateUser] Error:', err);
        return { success: false, error: err.message };
      }
    },
    [fetchAdminData]
  );

  return {
    data,
    loading,
    error,
    refetch: fetchAdminData,
    updateUserRole,
    deactivateUser,
  };
}

/**
 * Combined hook for all dashboard data by role
 *
 * @param {string} role - User role (STUDENT, TEACHER, ADMIN)
 * @returns {Object} Dashboard data appropriate for the role
 */
export function useDashboardData(role) {
  const studentProgress = useStudentProgress();
  const recommendations = useRecommendedLessons();
  const studentStats = useStudentStats();
  const teacherModules = useTeacherModules();
  const teacherStats = useTeacherStats();
  const systemStats = useSystemStats();
  const allUsers = useAllUsers();

  if (role === 'STUDENT') {
    return {
      progress: studentProgress.progress,
      recommendations: recommendations.recommendations,
      stats: studentStats.stats,
      loading:
        studentProgress.loading || recommendations.loading || studentStats.loading,
      error: studentProgress.error || recommendations.error || studentStats.error,
      refetch: () => {
        studentProgress.refetch();
        recommendations.refetch();
        studentStats.refetch();
      },
    };
  }

  if (role === 'TEACHER') {
    return {
      modules: teacherModules.modules,
      stats: teacherStats.stats,
      loading: teacherModules.loading || teacherStats.loading,
      error: teacherModules.error || teacherStats.error,
      refetch: () => {
        teacherModules.refetch();
        teacherStats.refetch();
      },
    };
  }

  if (role === 'ADMIN') {
    return {
      stats: systemStats.stats,
      users: allUsers.users,
      loading: systemStats.loading || allUsers.loading,
      error: systemStats.error || allUsers.error,
      updateUser: allUsers.updateUser,
      deleteUser: allUsers.deleteUser,
      refetch: () => {
        systemStats.refetch();
        allUsers.refetch();
      },
    };
  }

  return { loading: false, error: 'Invalid role' };
}
