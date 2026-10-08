'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setAccessToken, getAccessToken, ApiError } from './api';
import { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      if (!getAccessToken()) {
        setUser(null);
        return;
      }
      const me = await api.get<User>('/auth/me');
      setUser(me);
    } catch (e) {
      if (e instanceof ApiError) setAccessToken(null);
      setUser(null);
    }
  }

  useEffect(() => {
    loadMe().finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: User }>('/auth/login', { email, password });
    setAccessToken(res.accessToken);
    setUser(res.user);
  }

  async function register(email: string, password: string, displayName: string) {
    const res = await api.post<{ accessToken: string; user: User }>('/auth/register', {
      email,
      password,
      displayName,
    });
    setAccessToken(res.accessToken);
    setUser(res.user);
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
