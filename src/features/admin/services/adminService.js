/**
 * =============================================================================
 * Admin Service - /api/admin/* endpoints
 * =============================================================================
 * Uses the centralized httpClient for all requests.
 * Token and base URL are handled automatically by the HTTP layer.
 * =============================================================================
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

const adminService = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserRole,
  getAdminStats,
};

export default adminService;
