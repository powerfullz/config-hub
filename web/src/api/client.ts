import type { Profile, SubscriptionGroup } from '../types';

const BASE = '';

export interface ApiError {
  error: string;
  code: number;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ error: res.statusText, code: res.status }));
      throw new Error(err.error || 'Request failed');
    }

    return res.json();
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async getText(path: string): Promise<string> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { headers });
    if (!res.ok) throw new Error('Request failed');
    return res.text();
  }

  // ── Token (Share Link) Management ──────────────────────────────────

  listTokens(profileId: number) {
    return this.get<import('../types').Token[]>(`/api/profiles/${profileId}/tokens`);
  }

  createToken(profileId: number, name: string) {
    return this.post<import('../types').TokenCreateResponse>(
      `/api/profiles/${profileId}/tokens`,
      { name },
    );
  }

  async revokeToken(profileId: number, tokenId: number): Promise<void> {
    await this.delete(`/api/profiles/${profileId}/tokens/${tokenId}`);
  }

  // ── Profile CRUD ──────────────────────────────────────────────────

  createProfile(data: Record<string, unknown>) {
    return this.post<Profile>('/api/profiles', data);
  }

  updateProfile(id: number, data: Record<string, unknown>) {
    return this.put<Profile>(`/api/profiles/${id}`, data);
  }

  deleteProfile(id: number) {
    return this.delete<{ message: string }>(`/api/profiles/${id}`);
  }

  // ── Subscription Group CRUD ──────────────────────────────────────

  listSubscriptionGroups() {
    return this.get<SubscriptionGroup[]>('/api/subscription-groups');
  }

  createSubscriptionGroup(name: string) {
    return this.post<SubscriptionGroup>('/api/subscription-groups', { name });
  }

  getSubscriptionGroup(id: number) {
    return this.get<SubscriptionGroup>(`/api/subscription-groups/${id}`);
  }

  updateSubscriptionGroup(id: number, name: string) {
    return this.put<SubscriptionGroup>(`/api/subscription-groups/${id}`, { name });
  }

  async deleteSubscriptionGroup(id: number): Promise<void> {
    await this.delete(`/api/subscription-groups/${id}`);
  }

  addSubToGroup(groupId: number, subId: number) {
    return this.post(`/api/subscription-groups/${groupId}/subscriptions/${subId}`);
  }

  removeSubFromGroup(groupId: number, subId: number) {
    return this.delete(`/api/subscription-groups/${groupId}/subscriptions/${subId}`);
  }
}

export const api = new ApiClient();
