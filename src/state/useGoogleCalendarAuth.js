import { useCallback, useState } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';

const STORAGE_KEY = 'brink:gcal_token:v1';

function loadStoredToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Access tokens expire (~1hr); drop anything stale rather than trying to use it and failing later.
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Provides Google Calendar sign-in using the browser-only OAuth flow (no client
 * secret needed). Returns an access token good for ~1hr, scoped to calendar.events,
 * which calendar.js attaches to its REST calls.
 */
export function useGoogleCalendarAuth() {
  const [token, setToken] = useState(loadStoredToken);
  const [error, setError] = useState('');

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.events',
    onSuccess: (res) => {
      const record = {
        accessToken: res.access_token,
        expiresAt: Date.now() + (res.expires_in ? res.expires_in * 1000 : 55 * 60 * 1000),
      };
      setToken(record);
      setError('');
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      } catch {
        // non-fatal — token still works for this session
      }
    },
    onError: () => setError('Could not connect to Google Calendar. Please try again.'),
  });

  const logout = useCallback(() => {
    googleLogout();
    setToken(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    isConnected: !!token,
    accessToken: token?.accessToken || null,
    error,
    connect: login,
    disconnect: logout,
  };
}
