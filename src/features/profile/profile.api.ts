/**
 * Profile API Service
 * TODO: Implement in Phase 5
 */
import { http } from '@/services/api/http';

export const profileApi = {
  getProfile: async () => {
    const response = await http.get('/profile');
    return response.data;
  },
  updateProfile: async (data: any) => {
    const response = await http.put('/profile', data);
    return response.data;
  },
  changePassword: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    const response = await http.post('/profile/change-password', data);
    return response.data;
  },
};
