import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { secureLocal } from '../utils/secureStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = secureLocal.getItem('sqms_token');
    if (!token) {
      setLoading(false);
      return;
    }

    apiClient
      .get('/auth/me')
      .then((res) => setAdmin(res.data.admin))
      .catch(() => {
        secureLocal.removeItem('sqms_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const persistSession = ({ token, admin: nextAdmin }) => {
    secureLocal.setItem('sqms_token', token);
    setAdmin(nextAdmin);
  };

  const logout = () => {
    secureLocal.removeItem('sqms_token');
    setAdmin(null);
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
