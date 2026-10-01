import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import authStorage, { AUTH_TOKEN_KEY, USER_DATA_KEY, REMEMBER_ME_KEY } from '@/utils/authStorage';
import { User } from '@/types';
import apiService from '@/services/api';

describe('authStorage - Session Persistence Preference (#125)', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'user@example.com',
    name: 'Test User',
    address: '0x123',
    publicKey: '0xabc',
    isDeployed: true,
    isFunded: true,
    tokenType: 'STRK',
    authProvider: 'email',
    isEmailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores token in localStorage when rememberMe is true', () => {
    authStorage.setToken('local-jwt-token', true);
    authStorage.setUser(mockUser, true);

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('local-jwt-token');
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(authStorage.getToken()).toBe('local-jwt-token');
    expect(localStorage.getItem(REMEMBER_ME_KEY)).toBe('true');
  });

  it('stores token in sessionStorage when rememberMe is false', () => {
    authStorage.setToken('session-jwt-token', false);
    authStorage.setUser(mockUser, false);

    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe('session-jwt-token');
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(authStorage.getToken()).toBe('session-jwt-token');
    expect(localStorage.getItem(REMEMBER_ME_KEY)).toBe('false');
  });

  it('respects stored rememberMe preference during token refresh', () => {
    // User logged in with rememberMe = false
    authStorage.setToken('initial-session-token', false);
    expect(authStorage.isRememberMe()).toBe(false);

    // Refresh token occurs
    apiService.setToken('refreshed-session-token');

    // Token must stay in sessionStorage and not leak to localStorage
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe('refreshed-session-token');
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(apiService.getAccessToken()).toBe('refreshed-session-token');
  });

  it('clears both localStorage and sessionStorage on logout', async () => {
    // Populate both stores simulating mixed state or logout cleanup
    localStorage.setItem(AUTH_TOKEN_KEY, 'old-local-token');
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(mockUser));
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'old-session-token');
    sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(mockUser));

    authStorage.clearAuth();

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_DATA_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(USER_DATA_KEY)).toBeNull();
    expect(authStorage.getToken()).toBeNull();
    expect(authStorage.getUser()).toBeNull();
  });
});
