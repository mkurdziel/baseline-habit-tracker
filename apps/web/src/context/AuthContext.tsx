import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, AuthResponse } from '@habit-tracker/shared';
import { authApi, setTokens, getTokens, clearTokens } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { accessToken } = getTokens();
      if (accessToken) {
        const response = await authApi.me();
        if (response.success && response.data) {
          setUser(response.data as User);
        } else {
          clearTokens();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    if (response.success && response.data) {
      const data = response.data as AuthResponse;
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return { success: true };
    }
    return { success: false, error: response.error || 'Login failed' };
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authApi.register(email, password, name);
    if (response.success && response.data) {
      const data = response.data as AuthResponse;
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return { success: true };
    }
    return { success: false, error: response.error || 'Registration failed' };
  };

  const logout = async () => {
    await authApi.logout();
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
