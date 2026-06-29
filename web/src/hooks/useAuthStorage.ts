/**
 * Auth storage helpers for "Remember me" behavior.
 *
 * checked (rememberMe=true)  → localStorage (persists across sessions)
 * unchecked (rememberMe=false) → sessionStorage (cleared on tab close)
 */

export function getAuthStorage(rememberMe: boolean): Storage {
  return rememberMe ? localStorage : sessionStorage;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function setAuthToken(token: string, rememberMe: boolean): void {
  const storage = getAuthStorage(rememberMe);
  storage.setItem('token', token);
  // Clear from the other storage to avoid stale duplicates
  const otherStorage = rememberMe ? sessionStorage : localStorage;
  otherStorage.removeItem('token');
}

export function removeAuthToken(): void {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
}

export function getStoredUser(): string | null {
  return localStorage.getItem('user') || sessionStorage.getItem('user');
}

export function setStoredUser(user: string, rememberMe: boolean): void {
  const storage = getAuthStorage(rememberMe);
  storage.setItem('user', user);
  const otherStorage = rememberMe ? sessionStorage : localStorage;
  otherStorage.removeItem('user');
}

export function removeStoredUser(): void {
  localStorage.removeItem('user');
  sessionStorage.removeItem('user');
}
