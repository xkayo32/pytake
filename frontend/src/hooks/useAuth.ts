import { useAuth as useAuthStore } from '../stores/authStore';

/**
 * Custom hook for accessing authentication state and actions
 * This is a re-export of the main auth store hook for convenience
 */
export const useAuth = useAuthStore;

export default useAuth;