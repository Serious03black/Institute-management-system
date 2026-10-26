import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';
import type { Admin } from '../types';

interface AuthContextType {
  admin: Admin | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Admin['profile']>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (data.success) {
          setAdmin(data.data);
          if (data.data.accessToken) localStorage.setItem('accessToken', data.data.accessToken);
        }
      } catch {
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (data.data.accessToken) localStorage.setItem('accessToken', data.data.accessToken);
    setAdmin(data.data);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    setAdmin(null);
  };

  const updateProfile = (profileData: Partial<Admin['profile']>) => {
    if (admin) setAdmin({ ...admin, profile: { ...admin.profile, ...profileData } });
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
