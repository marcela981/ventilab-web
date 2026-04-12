/**
 * =============================================================================
 * Groups Service - /api/groups/* endpoints
 * =============================================================================
 * CRUD for groups/subgroups, member management, simulator lead assignment.
 * =============================================================================
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('ventilab_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers || {}),
  };
  try {
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) return { success: false, data: null, error: { message: data.message || 'Error', statusCode: res.status } };
    return { success: true, data, error: null };
  } catch (err) {
    return { success: false, data: null, error: { message: 'Error de conexión', statusCode: 0 } };
  }
}

// ---------------------------------------------------------------------------
// Groups CRUD
// ---------------------------------------------------------------------------

/**
 * List groups with optional filters.
 * @param {Object} [filters]
 * @param {boolean} [filters.myGroups] - Only groups where I'm a TEACHER member
 * @param {string|null} [filters.parentGroupId] - null for root groups only
 * @param {number} [filters.depth]
 * @param {boolean} [filters.isActive]
 */
export async function getGroups(filters = {}) {
  const params = new URLSearchParams();
  if (filters.myGroups) params.append('myGroups', 'true');
  if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
  if (filters.depth !== undefined) params.append('depth', String(filters.depth));
  if (filters.parentGroupId !== undefined) params.append('parentGroupId', filters.parentGroupId === null ? 'null' : filters.parentGroupId);
  const qs = params.toString();
  return request(`/groups${qs ? `?${qs}` : ''}`);
}

/** Get one group with members. */
export async function getGroup(groupId) {
  return request(`/groups/${groupId}`);
}

/**
 * Create a group.
 * @param {Object} data
 * @param {string} data.name
 * @param {string} [data.description]
 * @param {string} [data.parentGroupId]
 * @param {string} [data.semester]
 * @param {string} [data.academicYear]
 * @param {number} [data.maxStudents]
 */
export async function createGroup(data) {
  return request('/groups', { method: 'POST', body: JSON.stringify(data) });
}

/**
 * Update a group.
 * @param {string} groupId
 * @param {Object} data
 */
export async function updateGroup(groupId, data) {
  return request(`/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/** Delete a group (must have no subgroups). */
export async function deleteGroup(groupId) {
  return request(`/groups/${groupId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

/** List members of a group. */
export async function getGroupMembers(groupId) {
  return request(`/groups/${groupId}/members`);
}

/**
 * Add a member to a group.
 * @param {string} groupId
 * @param {string} userId
 * @param {'STUDENT'|'TEACHER'} role
 */
export async function addMember(groupId, userId, role = 'STUDENT') {
  return request(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId, role }),
  });
}

/**
 * Remove a member from a group.
 * @param {string} groupId
 * @param {string} userId
 */
export async function removeMember(groupId, userId) {
  return request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Simulator lead
// ---------------------------------------------------------------------------

/**
 * Set or clear the simulator lead for a group.
 * @param {string} groupId
 * @param {string|null} userId - null to clear
 */
export async function setSimulatorLead(groupId, userId) {
  return request(`/groups/${groupId}/lead`, {
    method: 'PATCH',
    body: JSON.stringify({ userId }),
  });
}

const groupsService = {
  getGroups, getGroup, createGroup, updateGroup, deleteGroup,
  getGroupMembers, addMember, removeMember, setSimulatorLead,
};
export default groupsService;
