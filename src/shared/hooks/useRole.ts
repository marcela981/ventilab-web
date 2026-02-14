/**
 * useRole - Role-based access control hook
 * TODO: Implement with auth context integration
 */

export function useRole() {
  // TODO: Implement - get role from auth context
  return {
    role: 'STUDENT' as string,
    isStudent: () => true,
    isTeacher: () => false,
    isAdmin: () => false,
    hasRole: (role: string) => false,
  };
}

export default useRole;
