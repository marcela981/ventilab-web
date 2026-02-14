/**
 * Auth API Service
 * Handles authentication API calls
 */
import { http } from '@/services/api/http';

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await http.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: { email: string; password: string; name?: string }) => {
    const response = await http.post('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const response = await http.post('/auth/logout');
    return response.data;
  },

  getNextAuthToken: async (userId: string, email: string) => {
    const response = await http.post('/auth/nextauth-token', { userId, email });
    return response.data;
  },
};
