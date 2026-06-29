import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { User } from '../types';
import {
  setAuthToken,
  removeAuthToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
} from './useAuthStorage';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = getStoredUser();
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (username: string, password: string, rememberMe: boolean = true) => {
    const res = await api.post<{ token: string }>('/api/auth/login', { username, password });
    setAuthToken(res.token, rememberMe);
    // Fetch user info
    const u = await api.get<User>('/api/auth/me');
    setStoredUser(JSON.stringify(u), rememberMe);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    removeAuthToken();
    removeStoredUser();
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    // Persist to whichever storage currently holds the user
    const serialized = JSON.stringify(updatedUser);
    if (localStorage.getItem('user') !== null) {
      localStorage.setItem('user', serialized);
    } else {
      sessionStorage.setItem('user', serialized);
    }
    setUser(updatedUser);
  }, []);

  return { user, login, logout, updateUser, isLoggedIn: !!user };
}
