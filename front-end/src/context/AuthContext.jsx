import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { secureLocal, secureSession } from '../utils/secureStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use sessionStorage so each browser tab holds its own user session.
    // Refreshing the same tab preserves the session; opening a new tab
    // starts fresh, preventing one user's token from leaking into another tab.
    const token = secureSession.getItem('sqms_token');
    if (!token) {
      setLoading(false);
      return;
    }

    apiClient
      .get('/auth/me')
      .then((res) => setAdmin(res.data.admin))
      .catch(() => {
        secureSession.removeItem('sqms_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const persistSession = ({ token, admin: nextAdmin }) => {
    secureSession.setItem('sqms_token', token);
    setAdmin(nextAdmin);
  };

  const logout = () => {
    apiClient.post('/auth/logout').catch(() => {
      // Best effort only. Local logout should still complete.
    }).finally(() => {
      secureSession.removeItem('sqms_token');
      secureLocal.removeItem('sqms_token');
      localStorage.removeItem('sqms_token');
      sessionStorage.removeItem('sqms_token');
      setAdmin(null);
    });
  };

  const value = useMemo(
    () => ({ admin, loading, persistSession, logout }),
    [admin, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
