import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ token: string }>('/api/auth/login', { username, password });
    localStorage.setItem('token', res.token);
    // Fetch user info
    const u = await api.get<User>('/api/auth/me');
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return { user, login, logout, isLoggedIn: !!user };
}
