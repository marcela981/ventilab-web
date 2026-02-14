/**
 * Profile Types
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  image?: string | null;
  createdAt: string;
}
