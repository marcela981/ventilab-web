/*
 * Funcionalidad: Admin Service — endpoints /api/admin/*
 * Descripción: Métodos para los dashboards de profesor/admin (/panel). Usa el
 *              httpClient centralizado; token y baseURL los inyecta la capa HTTP.
 *              El backend responde con envelope { success, data }; httpClient
 *              devuelve ese body completo, por lo que getPlatformStatistics y
 *              getStudents DESEMPAQUETAN un nivel para que el caller reciba el
 *              payload de dominio directo en `res.data` (sin doble-envelope).
 * Versión: 1.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { httpClient } from '@/shared/services/httpClient';

/**
 * Normalize httpClient response to service envelope format.
 * httpClient throws on non-2xx, so we wrap in try/catch.
 */
async function request(endpoint, options = {}) {
  try {
    const { method = 'GET', body } = options;
    let data;

    switch (method) {
      case 'POST':
        data = await httpClient.post(endpoint, body ? JSON.parse(body) : undefined);
        break;
      case 'PUT':
        data = await httpClient.put(endpoint, body ? JSON.parse(body) : undefined);
        break;
      case 'PATCH':
        data = await httpClient.patch(endpoint, body ? JSON.parse(body) : undefined);
        break;
      case 'DELETE':
        data = await httpClient.delete(endpoint);
        break;
      default:
        data = await httpClient.get(endpoint);
    }

    return { success: true, data, error: null };
  } catch (err) {
    const status = err?.response?.status || 0;
    const message = err?.response?.data?.message || err?.message || 'Error en la solicitud';
    return {
      success: false,
      data: null,
      error: { message, statusCode: status },
    };
  }
}

// =============================================================================
// Users
// =============================================================================

export async function getUsers() {
  return request('/admin/users');
}

export async function getUserById(userId) {
  return request(`/admin/users/${userId}`);
}

export async function updateUser(userId, updates) {
  return request(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteUser(userId) {
  return request(`/admin/users/${userId}`, { method: 'DELETE' });
}

// =============================================================================
// Roles
// =============================================================================

export async function updateUserRole(userId, role) {
  return request(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

// =============================================================================
// Statistics
// =============================================================================

export async function getAdminStats() {
  return request('/admin/stats');
}

/**
 * Estadísticas de plataforma para el panel (TEACHER+).
 * Backend: GET /api/admin/statistics → { success, data: stats }.
 * Desempaqueta un nivel: el caller recibe el objeto stats directo en res.data.
 */
export async function getPlatformStatistics() {
  const res = await request('/admin/statistics');
  if (!res.success) return res;
  return { ...res, data: res.data?.data ?? res.data };
}

/**
 * Lista de estudiantes paginada para el panel (TEACHER+).
 * Backend: GET /api/admin/students → { success, data: { students, pagination } }.
 * Desempaqueta un nivel y aplana `total` desde pagination para el caller.
 *
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {string} [options.sortBy='name']   - 'name'|'email'|'lastActivity'|'progress'
 * @param {string} [options.sortOrder='asc'] - 'asc'|'desc'
 * @param {string} [options.search]
 * @param {boolean} [options.myGroups]       - filtra por los grupos del profesor
 * @param {string} [options.groupId]
 */
export async function getStudents(options = {}) {
  const {
    page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc',
    search, myGroups, groupId,
  } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });
  if (search) params.append('search', search);
  if (myGroups) params.append('myGroups', 'true');
  if (groupId) params.append('groupId', groupId);

  const res = await request(`/admin/students?${params.toString()}`);
  if (!res.success) return res;

  const payload = res.data?.data ?? res.data ?? {};
  return {
    ...res,
    data: {
      students: payload.students ?? [],
      pagination: payload.pagination ?? null,
      total: payload.pagination?.total ?? 0,
      page: payload.pagination?.page ?? page,
      totalPages: payload.pagination?.totalPages ?? 0,
    },
  };
}

const adminService = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserRole,
  getAdminStats,
  getPlatformStatistics,
  getStudents,
};

export default adminService;
