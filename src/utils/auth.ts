/**
 * Guard function to validate redirect targets against open redirect vulnerabilities.
 * Returns internal relative paths intact, or falls back to `/dashboard` for
 * absolute, cross-domain, or malformed URLs.
 */
export function getSafeRedirectUrl(target: string | null | undefined, fallback = '/dashboard'): string {
  if (!target || typeof target !== 'string') return fallback;
  const trimmed = target.trim();

  if (!trimmed) return fallback;

  // Must start with '/' but NOT '//' or '/\' or '/%5C'
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('/%5C') ||
    trimmed.startsWith('/%5c')
  ) {
    return fallback;
  }

  // Reject schemes like http:, https:, javascript:, data:
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, 'http://localhost');

    if (parsed.origin !== 'http://localhost') {
      return fallback;
    }

    if (!parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) {
      return fallback;
    }

    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
