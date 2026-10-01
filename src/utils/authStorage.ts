import { User } from '@/types';

export const AUTH_TOKEN_KEY = 'auth_token';
export const USER_DATA_KEY = 'user_data';
export const REMEMBER_ME_KEY = 'remember_me';

export const authStorage = {
  isRememberMe(): boolean {
    if (typeof window === 'undefined') return true;
    const value = localStorage.getItem(REMEMBER_ME_KEY);
    if (value === 'false') return false;
    return true;
  },

  setRememberMe(remember: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false');
  },

  setToken(token: string, rememberMe?: boolean): void {
    if (typeof window === 'undefined') return;
    const shouldRemember = rememberMe !== undefined ? rememberMe : this.isRememberMe();
    this.setRememberMe(shouldRemember);

    if (shouldRemember) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    } else {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
  },

  setUser(user: User, rememberMe?: boolean): void {
    if (typeof window === 'undefined') return;
    const shouldRemember = rememberMe !== undefined ? rememberMe : this.isRememberMe();
    const userStr = JSON.stringify(user);

    if (shouldRemember) {
      localStorage.setItem(USER_DATA_KEY, userStr);
      sessionStorage.removeItem(USER_DATA_KEY);
    } else {
      sessionStorage.setItem(USER_DATA_KEY, userStr);
      localStorage.removeItem(USER_DATA_KEY);
    }
  },

  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(USER_DATA_KEY) || sessionStorage.getItem(USER_DATA_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as User;
    } catch {
      return null;
    }
  },

  clearAuth(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(USER_DATA_KEY);
  },
};

export default authStorage;
