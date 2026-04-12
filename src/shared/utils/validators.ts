/**
 * Validators - Shared validation utilities
 */

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
};

export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};
