import { describe, it, expect } from 'vitest';
import { getSafeRedirectUrl } from '@/utils/auth';

describe('getSafeRedirectUrl - Safe Redirect Guard (#126)', () => {
  it('honours stored path only when it is a valid internal route', () => {
    expect(getSafeRedirectUrl('/transactions')).toBe('/transactions');
    expect(getSafeRedirectUrl('/chat?id=123#bottom')).toBe('/chat?id=123#bottom');
    expect(getSafeRedirectUrl('/settings')).toBe('/settings');
  });

  it('rejects absolute URLs and falls back to /dashboard', () => {
    expect(getSafeRedirectUrl('https://evil.com')).toBe('/dashboard');
    expect(getSafeRedirectUrl('http://attacker.com/transactions')).toBe('/dashboard');
    expect(getSafeRedirectUrl('//external-domain.com')).toBe('/dashboard');
    expect(getSafeRedirectUrl('//google.com/login')).toBe('/dashboard');
  });

  it('rejects malformed or javascript URLs and falls back to /dashboard', () => {
    expect(getSafeRedirectUrl('javascript:alert(1)')).toBe('/dashboard');
    expect(getSafeRedirectUrl('/\\evil.com')).toBe('/dashboard');
    expect(getSafeRedirectUrl('/%5Cevil.com')).toBe('/dashboard');
    expect(getSafeRedirectUrl('')).toBe('/dashboard');
    expect(getSafeRedirectUrl(null)).toBe('/dashboard');
    expect(getSafeRedirectUrl(undefined)).toBe('/dashboard');
  });

  it('allows custom fallback path when provided', () => {
    expect(getSafeRedirectUrl('https://evil.com', '/home')).toBe('/home');
  });
});
