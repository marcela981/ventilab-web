import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getAuthToken, setAuthToken } from '@/shared/services/authService';

/**
 * Custom hook to manage authentication token fetching and waiting
 */
export const useTokenManager = () => {
  const { data: session, status: sessionStatus } = useSession();
  const tokenFetchRef = useRef(false);
  const tokenReadyRef = useRef(false);
  const tokenPromiseRef = useRef(null);

  // Helper function to wait for token to be available
  const waitForToken = useCallback(async (maxWaitTime = 5000) => {
    // If token is already available, return immediately
    if (getAuthToken()) {
      tokenReadyRef.current = true;
      return true;
    }

    // If no session, don't wait
    if (!session?.user) {
      return false;
    }

    // If we already have a promise waiting, return it
    if (tokenPromiseRef.current) {
      try {
        return await tokenPromiseRef.current;
      } catch (error) {
        // If the promise was rejected, create a new one
        tokenPromiseRef.current = null;
      }
    }

    // Create a new promise that resolves when token is available
    const tokenPromise = new Promise((resolve, reject) => {
      const startTime = Date.now();
      let timeoutId = null;
      let intervalId = null;
      
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
      };
      
      const checkToken = () => {
        if (getAuthToken()) {
          cleanup();
          tokenReadyRef.current = true;
          tokenPromiseRef.current = null;
          resolve(true);
          return;
        }

        if (Date.now() - startTime > maxWaitTime) {
          cleanup();
          tokenPromiseRef.current = null;
          reject(new Error('Token fetch timeout'));
          return;
        }
      };

      // Set timeout
      timeoutId = setTimeout(() => {
        cleanup();
        tokenPromiseRef.current = null;
        reject(new Error('Token fetch timeout'));
      }, maxWaitTime);

      // Check periodically
      intervalId = setInterval(checkToken, 100);
    });

    tokenPromiseRef.current = tokenPromise;
    return tokenPromise;
  }, [session]);

  // Fetch backend token from NextAuth session
  useEffect(() => {
    if (sessionStatus === 'loading') {
      return;
    }
    
    // Check if token is already available
    if (getAuthToken()) {
      tokenReadyRef.current = true;
      // Clear any waiting promise
      if (tokenPromiseRef.current) {
        tokenPromiseRef.current = null;
      }
      return;
    }
    
    // If we have a session but no backend token, fetch it
    if (session?.user && !getAuthToken()) {
      if (tokenFetchRef.current) {
        return; // Already fetching
      }
      
      tokenFetchRef.current = true;
      tokenReadyRef.current = false;
      
      (async () => {
        try {
          const response = await fetch('/api/auth/backend-token', {
            cache: 'no-store',
            headers: {
              'cache-control': 'no-cache',
            },
          });
          
          // Manejar 304 sin intentar parsear JSON vacío
          if (response.status === 304) {
            tokenFetchRef.current = false;
            tokenPromiseRef.current = null;
            return;
          }
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.token) {
              setAuthToken(data.token);
              if (data.user) {
                // Also store user data if provided
                if (typeof window !== 'undefined') {
                  localStorage.setItem('ventilab_user_data', JSON.stringify(data.user));
                }
              }
              console.log('[useTokenManager] Backend token fetched and stored');
              tokenReadyRef.current = true;
              
              // Clear waiting promise (will be resolved by waitForToken checking)
              tokenPromiseRef.current = null;
              
              // Reset fetch flag after a delay to allow retry if needed
              setTimeout(() => {
                tokenFetchRef.current = false;
              }, 5000);
            } else {
              tokenFetchRef.current = false;
              tokenPromiseRef.current = null;
            }
          } else {
            console.warn('[useTokenManager] Failed to fetch backend token:', response.status);
            tokenFetchRef.current = false;
            tokenPromiseRef.current = null;
          }
        } catch (error) {
          console.error('[useTokenManager] Error fetching backend token:', error);
          tokenFetchRef.current = false;
          tokenPromiseRef.current = null;
        }
      })();
    } else if (!session?.user) {
      // Clear token if session is lost
      tokenFetchRef.current = false;
      tokenReadyRef.current = false;
      tokenPromiseRef.current = null;
    }
  }, [session, sessionStatus]);

  const resetTokenFetch = useCallback(() => {
    tokenFetchRef.current = false;
    tokenReadyRef.current = false;
    tokenPromiseRef.current = null;
  }, []);

  return {
    waitForToken,
    resetTokenFetch,
    session,
    isTokenReady: tokenReadyRef.current,
  };
};

