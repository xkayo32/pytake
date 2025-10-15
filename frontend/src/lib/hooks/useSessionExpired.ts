'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

/**
 * Hook to detect session expiration based on 401 errors
 * Shows modal after multiple consecutive 401 errors
 */
export function useSessionExpired() {
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const unauthorizedCount = useRef(0);
  const resetTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Intercept response errors
    const interceptor = api.interceptors.response.use(
      (response) => {
        // Reset counter on successful response
        unauthorizedCount.current = 0;
        if (resetTimer.current) {
          clearTimeout(resetTimer.current);
        }
        return response;
      },
      (error) => {
        // Check if it's a 401 error
        if (error.response?.status === 401) {
          // Ignore 401 on auth endpoints (login, register)
          const isAuthEndpoint =
            error.config?.url?.includes('/auth/login') ||
            error.config?.url?.includes('/auth/register') ||
            error.config?.url?.includes('/auth/refresh');

          if (!isAuthEndpoint) {
            unauthorizedCount.current += 1;

            // Show modal after 2+ consecutive 401 errors
            // This helps avoid false positives from a single failed request
            if (unauthorizedCount.current >= 2) {
              setShowExpiredModal(true);
            }

            // Reset counter after 5 seconds of no errors
            if (resetTimer.current) {
              clearTimeout(resetTimer.current);
            }
            resetTimer.current = setTimeout(() => {
              unauthorizedCount.current = 0;
            }, 5000);
          }
        } else {
          // Non-401 error, reset counter
          unauthorizedCount.current = 0;
        }

        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      api.interceptors.response.eject(interceptor);
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const hideModal = () => {
    setShowExpiredModal(false);
    unauthorizedCount.current = 0;
  };

  return {
    showExpiredModal,
    hideModal,
  };
}
